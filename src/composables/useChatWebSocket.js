import { computed, readonly, ref } from 'vue';
import { BASE_URL, refreshAccessToken } from '../api/request';

const CHAT_WS_PATH = '/api/chat/websocket';
const HEARTBEAT_INTERVAL_MS = 50 * 1000;
const MAX_RECONNECT_DELAY_MS = 30 * 1000;
const MAX_MESSAGE_COUNT = 100;

const connectionStatus = ref('idle');
const messageList = ref([]);
const lastMessage = ref(null);
const lastRefreshSignal = ref(null);

let socket = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let manualClose = false;
let connectPromise = null;

const reportReminders = computed(() => (
	messageList.value
		.filter((item) => item?.Type === 'report_submit_reminder')
		.slice()
		.sort((a, b) => getMessageTime(b) - getMessageTime(a))
));

const unreadReportReminders = computed(() => reportReminders.value.filter((item) => !item?.IsRead));
const latestReportReminder = computed(() => reportReminders.value[0] || null);
const isChatSocketConnected = computed(() => connectionStatus.value === 'connected');

function getMessageTime(message) {
	const parsed = Date.parse(message?.CreateTime || '');
	return Number.isFinite(parsed) ? parsed : Number(message?.__receivedAt || 0);
}

function buildMessageKey(message = {}) {
	return String(
		message.Id
		|| [
			message.Type,
			message.BizId,
			message.ReceiverId,
			message.SenderId,
			message.CreateTime,
			message.Message,
		].filter(Boolean).join(':')
		|| `message-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
	);
}

function normalizeIncomingMessage(payload) {
	const base = payload && typeof payload === 'object'
		? { ...payload }
		: { Type: 'Message', Message: String(payload ?? '') };

	base.Id = base.Id || '';
	base.Type = base.Type || '';
	base.SenderId = base.SenderId || '';
	base.SenderName = base.SenderName || '';
	base.SenderRealName = base.SenderRealName || '';
	base.ReceiverId = base.ReceiverId || null;
	base.Message = base.Message || '';
	base.CreateTime = base.CreateTime || '';
	base.BizType = base.BizType || '';
	base.BizId = base.BizId || '';
	base.IsRead = Boolean(base.IsRead);
	base.ReadFromUserId = base.ReadFromUserId || null;
	base.ReadMsgIds = Array.isArray(base.ReadMsgIds) ? base.ReadMsgIds : null;
	base.__receivedAt = Date.now();
	base.__key = buildMessageKey(base);
	return base;
}

function upsertMessage(message) {
	const nextMessage = normalizeIncomingMessage(message);
	const nextList = messageList.value.slice();
	const existingIndex = nextList.findIndex((item) => item.__key === nextMessage.__key);

	if (existingIndex >= 0) {
		nextList.splice(existingIndex, 1);
	}

	nextList.unshift(nextMessage);
	messageList.value = nextList.slice(0, MAX_MESSAGE_COUNT);
	lastMessage.value = nextMessage;
	lastRefreshSignal.value = {
		eventId: nextMessage.Id || nextMessage.__key,
		type: nextMessage.Type,
		occurredAt: nextMessage.CreateTime || new Date().toISOString(),
	};
	return nextMessage;
}

function patchMessage(messageKey, patch = {}) {
	if (!messageKey) return;
	const index = messageList.value.findIndex((item) => item.__key === messageKey);
	if (index < 0) return;

	const nextList = messageList.value.slice();
	const nextMessage = {
		...nextList[index],
		...patch,
	};
	nextList.splice(index, 1, nextMessage);
	messageList.value = nextList;
	if (lastMessage.value?.__key === messageKey) {
		lastMessage.value = nextMessage;
	}
}

export function removeChatMessage(messageKey) {
	if (!messageKey) return;
	const nextList = messageList.value.filter((item) => item.__key !== messageKey);
	messageList.value = nextList;
	if (lastMessage.value?.__key === messageKey) {
		lastMessage.value = nextList[0] || null;
	}
}

export function clearChatMessages() {
	messageList.value = [];
	lastMessage.value = null;
	lastRefreshSignal.value = null;
}

function markMessagesReadLocally(messageIds = []) {
	if (!Array.isArray(messageIds) || !messageIds.length) return;
	const idSet = new Set(messageIds.map((item) => String(item || '')).filter(Boolean));
	if (!idSet.size) return;

	messageList.value = messageList.value.map((item) => (
		idSet.has(String(item.Id || ''))
			? {
				...item,
				IsRead: true,
				ReadMsgIds: [String(item.Id)],
			}
			: item
	));
}

function clearHeartbeatTimer() {
	if (!heartbeatTimer) return;
	window.clearInterval(heartbeatTimer);
	heartbeatTimer = null;
}

function clearReconnectTimer() {
	if (!reconnectTimer) return;
	window.clearTimeout(reconnectTimer);
	reconnectTimer = null;
}

function hasAuthSession() {
	try {
		return Boolean(localStorage.getItem('refreshToken') || localStorage.getItem('accessToken'));
	} catch {
		return false;
	}
}

async function getSocketToken() {
	const accessToken = localStorage.getItem('accessToken');
	const refreshToken = localStorage.getItem('refreshToken');
	const expiresInRaw = localStorage.getItem('expiresIn');
	const expiresIn = Number(expiresInRaw);
	const now = Math.floor(Date.now() / 1000);
	const needsRefresh = Boolean(
		refreshToken
		&& (
			!accessToken
			|| !expiresInRaw
			|| Number.isNaN(expiresIn)
			|| now >= expiresIn - 30
		)
	);

	if (needsRefresh) {
		return await refreshAccessToken();
	}

	return accessToken || '';
}

function buildSocketUrl(token) {
	const url = new URL(CHAT_WS_PATH, BASE_URL);
	url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
	url.searchParams.set('token', token);
	return url.toString();
}

function sendRawMessage(payload) {
	if (!socket || socket.readyState !== window.WebSocket.OPEN) {
		throw new Error('WebSocket is not connected');
	}
	socket.send(JSON.stringify(payload));
}

function sendPing() {
	if (!socket || socket.readyState !== window.WebSocket.OPEN) return;
	sendRawMessage({ Type: 'Ping' });
}

function startHeartbeat() {
	clearHeartbeatTimer();
	heartbeatTimer = window.setInterval(() => {
		sendPing();
	}, HEARTBEAT_INTERVAL_MS);
}

function resolveReconnectDelay() {
	const delay = Math.min(1000 * (2 ** reconnectAttempt), MAX_RECONNECT_DELAY_MS);
	const jitter = Math.floor(Math.random() * 500);
	return delay + jitter;
}

function scheduleReconnect() {
	if (manualClose || reconnectTimer || !hasAuthSession()) return;

	connectionStatus.value = 'reconnecting';
	const delay = resolveReconnectDelay();
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = null;
		connectChatSocket().catch(() => {});
	}, delay);
	reconnectAttempt += 1;
}

function handleSocketClose(currentSocket) {
	if (socket !== currentSocket) return;
	socket = null;
	clearHeartbeatTimer();
	if (manualClose) {
		connectionStatus.value = 'idle';
		return;
	}
	connectionStatus.value = 'disconnected';
	scheduleReconnect();
}

function handleSocketMessage(event) {
	let payload = event?.data;
	if (typeof payload === 'string') {
		try {
			payload = JSON.parse(payload);
		} catch {
			return;
		}
	}

	if (!payload || typeof payload !== 'object') return;
	const nextMessage = upsertMessage(payload);
	if (nextMessage.Type === 'Pong') return;
}

export async function connectChatSocket() {
	if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') return null;
	if (socket && (socket.readyState === window.WebSocket.OPEN || socket.readyState === window.WebSocket.CONNECTING)) {
		return socket;
	}
	if (connectPromise) {
		return connectPromise;
	}

	connectPromise = (async () => {
		manualClose = false;
		clearReconnectTimer();
		connectionStatus.value = reconnectAttempt > 0 ? 'reconnecting' : 'connecting';

		const token = await getSocketToken();
		if (!token) {
			connectionStatus.value = 'idle';
			return null;
		}

		const nextSocket = new window.WebSocket(buildSocketUrl(token));
		socket = nextSocket;

		await new Promise((resolve, reject) => {
			let didOpen = false;
			nextSocket.onopen = () => {
				didOpen = true;
				reconnectAttempt = 0;
				connectionStatus.value = 'connected';
				startHeartbeat();
				sendPing();
				resolve();
			};
			nextSocket.onmessage = (messageEvent) => {
				handleSocketMessage(messageEvent);
			};
			nextSocket.onerror = () => {
				if (connectionStatus.value !== 'connected') {
					connectionStatus.value = 'error';
				}
			};
			nextSocket.onclose = () => {
				if (!didOpen) {
					reject(new Error('WebSocket closed before opening'));
				}
				handleSocketClose(nextSocket);
			};
			nextSocket.addEventListener('error', () => {
				if (nextSocket.readyState !== window.WebSocket.OPEN) {
					reject(new Error('WebSocket failed to connect'));
				}
			}, { once: true });
		});

		return nextSocket;
	})();

	try {
		return await connectPromise;
	} finally {
		connectPromise = null;
	}
}

export function disconnectChatSocket(options = {}) {
	const { clearMessages = false } = options;
	manualClose = true;
	clearReconnectTimer();
	clearHeartbeatTimer();
	reconnectAttempt = 0;
	connectionStatus.value = 'idle';

	if (socket) {
		const currentSocket = socket;
		socket = null;
		currentSocket.close();
	}

	if (clearMessages) {
		messageList.value = [];
		lastMessage.value = null;
		lastRefreshSignal.value = null;
	}
}

export async function markChatMessagesRead(options = {}) {
	const payload = {
		Type: 'Read',
		ReadFromUserId: options.readFromUserId || '',
	};

	if (Array.isArray(options.readMsgIds) && options.readMsgIds.length) {
		payload.ReadMsgIds = options.readMsgIds;
	}
	if (options.bizType) {
		payload.BizType = options.bizType;
	}
	if (options.bizId) {
		payload.BizId = options.bizId;
	}

	if (!socket || socket.readyState !== window.WebSocket.OPEN) {
		await connectChatSocket();
	}

	sendRawMessage(payload);
	markMessagesReadLocally(payload.ReadMsgIds || []);
}

export async function markReportReminderRead(reminder) {
	if (!reminder) return;
	await markChatMessagesRead({
		readFromUserId: reminder.SenderId || reminder.ReadFromUserId || '',
		readMsgIds: reminder.Id ? [String(reminder.Id)] : undefined,
		bizType: reminder.BizType || '',
		bizId: reminder.BizId || '',
	});
	patchMessage(reminder.__key, {
		IsRead: true,
		ReadFromUserId: reminder.SenderId || reminder.ReadFromUserId || '',
		ReadMsgIds: reminder.Id ? [String(reminder.Id)] : reminder.ReadMsgIds || null,
	});
}

export async function sendChatMessage(payload = {}) {
	if (!payload.Message && !payload.message) {
		throw new Error('Message is required');
	}
	if (!socket || socket.readyState !== window.WebSocket.OPEN) {
		await connectChatSocket();
	}

	sendRawMessage({
		Type: 'Message',
		ReceiverId: payload.ReceiverId ?? payload.receiverId ?? null,
		Message: payload.Message ?? payload.message ?? '',
	});
}

export function useChatWebSocket() {
	return {
		connectionStatus: readonly(connectionStatus),
		isChatSocketConnected: readonly(isChatSocketConnected),
		messageList: readonly(messageList),
		lastMessage: readonly(lastMessage),
		lastRefreshSignal: readonly(lastRefreshSignal),
		reportReminders: readonly(reportReminders),
		unreadReportReminders: readonly(unreadReportReminders),
		latestReportReminder: readonly(latestReportReminder),
		connectChatSocket,
		disconnectChatSocket,
		sendChatMessage,
		markChatMessagesRead,
		markReportReminderRead,
		removeChatMessage,
		clearChatMessages,
	};
}
