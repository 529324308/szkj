<template>
	<div v-if="active" class="toolbar">
		<button
			:class="['tool-btn', { active: activeTool === 'ai' || aiChatVisible }]"
			@click="$emit('start-tool', 'ai')"
		>
			<img class="tool-icon" :src="icons.ai" alt="AI对话" />
			<span>AI对话</span>
		</button>
		<button
			:class="['tool-btn', { active: activeTool === 'drawPolygon' }]"
			@click="$emit('start-tool', 'drawPolygon')"
		>
			<img class="tool-icon" :src="icons.drawPolygon" alt="分析报告" />
			<span>分析报告</span>
		</button>
	</div>

	<div
		v-if="aiChatVisible"
		ref="aiChatPanelRef"
		class="ai-chat-panel"
		:class="{
			maximized: aiChatMaximized,
			minimized: !aiChatMaximized,
			dragging: aiChatDragging && !aiChatMaximized,
			'sidebar-open': historyVisible && aiChatMaximized && !isMobileView
		}"
		:style="panelInlineStyle"
		@click.stop
	>
		<!-- 历史对话列表侧边栏 -->
		<aside ref="chatHistorySidebarRef" class="chat-history-sidebar" :class="{ 'is-open': historyVisible, 'is-mobile': isMobileView }">
			<div class="sidebar-header">
				<span class="sidebar-title">历史对话</span>
				<button class="sidebar-close-btn" @click="toggleHistory" title="关闭">
					<img :src="icons.close" alt="关闭" />
				</button>
			</div>
			<div class="sidebar-actions">
				<button class="new-chat-btn" @click="createNewChat">
					<img :src="icons.add" alt="新建" />
					<span>新建对话</span>
				</button>
			</div>
			<div class="history-list">
				<div
					v-for="chat in chatHistoryList"
					:key="chat.id"
					:class="['history-item', { active: chat.id === currentChatId }]"
					@click="switchToChat(chat.id)"
				>
					<div class="history-item-icon">
						<img :src="icons.chat" alt="对话" />
					</div>
					<div class="history-item-content">
						<div class="history-item-title">{{ chat.title || '未命名对话' }}</div>
						<div class="history-item-time">{{ formatTime(chat.updatedAt) }}</div>
					</div>
					<button
						class="history-item-delete"
						@click.stop="deleteChat(chat.id)"
						title="删除"
					>
						<img :src="icons.delete" alt="删除" />
					</button>
				</div>
				<div v-if="chatHistoryList.length === 0" class="history-empty">
					暂无历史对话
				</div>
			</div>
		</aside>

		<div ref="aiChatMainRef" class="ai-chat-main">
			<div
				ref="aiChatHeaderRef"
				class="ai-chat-header"
				@mousedown="$emit('drag-start', $event)"
				@touchstart.prevent="$emit('drag-start', $event)"
			>
				<div class="header-left">
					<!-- 展开历史列表按钮 -->
					<button
						v-if="(!historyVisible || isMobileView) && aiChatMaximized"
						class="header-btn history-toggle-btn"
						title="显示历史对话"
						@mousedown.stop
						@touchstart.stop
						@click="toggleHistory"
					>
						<img :src="icons.menu" alt="历史" class="action-icon" />
					</button>

					<div class="ai-title">
						<img :src="icons.ai" alt="AI" class="ai-avatar" />
						<div class="ai-title-copy">
							<div class="ai-title-main">智能 AI 对话</div>
							<div class="ai-title-sub">{{ currentModelLabel }}</div>
						</div>
					</div>
				</div>

				<div class="ai-actions">
					<button
						class="header-btn"
						title="切换大小"
						@mousedown.stop
						@touchstart.stop
						@click="$emit('toggle-size')"
					>
						<img :src="aiChatMaximized ? icons.minimize : icons.maximize" alt="切换大小" class="action-icon" />
					</button>
					<button
						class="header-btn"
						title="关闭"
						@mousedown.stop
						@touchstart.stop
						@click="$emit('close-chat')"
					>
						<img :src="icons.close" alt="关闭" class="action-icon" />
					</button>
				</div>
			</div>

			<div class="ai-chat-body">
				<div v-if="noticeText" class="chat-notice" :class="noticeTone">
					{{ noticeText }}
				</div>

				<div v-if="visibleMessages.length === 0" class="chat-empty">
					<img :src="icons.ai" alt="AI" class="empty-avatar" />
					<h3>开始一段智能分析对话</h3>
					<p>你可以询问图层解读、业务分析、报告整理，或者让助手帮助你梳理下一步思路。</p>
				</div>

				<div v-else ref="aiChatBodyRef" class="chat-list">
					<div
						v-for="message in visibleMessages"
						:key="message.id"
						:class="['chat-row', message.role]"
					>
						<div v-if="message.role === 'assistant'" class="chat-avatar assistant">
							<img :src="icons.ai" alt="AI" />
						</div>

						<div class="chat-bubble" :class="{ 'is-streaming': isStreamingAssistant(message) }">
							<div v-if="isStreamingAssistant(message) || hasThinkingText(message)" class="chat-thinking">
								<div class="chat-thinking-head">
									<div class="chat-thinking-label">
										<span class="thinking-dot"></span>
										<span>{{ getThinkingLabel(message) }}</span>
									</div>
									<button
										v-if="canToggleThinking(message)"
										class="thinking-toggle-btn"
										type="button"
										@click="toggleThinking(message)"
									>
										{{ isThinkingCollapsed(message) ? '展开' : '收起' }}
									</button>
								</div>
								<div v-if="hasThinkingText(message) && !isThinkingCollapsed(message)" class="chat-thinking-text">
									{{ message.thinking }}
								</div>
								<div v-if="showBubbleLoader(message)" class="chat-bubble-loader" aria-hidden="true">
									<span></span>
									<span></span>
									<span></span>
								</div>
							</div>

							<div v-if="message.content" class="chat-text">{{ message.content }}</div>
						</div>

						<div v-if="message.role === 'user'" class="chat-avatar user">
							<img :src="icons.me" alt="用户" />
						</div>
					</div>
				</div>

				<div class="composer-wrap">
					<div class="composer">
						<textarea
							v-model="draft"
							class="composer-input"
							placeholder="给智能分析助手发送消息"
							:disabled="isLoading"
							@keydown="onComposerKeydown"
						></textarea>

						<div class="composer-footer">
							<div class="composer-left">
								<!-- <select
									v-model="selectedModel"
									class="model-select"
									:disabled="isLoading"
									@change="applySelectedModel"
								>
									<option v-for="model in availableModels" :key="model" :value="model">
										{{ model }}
									</option>
								</select> -->

								<!-- <button class="secondary-btn" :disabled="isLoading" @click="resetConversation">
									新建对话
								</button> -->
							</div>

							<button class="primary-btn" :disabled="!canSend" @click="sendDraft">
								{{ isLoading ? '思考中...' : '发送' }}
							</button>
						</div>
					</div>

					<div class="composer-tip">
						当前使用本地 Ollama 服务 {{ OLLAMA_BASE_URL }}，可直接切换已安装模型。
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_STORAGE_KEY = 'smart-analysis-ollama-model';
const CHAT_LIST_STORAGE_KEY = 'smart-analysis-ollama-chat-list';
const DEFAULT_MODELS = ['qwen2.5:7b', 'qwen3.5:9b', 'deepseek-r1:8b', 'vuemaster:latest'];
const DEFAULT_MODEL = localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODELS[0];
const CONNECTION_ERROR_TEXT = '当前无法连接本地模型，请确认 Ollama 已启动，并且所选模型已经安装。';
const CURRENT_CHAT_ID_KEY = 'smart-analysis-ollama-current-chat-id';
const MOBILE_BREAKPOINT = 768;
const COMPACT_PANEL_BREAKPOINT = 960;
const MAXIMIZED_PANEL_WIDTH_RATIO = 0.92;
const MAXIMIZED_PANEL_HEIGHT_RATIO = 0.82;
const MOBILE_PANEL_WIDTH_RATIO = 0.94;
const MOBILE_PANEL_HEIGHT_RATIO = 0.84;
const MAXIMIZED_PANEL_MAX_WIDTH = 1600;
const MAXIMIZED_PANEL_MAX_HEIGHT = 1060;
const MINIMIZED_PANEL_WIDTH = 420;
const MINIMIZED_PANEL_HEIGHT = 620;
const MINIMIZED_PANEL_RIGHT_GAP = 10;
const MINIMIZED_PANEL_BOTTOM_GAP = 80;
const MIN_PANEL_TOP_GAP = 70;
const PANEL_VIEWPORT_GAP = 10;
const PANEL_SCROLL_SYNC_DELAY = 420;

const props = defineProps({
	active: Boolean,
	icons: {
		type: Object,
		default: () => ({})
	},
	activeTool: String,
	aiChatVisible: Boolean,
	aiChatMaximized: Boolean,
	aiChatDragging: Boolean,
	aiChatTop: Number,
	aiChatLeft: Number,
	aiChatMessages: {
		type: Array,
		default: () => []
	},
	aiChatInput: {
		type: String,
		default: ''
	}
});

defineEmits(['start-tool', 'drag-start', 'toggle-size', 'close-chat', 'send-message', 'update:aiChatInput']);

const aiChatPanelRef = ref(null);
const aiChatBodyRef = ref(null);
const chatHistorySidebarRef = ref(null);
const aiChatMainRef = ref(null);
const aiChatHeaderRef = ref(null);
const draft = ref('');
const selectedModel = ref(DEFAULT_MODEL);
const availableModels = ref([...new Set([DEFAULT_MODEL, ...DEFAULT_MODELS])]);
const statusText = ref('正在连接本地模型...');
const statusTone = ref('neutral');
const userError = ref('');
const loadingModels = ref(false);
const isLoading = ref(false);
const activeAssistantMessageId = ref(null);
const messages = ref([]);

// 历史对话相关状态
const chatHistoryList = ref(loadChatList());
const currentChatId = ref(null);
const draftChatId = ref(createSessionId());
const historyVisible = ref(true);
const isMobileView = ref(false);
const viewportSize = ref(getViewportSize());
let resizeObserver = null;
let scrollSyncTimer = null;

// 如果有当前对话ID但没有对应的对话记录，则重置
clearPersistedCurrentChatId();

watch(
	messages,
	() => {
	},
	{ deep: true }
);

const visibleMessages = computed(() => messages.value);
const canSend = computed(() => Boolean(draft.value.trim()) && !isLoading.value);
const currentModelLabel = computed(() => selectedModel.value || '未选择模型');
const noticeText = computed(() => userError.value || statusText.value);
const noticeTone = computed(() => (userError.value ? 'warning' : statusTone.value));
const panelInlineStyle = computed(() => {
	const metrics = props.aiChatMaximized || isMobileView.value
		? getMaximizedPanelMetrics()
		: getMinimizedPanelMetrics();

	return {
		top: `${metrics.top}px`,
		left: `${metrics.left}px`,
		width: `${metrics.width}px`,
		height: `${metrics.height}px`
	};
});

watch(
	() => [props.aiChatVisible, props.active, visibleMessages.value.length, isLoading.value],
	() => {
		scheduleScrollToBottom();
	},
	{ flush: 'post' }
);

watch(
	() => props.aiChatVisible,
	(visible) => {
		if (visible) {
			loadModels();
		}
	}
);

// 监听最大化状态变化，缩小面板时关闭历史侧边栏
watch(
	() => props.aiChatMaximized,
	(maximized) => {
		if (!maximized) {
			historyVisible.value = false;
		}
		scheduleScrollToBottom();
	}
);

onMounted(() => {
	loadModels();
	scrollToBottom();
	initResizeObserver();
	checkMobileView();
	window.addEventListener('resize', checkMobileView);
});

onUnmounted(() => {
	if (resizeObserver) {
		resizeObserver.disconnect();
		resizeObserver = null;
	}
	if (scrollSyncTimer) {
		clearTimeout(scrollSyncTimer);
		scrollSyncTimer = null;
	}
	window.removeEventListener('resize', checkMobileView);
});

function initResizeObserver() {
	if (typeof ResizeObserver !== 'undefined') {
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				checkMobileView(entry.contentRect.width);
				scheduleScrollToBottom();
			}
		});
		if (aiChatPanelRef.value) {
			resizeObserver.observe(aiChatPanelRef.value);
		}
	}
}

function checkMobileView() {
	viewportSize.value = getViewportSize();
	isMobileView.value = window.innerWidth < MOBILE_BREAKPOINT;
}

function getViewportSize() {
	if (typeof window === 'undefined') {
		return { width: 1440, height: 900 };
	}

	return {
		width: window.innerWidth,
		height: window.innerHeight
	};
}

function getMaximizedPanelMetrics() {
	const { width: viewportWidth, height: viewportHeight } = viewportSize.value;
	const compactLayout = viewportWidth < COMPACT_PANEL_BREAKPOINT;
	const width = compactLayout
		? viewportWidth * MOBILE_PANEL_WIDTH_RATIO
		: Math.min(MAXIMIZED_PANEL_MAX_WIDTH, viewportWidth * MAXIMIZED_PANEL_WIDTH_RATIO);
	const height = compactLayout
		? viewportHeight * MOBILE_PANEL_HEIGHT_RATIO
		: Math.min(MAXIMIZED_PANEL_MAX_HEIGHT, viewportHeight * MAXIMIZED_PANEL_HEIGHT_RATIO);
	const left = Math.max(PANEL_VIEWPORT_GAP, (viewportWidth - width) / 2);
	const top = Math.max(140, (viewportHeight - height) / 2); // 修改默认对话框距离头部高度

	return roundPanelMetrics({ width, height, left, top });
}

function getDefaultMinimizedPanelMetrics() {
	const { width: viewportWidth, height: viewportHeight } = viewportSize.value;
	const width = Math.min(MINIMIZED_PANEL_WIDTH, viewportWidth - PANEL_VIEWPORT_GAP * 2);
	const height = Math.min(MINIMIZED_PANEL_HEIGHT, viewportHeight - MIN_PANEL_TOP_GAP - PANEL_VIEWPORT_GAP);
	const left = Math.max(PANEL_VIEWPORT_GAP, viewportWidth - width - MINIMIZED_PANEL_RIGHT_GAP);
	const top = Math.max(MIN_PANEL_TOP_GAP, viewportHeight - height - MINIMIZED_PANEL_BOTTOM_GAP);

	return roundPanelMetrics({ width, height, left, top });
}

function getMinimizedPanelMetrics() {
	const defaults = getDefaultMinimizedPanelMetrics();
	const maxLeft = Math.max(PANEL_VIEWPORT_GAP, viewportSize.value.width - defaults.width - PANEL_VIEWPORT_GAP);
	const maxTop = Math.max(MIN_PANEL_TOP_GAP, viewportSize.value.height - defaults.height - PANEL_VIEWPORT_GAP);

	return {
		...defaults,
		left: clampPanelValue(props.aiChatLeft, PANEL_VIEWPORT_GAP, maxLeft, defaults.left),
		top: clampPanelValue(props.aiChatTop, MIN_PANEL_TOP_GAP, maxTop, defaults.top)
	};
}

function clampPanelValue(value, min, max, fallback) {
	const resolved = Number.isFinite(value) ? value : fallback;
	return Math.min(Math.max(resolved, min), max);
}

function roundPanelMetrics(metrics) {
	return {
		width: Math.round(metrics.width),
		height: Math.round(metrics.height),
		left: Math.round(metrics.left),
		top: Math.round(metrics.top)
	};
}

function scrollToBottom() {
	nextTick(() => {
		const element = aiChatBodyRef.value;
		if (element) {
			element.scrollTop = element.scrollHeight;
		}
	});
}

function scheduleScrollToBottom() {
	scrollToBottom();

	if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
		window.requestAnimationFrame(() => {
			scrollToBottom();
		});
	}

	if (scrollSyncTimer) {
		clearTimeout(scrollSyncTimer);
	}

	scrollSyncTimer = setTimeout(() => {
		scrollToBottom();
		scrollSyncTimer = null;
	}, PANEL_SCROLL_SYNC_DELAY);
}

function applySelectedModel() {
	localStorage.setItem(MODEL_STORAGE_KEY, selectedModel.value);
	userError.value = '';
	statusText.value = `已切换到 ${selectedModel.value}`;
	statusTone.value = 'success';
}

async function loadModels() {
	if (loadingModels.value) return;
	loadingModels.value = true;
	userError.value = '';

	try {
		const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const result = await response.json();
		const models = Array.isArray(result?.models)
			? result.models.map((item) => item?.name).filter(Boolean)
			: [];
		const merged = [...new Set([...models, ...DEFAULT_MODELS, selectedModel.value].filter(Boolean))];
		availableModels.value = merged.length ? merged : [...DEFAULT_MODELS];

		if (!availableModels.value.includes(selectedModel.value)) {
			selectedModel.value = availableModels.value[0];
			applySelectedModel();
		}

		statusText.value = models.length
			? `模型已连接，服务可用`
			: '已连接，可直接开始对话';
		statusTone.value = 'success';
	} catch {
		availableModels.value = [...new Set([selectedModel.value, ...DEFAULT_MODELS])];
		statusText.value = '未检测到本地模型服务，当前保留默认模型列表';
		statusTone.value = 'warning';
	} finally {
		loadingModels.value = false;
	}
}

function resetConversation() {
	createNewChat();
}

// 历史对话管理
function loadChatList() {
	try {
		const raw = localStorage.getItem(CHAT_LIST_STORAGE_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		return Array.isArray(list) ? list : [];
	} catch {
		localStorage.removeItem(CHAT_LIST_STORAGE_KEY);
		return [];
	}
}

function saveChatList(list) {
	if (list.length === 0) {
		localStorage.removeItem(CHAT_LIST_STORAGE_KEY);
	} else {
		localStorage.setItem(CHAT_LIST_STORAGE_KEY, JSON.stringify(list));
	}
}

function clearPersistedCurrentChatId() {
	try {
		localStorage.removeItem(CURRENT_CHAT_ID_KEY);
	} catch {
		// Ignore cleanup failures so the chat can still work in-memory.
	}
}

function createSessionId() {
	return createMessageId();
}

function enterDraftChat() {
	currentChatId.value = null;
	draftChatId.value = createSessionId();
	messages.value = [];
	activeAssistantMessageId.value = null;
	draft.value = '';
	userError.value = '';
	statusText.value = '已创建新的空白对话';
	statusTone.value = 'success';
	clearPersistedCurrentChatId();
	scrollToBottom();
}

function persistDraftChat() {
	const now = new Date().toISOString();
	const newChat = {
		id: draftChatId.value || createSessionId(),
		title: '',
		messages: [],
		model: selectedModel.value,
		createdAt: now,
		updatedAt: null
	};

	chatHistoryList.value = [newChat, ...chatHistoryList.value];
	currentChatId.value = newChat.id;
	draftChatId.value = null;
	localStorage.setItem(CURRENT_CHAT_ID_KEY, newChat.id);
	saveChatList(chatHistoryList.value);

	return newChat;
}

function createNewChat() {
	if (!historyVisible.value) {
		historyVisible.value = true;
	}
	enterDraftChat();

	statusText.value = `新对话已创建`;
	statusTone.value = 'success';
	if (!historyVisible.value) {
		historyVisible.value = true;
	}
	saveChatList(chatHistoryList.value);
	scrollToBottom();
}

function switchToChat(chatId) {
	const chat = chatHistoryList.value.find((c) => c.id === chatId);
	if (!chat) return;
	currentChatId.value = chatId;
	draftChatId.value = null;
	localStorage.setItem(CURRENT_CHAT_ID_KEY, chatId);
	messages.value = chat.messages ? [...chat.messages] : [];
	activeAssistantMessageId.value = null;
	draft.value = '';
	userError.value = '';
	statusText.value = `已加载对话: ${chat.title || '未命名'}`;
	statusTone.value = 'success';
	scrollToBottom();
}

function deleteChat(chatId) {
	const chatToDelete = chatHistoryList.value.find((c) => c.id === chatId);
	if (chatToDelete) {
		// 清除该对话的消息记忆
		chatToDelete.messages = [];
	}
	chatHistoryList.value = chatHistoryList.value.filter((c) => c.id !== chatId);
	if (currentChatId.value === chatId) {
		if (chatHistoryList.value.length > 0) {
			switchToChat(chatHistoryList.value[0].id);
		} else {
			enterDraftChat();
		}
	}
	saveChatList(chatHistoryList.value);
}

function toggleHistory() {
	historyVisible.value = !historyVisible.value;
}

function formatTime(isoString) {
	if (!isoString) return '';
	const date = new Date(isoString);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const oneDay = 24 * 60 * 60 * 1000;
	const oneWeek = 7 * oneDay;

	if (diff < oneDay) {
		return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
	} else if (diff < oneWeek) {
		const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
		return days[date.getDay()];
	} else {
		return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
	}
}

function getLastAssistantReplyTime(messageList) {
	if (!Array.isArray(messageList)) {
		return null;
	}

	for (let index = messageList.length - 1; index >= 0; index -= 1) {
		const message = messageList[index];
		if (message?.role !== 'assistant') {
			continue;
		}

		if ((message.content || message.thinking) && message.timestamp) {
			return message.timestamp;
		}
	}

	return null;
}

// 监听消息变化，自动保存到当前对话
watch(
	messages,
	(newMessages) => {
		if (currentChatId.value) {
			const chat = chatHistoryList.value.find((c) => c.id === currentChatId.value);
			if (chat) {
				chat.messages = [...newMessages];
				chat.model = selectedModel.value;
				chat.updatedAt = getLastAssistantReplyTime(newMessages) || chat.updatedAt || null;
				if (!chat.title && newMessages.length > 0) {
					const firstUserMsg = newMessages.find((m) => m.role === 'user');
					if (firstUserMsg) {
						chat.title = firstUserMsg.content.slice(0, 30);
					}
				}
				saveChatList(chatHistoryList.value);
			}
		}
	},
	{ deep: true }
);

async function sendDraft() {
	if (!canSend.value) return;

	const text = draft.value.trim();

	// 如果没有当前对话，创建一个新的
	if (!currentChatId.value) {
		persistDraftChat();
	}

	const userMessage = createMessage('user', text);
	const assistantMessage = createMessage('assistant', '', undefined, undefined, {
		thinking: '',
		isThinking: true,
		thinkingCollapsed: false
	});

	draft.value = '';
	userError.value = '';
	isLoading.value = true;
	activeAssistantMessageId.value = assistantMessage.id;
	messages.value = [...messages.value, userMessage, assistantMessage];

	try {
		const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: selectedModel.value,
				messages: messages.value
					.filter((message) => message.id !== assistantMessage.id)
					.map(({ role, content }) => ({ role, content })),
				stream: true
			})
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		if (!response.body) {
			const result = await response.json();
			assistantMessage.thinking = normalizeThinkingText(result?.message?.thinking || result?.message?.reasoning || '');
			assistantMessage.content = result?.message?.content || '';
			assistantMessage.timestamp = new Date().toISOString();
			assistantMessage.isThinking = false;
			assistantMessage.thinkingCollapsed = true;
			messages.value = [...messages.value];
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { value, done } = await reader.read();
			buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

			let lineBreakIndex = buffer.indexOf('\n');
			while (lineBreakIndex !== -1) {
				const line = buffer.slice(0, lineBreakIndex).trim();
				buffer = buffer.slice(lineBreakIndex + 1);
				if (line) {
					appendStreamChunk(line, assistantMessage);
				}
				lineBreakIndex = buffer.indexOf('\n');
			}

			if (done) {
				const tail = buffer.trim();
				if (tail) {
					appendStreamChunk(tail, assistantMessage);
				}
				break;
			}
		}
	} catch {
		messages.value = messages.value.filter((message) => message.id !== assistantMessage.id);
		userError.value = CONNECTION_ERROR_TEXT;
		statusText.value = '本地模型暂不可用';
		statusTone.value = 'warning';
	} finally {
		isLoading.value = false;
		activeAssistantMessageId.value = null;
		assistantMessage.isThinking = false;
	}
}

function onComposerKeydown(event) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		sendDraft();
	}
}

function createMessage(role, content, id, timestamp, extra = {}) {
	return {
		id: id || createMessageId(),
		role,
		content,
		thinking: typeof extra.thinking === 'string' ? extra.thinking : '',
		isThinking: Boolean(extra.isThinking),
		thinkingCollapsed: Boolean(extra.thinkingCollapsed),
		timestamp: timestamp || new Date().toISOString()
	};
}

function createMessageId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function appendStreamChunk(line, assistantMessage) {
	try {
		const chunk = JSON.parse(line);
		const content = chunk?.message?.content;
		const thinkingChunk = normalizeThinkingText(
			chunk?.message?.thinking || chunk?.message?.reasoning || chunk?.thinking || chunk?.reasoning || ''
		);
		if (thinkingChunk) {
			assistantMessage.thinking += thinkingChunk;
			assistantMessage.isThinking = true;
			assistantMessage.thinkingCollapsed = false;
		}
		if (typeof content === 'string' && content) {
			assistantMessage.content += content;
		}
		if (chunk?.done) {
			assistantMessage.timestamp = new Date().toISOString();
			assistantMessage.isThinking = false;
			assistantMessage.thinkingCollapsed = true;
		}
		messages.value = [...messages.value];
	} catch {
	}
}

function normalizeThinkingText(value) {
	return typeof value === 'string' ? value : '';
}

function isStreamingAssistant(message) {
	return message?.role === 'assistant' && isLoading.value && message.id === activeAssistantMessageId.value;
}

function hasThinkingText(message) {
	return Boolean(message?.thinking && message.thinking.trim());
}

function getThinkingLabel(message) {
	return hasThinkingText(message) ? '思考过程' : '思考中...';
}

function canToggleThinking(message) {
	return hasThinkingText(message) && !message?.isThinking;
}

function isThinkingCollapsed(message) {
	return Boolean(message?.thinkingCollapsed) && canToggleThinking(message);
}

function toggleThinking(message) {
	if (!canToggleThinking(message)) {
		return;
	}

	message.thinkingCollapsed = !message.thinkingCollapsed;
	messages.value = [...messages.value];
}

function showBubbleLoader(message) {
	return isStreamingAssistant(message) && !message.content && !hasThinkingText(message);
}

defineExpose({
	aiChatBodyRef,
	aiChatPanelRef,
	chatHistorySidebarRef,
	aiChatMainRef,
	aiChatHeaderRef
});
</script>

<style scoped>
.toolbar {
	position: absolute;
	top: 50px;
	left: 0;
	right: 0;
	height: 60px;
	background: #f3f5f7;
	border-bottom: 1px solid #e0e3e6;
	display: flex;
	align-items: center;
	padding: 0 16px;
	gap: 16px;
	z-index: 2;
}

.tool-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-width: 56px;
	padding: 6px 10px;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.tool-btn:hover {
	background: #e9edef;
}

.tool-btn.active {
	background: #e1eefd;
	border-color: #8ebcff;
	color: #007bff;
}

.tool-icon {
	width: 20px;
	height: 20px;
	margin-bottom: 2px;
}

.ai-chat-panel {
	position: fixed;
	top: 0;
	left: 0;
	background: #ffffff;
	border: 1px solid #d9dee3;
	border-radius: 18px;
	box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
	z-index: 12;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	will-change: top, left, width, height, border-radius, box-shadow;
	transition:
		top 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		left 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		width 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		height 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		border-radius 0.3s ease,
		box-shadow 0.3s ease,
		opacity 0.22s ease;
}

.ai-chat-panel.maximized {
	border-radius: 22px;
	box-shadow: 0 26px 64px rgba(15, 23, 42, 0.2);
}

.ai-chat-panel.minimized {
	border-radius: 18px;
	box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}

.ai-chat-panel.minimized.dragging {
	box-shadow: 0 0 20px 5px rgba(54, 155, 250, 0.2), 0 18px 35px rgba(15, 23, 42, 0.28);
	transition: none;
}

.ai-chat-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid #edf1f5;
	background: #ffffff;
	cursor: move;
	flex-shrink: 0;
	overflow: hidden;
	align-self: center;
	width: 100%;
	box-sizing: border-box;
}
.ai-chat-panel.maximized .ai-chat-header {
	cursor: default;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.history-toggle-btn {
	margin-right: 4px;
}

.ai-chat-main {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
	transition: padding-left 0.26s ease;
}

.ai-chat-panel.sidebar-open .ai-chat-main {
	padding-left: 200px;
}

.ai-title {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.ai-avatar {
	width: 26px;
	height: 26px;
}

.ai-title-copy {
	min-width: 0;
}

.ai-title-main {
	font-size: 14px;
	font-weight: 600;
	color: #111827;
}

.ai-title-sub {
	margin-top: 2px;
	font-size: 12px;
	color: #6b7280;
}

.ai-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.header-btn {
	width: 30px;
	height: 30px;
	border: 1px solid #d5dbe3;
	border-radius: 9px;
	background: #fff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
}

.action-icon {
	width: 16px;
	height: 16px;
}

.ai-chat-body {
	display: flex;
	flex: 1;
	min-height: 0;
	flex-direction: column;
	background: #f7f7f8;
	overflow: hidden;
}

.chat-notice {
	width: min(760px, calc(100% - 32px));
	margin: 14px auto 0;
	padding: 10px 14px;
	border-radius: 14px;
	font-size: 12px;
	line-height: 1.5;
}

.chat-notice.success,
.chat-notice.neutral {
	background: #f3f7fb;
	color: #526173;
	border: 1px solid #e4ebf3;
}

.chat-notice.warning {
	background: #fff7ed;
	color: #9a3412;
	border: 1px solid #fed7aa;
}

.chat-empty {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 24px;
	text-align: center;
	color: #4b5563;
}

.empty-avatar {
	width: 56px;
	height: 56px;
	margin-bottom: 16px;
}

.chat-empty h3 {
	margin: 0 0 10px;
	font-size: 24px;
	font-weight: 600;
	color: #111827;
}

.chat-empty p {
	max-width: 560px;
	margin: 0;
	font-size: 14px;
	line-height: 1.7;
}

.chat-list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 22px 0 8px;
}

.chat-row {
	width: min(760px, calc(100% - 32px));
	margin: 0 auto 18px;
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.chat-row.user {
	justify-content: flex-end;
}

.chat-avatar {
	width: 30px;
	height: 30px;
	border-radius: 999px;
	overflow: hidden;
	flex-shrink: 0;
	background: #f3f4f6;
	border: 1px solid #e5e7eb;
}

.chat-avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.chat-bubble {
	max-width: min(680px, calc(100% - 84px));
	padding: 14px 16px;
	border-radius: 18px;
	background: #ffffff;
	border: 1px solid #eceff3;
	box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.chat-bubble.is-streaming {
	border-color: #d8e5f8;
	box-shadow: 0 10px 24px rgba(59, 130, 246, 0.08);
}

.chat-row.user .chat-bubble {
	background: #f3f4f6;
	border-color: #e5e7eb;
}

.chat-thinking {
	margin-bottom: 10px;
	padding: 10px 12px;
	border-radius: 14px;
	background: #f7faff;
	border: 1px solid #e3edf9;
}

.chat-thinking-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.chat-thinking-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	line-height: 1.4;
	color: #64748b;
}

.thinking-toggle-btn {
	border: none;
	background: transparent;
	padding: 0;
	font-size: 12px;
	line-height: 1.4;
	color: #2563eb;
	cursor: pointer;
	flex-shrink: 0;
}

.thinking-toggle-btn:hover {
	color: #1d4ed8;
}

.thinking-dot {
	width: 6px;
	height: 6px;
	border-radius: 999px;
	background: #3b82f6;
	box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.28);
	animation: thinkingPulse 1.4s ease-in-out infinite;
}

.chat-thinking-text {
	margin-top: 8px;
	font-size: 12px;
	line-height: 1.7;
	color: #475569;
	white-space: pre-wrap;
	word-break: break-word;
}

.chat-bubble-loader {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-top: 10px;
	padding: 2px 0;
}

.chat-bubble-loader span {
	width: 7px;
	height: 7px;
	border-radius: 999px;
	background: #7aa2e3;
	animation: bubbleBounce 1s ease-in-out infinite;
}

.chat-bubble-loader span:nth-child(2) {
	animation-delay: 0.16s;
}

.chat-bubble-loader span:nth-child(3) {
	animation-delay: 0.32s;
}

.chat-text {
	font-size: 14px;
	line-height: 1.75;
	color: #1f2937;
	white-space: pre-wrap;
	word-break: break-word;
}

@keyframes thinkingPulse {
	0%,
	100% {
		box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.28);
		opacity: 0.9;
	}

	50% {
		box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
		opacity: 1;
	}
}

@keyframes bubbleBounce {
	0%,
	80%,
	100% {
		transform: translateY(0);
		opacity: 0.45;
	}

	40% {
		transform: translateY(-4px);
		opacity: 1;
	}
}

.composer-wrap {
	padding: 14px 16px 18px;
	background: linear-gradient(180deg, rgba(247, 247, 248, 0) 0%, #ffffff 18%);
}

.composer {
	width: min(760px, 100%);
	box-sizing: border-box;
	margin: 0 auto;
	padding: 12px 14px 10px;
	background: #ffffff;
	border: 1px solid #dfe4ea;
	border-radius: 24px;
	box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.composer-input {
	width: 100%;
	min-height: 68px;
	max-height: 180px;
	padding: 4px 2px 10px;
	border: none;
	outline: none;
	resize: none;
	background: transparent;
	font-size: 14px;
	line-height: 1.7;
	color: #111827;
	font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

.composer-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.composer-left {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.model-select {
	height: 34px;
	padding: 0 12px;
	border: 1px solid #d8dee6;
	border-radius: 999px;
	background: #f8fafc;
	font-size: 12px;
	color: #1f2937;
	outline: none;
}

.secondary-btn {
	height: 34px;
	padding: 0 12px;
	border: none;
	border-radius: 999px;
	background: transparent;
	font-size: 12px;
	color: #4b5563;
	cursor: pointer;
}

.primary-btn {
	height: 38px;
	min-width: 82px;
	padding: 0 16px;
	border: none;
	border-radius: 999px;
	background: #111827;
	color: #fff;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.model-select:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.composer-tip {
	width: min(760px, 100%);
	margin: 8px auto 0;
	text-align: center;
	font-size: 11px;
	color: #94a3b8;
}

@media (max-width: 960px) {
	.ai-chat-panel.maximized,
	.ai-chat-panel.minimized {
		width: 94vw;
		height: 84vh;
	}

	.chat-notice,
	.chat-row,
	.composer,
	.composer-tip {
		width: calc(100% - 20px);
	}

	.chat-bubble {
		max-width: calc(100% - 56px);
	}

	.chat-empty h3 {
		font-size: 20px;
	}
}

/* 历史对话侧边栏样式 */
.chat-history-sidebar {
	position: absolute;
	left: 0;
	top: 58px;
	bottom: 0;
	z-index: 4;
	width: 200px;
	background: #fafbfc;
	border-right: 1px solid #e8ecf0;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	overflow: hidden;
	opacity: 0;
	transform: translateX(-18px);
	pointer-events: none;
	transition: width 0.26s ease, transform 0.26s ease, opacity 0.22s ease;
}

.chat-history-sidebar:not(.is-open) {
	width: 0;
	border-right-width: 0;
}

.chat-history-sidebar.is-open {
	opacity: 1;
	transform: translateX(0);
	pointer-events: auto;
}

.sidebar-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 12px 10px;
	border-bottom: 1px solid #e8ecf0;
}

.sidebar-title {
	font-size: 13px;
	font-weight: 600;
	color: #374151;
}

.sidebar-close-btn {
	width: 22px;
	height: 22px;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border-radius: 6px;
	transition: background 0.15s;
}

.sidebar-close-btn:hover {
	background: #e9edef;
}

.sidebar-close-btn img {
	width: 14px;
	height: 14px;
}

.sidebar-actions {
	padding: 10px 12px;
}

.new-chat-btn {
	width: 100%;
	height: 36px;
	border: 1px dashed #c9d1d9;
	border-radius: 10px;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	cursor: pointer;
	font-size: 12px;
	color: #4b5563;
	transition: all 0.2s;
}

.new-chat-btn:hover {
	border-color: #8ebcff;
	background: #f0f7ff;
	color: #0066ff;
}

.new-chat-btn img {
	width: 14px;
	height: 14px;
}

.history-list {
	flex: 1;
	overflow-y: auto;
	padding: 6px 8px;
}

.history-list::-webkit-scrollbar {
	width: 4px;
}

.history-list::-webkit-scrollbar-track {
	background: transparent;
}

.history-list::-webkit-scrollbar-thumb {
	background: #d1d5db;
	border-radius: 4px;
}

.history-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 8px;
	border-radius: 10px;
	cursor: pointer;
	transition: background 0.15s;
	position: relative;
	margin-bottom: 2px;
}

.history-item:hover {
	background: #eef2f6;
}

.history-item.active {
	background: #e1eefd;
}

.history-item-icon {
	width: 28px;
	height: 28px;
	border-radius: 8px;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.history-item-icon img {
	width: 16px;
	height: 16px;
}

.history-item-content {
	flex: 1;
	min-width: 0;
}

.history-item-title {
	font-size: 12px;
	color: #374151;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.4;
}

.history-item-time {
	font-size: 10px;
	color: #9ca3af;
	margin-top: 2px;
}

.history-item-delete {
	width: 22px;
	height: 22px;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border-radius: 6px;
	opacity: 0;
	transition: all 0.15s;
	position: absolute;
	right: 6px;
	top: 50%;
	transform: translateY(-50%);
}

.history-item:hover .history-item-delete {
	opacity: 1;
}

.history-item-delete:hover {
	background: #fee2e2;
}

.history-item-delete img {
	width: 12px;
	height: 12px;
}

.history-empty {
	padding: 24px 12px;
	text-align: center;
	font-size: 12px;
	color: #9ca3af;
}

/* 响应式适配 */
@media (max-width: 768px) {
	.chat-history-sidebar {
		top: 58px;
		z-index: 10;
		width: 260px;
		box-shadow: 4px 0 20px rgba(0, 0, 0, 0.12);
	}

	.chat-history-sidebar:not(.is-open) {
		width: 0;
	}

	.chat-history-sidebar.is-open {
		width: 260px;
	}

	.ai-chat-panel.sidebar-open .ai-chat-main {
		padding-left: 0;
	}
}
</style>
