<template>
	<!-- 智能分析页功能栏 -->
	<div class="toolbar" v-if="active">
		<button :class="['tool-btn', { active: activeTool === 'ai' }]" style="border:1px solid #409eff;"
			@click="$emit('start-tool', 'ai')">
			<img class="tool-icon" :src="icons.ai" alt="画线" />
			<span>AI对话</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawPolygon' }]" @click="$emit('start-tool', 'drawPolygon')">
			<img class="tool-icon" :src="icons.drawPolygon" alt="画多边形" />
			<span>分析报告</span>
		</button>
	</div>

	<!-- 模拟 AI 对话面板 -->
	<div v-if="aiChatVisible && active" class="ai-chat-panel"
		:class="{ maximized: aiChatMaximized, minimized: !aiChatMaximized, dragging: aiChatDragging && !aiChatMaximized }"
		@click.stop :style="!aiChatMaximized ? { top: aiChatTop + 'px', left: aiChatLeft + 'px' } : null"
		ref="aiChatPanelRef">
		<div class="ai-chat-header" @mousedown="$emit('drag-start', $event)" @touchstart.prevent="$emit('drag-start', $event)">
			<div class="ai-title">
				<img :src="icons.ai" alt="AI" class="ai-avatar" />
				<span>智能AI对话 <span class="ai-model">DeepSeek</span></span>
			</div>
			<div class="ai-actions">
				<button class="size-btn" @click="$emit('toggle-size')" title="尺寸切换" @mousedown.stop @touchstart.stop>
					<img :src="aiChatMaximized ? icons.minimize : icons.maximize" alt="尺寸切换" class="action-icon" />
				</button>
				<button class="ai_close-btn" @click="$emit('close-chat')" title="关闭" @mousedown.stop @touchstart.stop>
					<img :src="icons.close" alt="关闭" class="action-icon" />
				</button>
			</div>
		</div>
		<div class="ai-chat-body" ref="aiChatBodyRef">
			<div v-for="(m, i) in aiChatMessages" :key="i" :class="['ai-msg', m.role]">
				<img v-if="m.role === 'assistant'" :src="icons.ai" alt="助手头像" class="msg-avatar" />
				<div class="ai-bubble">{{ m.text }}</div>
				<img v-if="m.role === 'user'" :src="icons.me" alt="用户头像" class="msg-avatar" />
			</div>
		</div>
		<div class="ai-chat-footer">
			<input class="ai-input" v-model="localInput" placeholder="输入消息，回车发送" @keyup.enter="sendMessage" />
			<button class="send-btn" @click="sendMessage">发送</button>
		</div>
	</div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
	active: Boolean,
	icons: Object,
	activeTool: String,
	aiChatVisible: Boolean,
	aiChatMaximized: Boolean,
	aiChatDragging: Boolean,
	aiChatTop: Number,
	aiChatLeft: Number,
	aiChatMessages: Array,
	aiChatInput: String,
});

const emit = defineEmits(['start-tool', 'drag-start', 'toggle-size', 'close-chat', 'send-message', 'update:aiChatInput']);

const localInput = ref(props.aiChatInput);
const aiChatBodyRef = ref(null);
const aiChatPanelRef = ref(null);

watch(() => props.aiChatInput, (newVal) => {
	localInput.value = newVal;
});

watch(localInput, (newVal) => {
	emit('update:aiChatInput', newVal);
});

const sendMessage = () => {
	emit('send-message');
};

defineExpose({
	aiChatBodyRef,
	aiChatPanelRef
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
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
	transition: background 0.2s;
	min-width: 50px;
}

.tool-btn:hover {
	background: #e9edef;
}

.tool-btn.active {
	background: #e1eefd;
	color: #007bff;
}

.tool-icon {
	width: 20px;
	height: 20px;
}

.ai-chat-panel {
    position: absolute;
    bottom: 110px;
    right: 10px;
    width: 320px;
    background: #ffffff;
    border: 1px solid #d9dee3;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    z-index: 12;
    overflow: hidden;
    transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease, transform 0.25s ease;
}

.ai-chat-panel.maximized {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(1);
    width: 720px;
    max-width: 90vw;
    height: 70vh;
    display: flex;
    flex-direction: column;
}

.ai-chat-panel.minimized {
    position: fixed;
    bottom: auto;
    right: auto;
    transform: translate(0, 0) scale(0.96);
    transform-origin: bottom right;
}

.ai-chat-panel.minimized.dragging {
    box-shadow: 0 0 20px 5px rgba(54, 155, 250, 0.5), 0 8px 20px rgba(0, 0, 0, 1);
    transition: none;
}

.ai-chat-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 10px;
	color: #1f2b3a;
	font-size: 13px;
	border-bottom: 1px solid #e6eaef;
	background: #ffffff;
	cursor: move;
}

.ai-actions {
	display: flex;
	gap: 8px;
}

.size-btn,
.ai_close-btn {
	width: 30px;
	height: 30px;
	background: #ffffff;
	border: 1px solid #cfd5da;
	border-radius: 4px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
}

.action-icon {
	width: 16px;
	height: 16px;
}

.ai-title {
	display: flex;
	align-items: center;
	gap: 8px;
}

.ai-model {
	font-size: 10px;
	color: #88929b;
}

.ai-avatar {
	width: 18px;
	height: 18px;
}

.ai-chat-body {
	max-height: 220px;
	overflow-y: auto;
	padding: 10px;
	flex: 1;
}

.ai-msg {
	margin: 6px 0;
	display: flex;
}

.ai-msg.user {
	justify-content: flex-end;
}

.ai-msg.assistant {
	justify-content: flex-start;
}

.msg-avatar {
	width: 24px;
	height: 24px;
	border-radius: 50%;
}

.ai-bubble {
	max-width: 240px;
	padding: 8px 10px;
	border-radius: 6px;
	font-size: 12px;
	line-height: 1.5;
}

.ai-msg.user .ai-bubble {
	background: #1f8cf0;
	color: #fff;
	margin-left: 8px;
}

.ai-msg.assistant .ai-bubble {
	background: #eef2f7;
	color: #1f2b3a;
	margin-right: 8px;
}

.ai-chat-footer {
	display: flex;
	gap: 8px;
	padding: 8px 10px 10px;
	border-top: 1px solid #cfd5da;
}

.ai-input {
	flex: 1;
	border: 1px solid #cfd5da;
	border-radius: 4px;
	padding: 6px 8px;
	font-size: 12px;
	outline: none;
}

.send-btn {
	background: #1f8cf0;
	color: #fff;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	padding: 6px 12px;
	font-size: 12px;
}
</style>
