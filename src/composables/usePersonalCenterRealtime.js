import { computed, readonly, ref } from 'vue';
import { BASE_URL } from '../api/request';
import { getRealtimeToken, markNotificationRead } from '../api/personalCenter';

const PERSONAL_CENTER_WS_PATH = '/ws/PersonalCenter';
const LAST_EVENT_ID_STORAGE_KEY = 'szkj:personal-center:last-event-id';
const MAX_EVENT_COUNT = 50;
const MAX_NOTIFICATION_COUNT = 50;
const MAX_RECENT_EVENT_IDS = 300;
const MAX_RECONNECT_DELAY_MS = 30 * 1000;

const connectionStatus = ref('idle');
const envelopeList = ref([]);
const notificationList = ref([]);
const lastEnvelope = ref(null);
const lastRefreshSignal = ref(null);
const unreadNotificationCount = ref(0);

let socket = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let manualClose = false;
let connectPromise = null;
const recentEventIds = [];

const reportReminders = computed(() => (
	notificationList.value
		.filter((item) => item.type === 'report_submit_reminder')
		.slice()
		.sort((a, b) => getNotificationTime(b) - getNotificationTime(a))
));

const unreadReportReminders = computed(() => reportReminders.value.filter((item) => !item.isRead));
const latestReportReminder = computed(() => reportReminders.value[0] || null);
const isPersonalCenterRealtimeConnected = computed(() => connectionStatus.value === 'connected');

function safeString(value, fallback = '') {
	if (value === null || value === undefined) return fallback;
	return String(value);
}

function pickValue(source, keys, fallback = undefined) {
	for (const key of keys) {
		if (source && source[key] !== undefined && source[key] !== null) {
			return source[key];
		}
	}
	return fallback;
}

function normalizeBoolean(value) {
	if (value === true || value === false) return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return false;
}

function getNotificationTime(notification) {
	const parsed = Date.parse(notification?.createdAt || '');
	return Number.isFinite(parsed) ? parsed : Number(notification?.__receivedAt || 0);
}

function buildNotificationKey(notification = {}) {
	return safeString(
		notification.id
		|| notification.notificationId
		|| [
			notification.type,
			notification.bizId,
			notification.bizDataId,
			notification.createdAt,
			notification.content,
		].filter(Boolean).join(':')
		|| `notification-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
	);
}

function normalizeNotification(source = {}) {
	const normalized = {
		id: safeString(pickValue(source, ['id', 'Id', 'notificationId', 'NotificationId']), ''),
		title: safeString(pickValue(source, ['title', 'Title']), ''),
		content: safeString(pickValue(source, ['content', 'Content', 'message', 'Message']), ''),
		type: safeString(pickValue(source, ['type', 'Type', 'eventType', 'EventType']), ''),
		category: safeString(pickValue(source, ['category', 'Category']), ''),
		priority: safeString(pickValue(source, ['priority', 'Priority']), ''),
		bizType: safeString(pickValue(source, ['bizType', 'BizType']), ''),
		bizId: safeString(pickValue(source, ['bizId', 'BizId']), ''),
		bizDataId: safeString(pickValue(source, ['bizDataId', 'BizDataId']), ''),
		route: safeString(pickValue(source, ['route', 'Route']), ''),
		routeParams: pickValue(source, ['routeParams', 'RouteParams'], null),
		actionText: safeString(pickValue(source, ['actionText', 'ActionText']), ''),
		isRead: normalizeBoolean(pickValue(source, ['isRead', 'IsRead'], false)),
		readAt: safeString(pickValue(source, ['readAt', 'ReadAt']), ''),
		createdAt: safeString(pickValue(source, ['createdAt', 'CreatedAt', 'occurredAt', 'OccurredAt']), ''),
		senderName: safeString(pickValue(source, ['senderName', 'SenderName', 'title', 'Title']), ''),
		senderRealName: safeString(pickValue(source, ['senderRealName', 'SenderRealName', 'title', 'Title']), ''),
		__receivedAt: Date.now(),
	};

	normalized.Id = normalized.id;
	normalized.Title = normalized.title;
	normalized.Message = normalized.content;
	normalized.Type = normalized.type;
	normalized.BizType = normalized.bizType;
	normalized.BizId = normalized.bizId;
	normalized.IsRead = normalized.isRead;
	normalized.ReadAt = normalized.readAt;
	normalized.CreateTime = normalized.createdAt;
	normalized.SenderName = normalized.senderName;
	normalized.SenderRealName = normalized.senderRealName;
	normalized.__key = buildNotificationKey(normalized);
	return normalized;
}

function normalizeRefreshHint(source = {}) {
	return {
		target: safeString(pickValue(source, ['target', 'Target']), ''),
		bizId: safeString(pickValue(source, ['bizId', 'BizId']), ''),
		reason: safeString(pickValue(source, ['reason', 'Reason']), ''),
	};
}

function normalizeEnvelope(source = {}) {
	const refreshHintsRaw = pickValue(source, ['refreshHints', 'RefreshHints'], []);
	return {
		eventId: safeString(pickValue(source, ['eventId', 'EventId']), ''),
		eventType: safeString(pickValue(source, ['eventType', 'EventType', 'type', 'Type']), ''),
		occurredAt: safeString(pickValue(source, ['occurredAt', 'OccurredAt', 'createdAt', 'CreatedAt']), ''),
		notificationId: safeString(pickValue(source, ['notificationId', 'NotificationId']), ''),
		unreadCount: Number(pickValue(source, ['unreadCount', 'UnreadCount'], unreadNotificationCount.value) ?? unreadNotificationCount.value),
		needRefresh: Boolean(pickValue(source, ['needRefresh', 'NeedRefresh'], false)),
		refreshHints: Array.isArray(refreshHintsRaw) ? refreshHintsRaw.map((item) => normalizeRefreshHint(item)).filter((item) => item.target) : [],
		notification: pickValue(source, ['notification', 'Notification'], null),
		payload: pickValue(source, ['payload', 'Payload'], null),
		__receivedAt: Date.now(),
	};
}

function rememberEventId(eventId) {
	if (!eventId || recentEventIds.includes(eventId)) return false;
	recentEventIds.push(eventId);
	if (recentEventIds.length > MAX_RECENT_EVENT_IDS) {
		recentEventIds.splice(0, recentEventIds.length - MAX_RECENT_EVENT_IDS);
	}
	try {
		localStorage.setItem(LAST_EVENT_ID_STORAGE_KEY, eventId);
	} catch {
		// Ignore storage failures.
	}
	return true;
}

function readLastEventId() {
	try {
		return localStorage.getItem(LAST_EVENT_ID_STORAGE_KEY) || '';
	} catch {
		return '';
	}
}

function clearReconnectTimer() {
	if (!reconnectTimer) return;
	window.clearTimeout(reconnectTimer);
	reconnectTimer = null;
}

function resolveReconnectDelay() {
	const delay = Math.min(1000 * (2 ** reconnectAttempt), MAX_RECONNECT_DELAY_MS);
	const jitter = Math.floor(Math.random() * 500);
	return delay + jitter;
}

function hasAuthSession() {
	try {
		return Boolean(localStorage.getItem('refreshToken') || localStorage.getItem('accessToken'));
	} catch {
		return false;
	}
}

function buildSocketUrl(wsUrl, wsToken, lastEventId) {
	const fallbackUrl = new URL(PERSONAL_CENTER_WS_PATH, BASE_URL).toString();
	const url = new URL(wsUrl || fallbackUrl);
	url.protocol = url.protocol === 'https:' ? 'wss:' : url.protocol === 'http:' ? 'ws:' : url.protocol;
	url.searchParams.set('token', wsToken);
	if (lastEventId) {
		url.searchParams.set('lastEventId', lastEventId);
	}
	return url.toString();
}

function upsertNotification(notificationSource) {
	const nextNotification = normalizeNotification(notificationSource);
	const nextList = notificationList.value.slice();
	const existingIndex = nextList.findIndex((item) => item.__key === nextNotification.__key);

	if (existingIndex >= 0) {
		nextList.splice(existingIndex, 1);
	}

	nextList.unshift(nextNotification);
	notificationList.value = nextList.slice(0, MAX_NOTIFICATION_COUNT);
	return nextNotification;
}

function patchNotificationReadState(notificationIds = []) {
	if (!Array.isArray(notificationIds) || !notificationIds.length) return;

	const idSet = new Set(notificationIds.map((item) => safeString(item)).filter(Boolean));
	if (!idSet.size) return;

	notificationList.value = notificationList.value.map((item) => (
		idSet.has(item.id)
			? {
				...item,
				isRead: true,
				IsRead: true,
				readAt: item.readAt || new Date().toISOString(),
				ReadAt: item.readAt || new Date().toISOString(),
			}
			: item
	));
}

function pushEnvelope(envelope) {
	const nextList = envelopeList.value.slice();
	nextList.unshift(envelope);
	envelopeList.value = nextList.slice(0, MAX_EVENT_COUNT);
	lastEnvelope.value = envelope;
}

function handleRefreshSignal(envelope) {
	if (!envelope.needRefresh && !envelope.refreshHints.length) return;
	lastRefreshSignal.value = {
		eventId: envelope.eventId || `refresh-${Date.now()}`,
		needRefresh: envelope.needRefresh,
		refreshHints: envelope.refreshHints,
		occurredAt: envelope.occurredAt || new Date().toISOString(),
	};
}

function sendRawMessage(payload) {
	if (!socket || socket.readyState !== window.WebSocket.OPEN) {
		throw new Error('Realtime WebSocket is not connected');
	}
	socket.send(JSON.stringify(payload));
}

function sendPong() {
	if (!socket || socket.readyState !== window.WebSocket.OPEN) return;
	sendRawMessage({ eventType: 'pong' });
}

function scheduleReconnect() {
	if (manualClose || reconnectTimer || !hasAuthSession()) return;

	connectionStatus.value = 'reconnecting';
	const delay = resolveReconnectDelay();
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = null;
		connectPersonalCenterRealtime().catch(() => {});
	}, delay);
	reconnectAttempt += 1;
}

function handleSocketClose(currentSocket) {
	if (socket !== currentSocket) return;
	socket = null;
	if (manualClose) {
		connectionStatus.value = 'idle';
		return;
	}
	connectionStatus.value = 'disconnected';
	scheduleReconnect();
}

function handleReadSync(envelope) {
	const payload = envelope.payload && typeof envelope.payload === 'object' ? envelope.payload : {};
	const notificationIds = [
		payload.notificationId,
		envelope.notificationId,
		...(Array.isArray(payload.notificationIds) ? payload.notificationIds : []),
	].map((item) => safeString(item)).filter(Boolean);

	patchNotificationReadState(notificationIds);
	if (Number.isFinite(envelope.unreadCount)) {
		unreadNotificationCount.value = Math.max(0, envelope.unreadCount);
	}
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

	const envelope = normalizeEnvelope(payload);
	if (envelope.eventId && !rememberEventId(envelope.eventId)) {
		return;
	}

	if (Number.isFinite(envelope.unreadCount)) {
		unreadNotificationCount.value = Math.max(0, envelope.unreadCount);
	}

	if (envelope.eventType === 'ping') {
		sendPong();
		return;
	}

	if (envelope.eventType === 'notification_read_sync') {
		handleReadSync(envelope);
		pushEnvelope(envelope);
		handleRefreshSignal(envelope);
		return;
	}

	if (envelope.notification) {
		upsertNotification(envelope.notification);
	} else if (envelope.eventType === 'report_submit_reminder') {
		upsertNotification({
			id: envelope.notificationId || envelope.eventId,
			type: envelope.eventType,
			content: safeString(pickValue(envelope.payload || {}, ['content', 'message', 'Message']), ''),
			title: safeString(pickValue(envelope.payload || {}, ['title', 'Title']), '日报提交提醒'),
			isRead: false,
			createdAt: envelope.occurredAt,
		});
	}

	pushEnvelope(envelope);
	handleRefreshSignal(envelope);
}

export async function connectPersonalCenterRealtime() {
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

		const tokenData = await getRealtimeToken();
		const wsToken = safeString(pickValue(tokenData || {}, ['wsToken', 'WsToken']), '');
		if (!wsToken) {
			connectionStatus.value = 'error';
			throw new Error('Missing realtime wsToken');
		}

		const wsUrl = safeString(pickValue(tokenData || {}, ['wsUrl', 'WsUrl']), '');
		const lastEventId = readLastEventId();
		const nextSocket = new window.WebSocket(buildSocketUrl(wsUrl, wsToken, lastEventId));
		socket = nextSocket;

		await new Promise((resolve, reject) => {
			let didOpen = false;
			nextSocket.onopen = () => {
				didOpen = true;
				reconnectAttempt = 0;
				connectionStatus.value = 'connected';
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
					reject(new Error('Realtime WebSocket closed before opening'));
				}
				handleSocketClose(nextSocket);
			};
			nextSocket.addEventListener('error', () => {
				if (nextSocket.readyState !== window.WebSocket.OPEN) {
					reject(new Error('Realtime WebSocket failed to connect'));
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

export function disconnectPersonalCenterRealtime(options = {}) {
	const { clearState = false } = options;
	manualClose = true;
	clearReconnectTimer();
	reconnectAttempt = 0;
	connectionStatus.value = 'idle';

	if (socket) {
		const currentSocket = socket;
		socket = null;
		currentSocket.close();
	}

	if (clearState) {
		envelopeList.value = [];
		notificationList.value = [];
		lastEnvelope.value = null;
		lastRefreshSignal.value = null;
		unreadNotificationCount.value = 0;
		recentEventIds.splice(0, recentEventIds.length);
		try {
			localStorage.removeItem(LAST_EVENT_ID_STORAGE_KEY);
		} catch {
			// Ignore storage failures.
		}
	}
}

export async function markRealtimeNotificationRead(notification) {
	const notificationId = safeString(notification?.id || notification?.notificationId || notification, '');
	if (!notificationId) return;

	await markNotificationRead(notificationId);
	patchNotificationReadState([notificationId]);
	unreadNotificationCount.value = Math.max(0, unreadNotificationCount.value - 1);
}

export async function markReportReminderRead(notification) {
	return markRealtimeNotificationRead(notification);
}

export function usePersonalCenterRealtime() {
	return {
		connectionStatus: readonly(connectionStatus),
		isPersonalCenterRealtimeConnected: readonly(isPersonalCenterRealtimeConnected),
		envelopeList: readonly(envelopeList),
		notificationList: readonly(notificationList),
		lastEnvelope: readonly(lastEnvelope),
		lastRefreshSignal: readonly(lastRefreshSignal),
		unreadNotificationCount: readonly(unreadNotificationCount),
		reportReminders: readonly(reportReminders),
		unreadReportReminders: readonly(unreadReportReminders),
		latestReportReminder: readonly(latestReportReminder),
		connectPersonalCenterRealtime,
		disconnectPersonalCenterRealtime,
		markRealtimeNotificationRead,
		markReportReminderRead,
	};
}
