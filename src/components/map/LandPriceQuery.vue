<template>
	<!-- 地价查询页功能栏 -->
	<div class="toolbar" v-if="active">
		<button :class="['tool-btn', { active: djcxGongneng }]" @click="$emit('toggle-gongneng')">
			<img class="tool-icon" :src="icons.gongneng" alt="功能" />
		</button>
		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button :class="['tool-btn', { active: activeTool === 'dianxuan' }]" @click="$emit('start-tool', 'dianxuan')">
			<img class="tool-icon" :src="icons.dianxuan" alt="点击查询" />
			<span>点击查询</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'duodian' }]" @click="$emit('start-tool', 'duodian')">
			<img class="tool-icon" :src="icons.duodian" alt="点击查询" />
			<span>多点查询</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'dianPolygon' }]" @click="$emit('start-tool', 'dianPolygon')">
			<img class="tool-icon" :src="icons.dianPolygon" alt="框选查询" />
			<span>框选查询</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'dianCircle' }]" @click="$emit('start-tool', 'dianCircle')">
			<img class="tool-icon" :src="icons.dianCircle" alt="画圆查询" />
			<span>画圆查询</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'dianRect' }]" @click="$emit('start-tool', 'dianRect')">
			<img class="tool-icon" :src="icons.dianRect" alt="矩形查询" />
			<span>矩形查询</span>
		</button>
		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button class="tool-btn" @click="$emit('reset-drawing')">
			<img class="tool-icon" :src="icons.clear" alt="清除" />
			<span>清除所有</span>
		</button>
	</div>

	<div v-if="active && djcxLoading" class="djcx-loading-mask"
		@pointerdown.capture.prevent.stop
		@pointerup.capture.prevent.stop
		@click.capture.prevent.stop
		@contextmenu.capture.prevent.stop>
		<div class="djcx-loading-card">
			<div class="djcx-loading-spinner"></div>
			<div>查询中...</div>
		</div>
	</div>

	<!-- 地价查询功能面板 -->
	<div v-if="active" class="djcx_gongneng" :style="{ left: djcxGongneng ? '10px' : '-500px' }">
		<!-- <div class="card-tabs">
			<button :class="['card-tab', { active: djcxActiveTab === 'tab1' }]"
				@click="$emit('update:djcxActiveTab', 'tab1')">功能显示</button>
			<button :class="['card-tab', { active: djcxActiveTab === 'tab2' }]"
				@click="$emit('update:djcxActiveTab', 'tab2')">区域显示</button>
			<button :class="['card-tab', { active: djcxActiveTab === 'tab3' }]"
				@click="$emit('update:djcxActiveTab', 'tab3')">样本查询</button>
		</div> -->
		<div class="card-content">
			<div class="filter-panel">
				<div class="filter-section">
					<div class="section-header">
						<!-- <span class="section-title highlight">查询树</span> -->
					</div>
					<div v-if="menuTreeLoading" class="tree-loading">加载中...</div>
					<div v-else-if="menuTreeError" class="tree-loading">加载失败</div>
					<div v-else class="tree-children menu-tree">
						<div v-for="n in menuVisibleNodes" :key="n.key" class="tree-node"
							:class="{ 'tree-folder': n.hasChildren }" :style="{ paddingLeft: (12 + n.level * 14) + 'px' }"
							@click="toggleExpand(n)">
							<span class="expand" v-if="n.hasChildren">{{ expanded[n.id] ? '▾' : '▸' }}</span>
							<span class="expand" v-else></span>
							<span class="icon-folder" v-if="n.hasChildren" aria-hidden="true"></span>
							<span class="icon-house" v-else aria-hidden="true"></span>
							<label class="tree-check">
								<input type="checkbox" :checked="checked[n.id]" @click.stop @change.stop="onCheckNode(n.id, $event)" />
								<span class="item-label">{{ n.label }}</span>
							</label>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 地价查询结果列表 -->
	<!-- <div class="list" v-if="active" :style="{ left: djcxGongneng ? '300px' : '10px' }">
		<div :class="['list-item', { 'list-item-active': listItem === index }]" v-for="(item, index) in list"
			:key="item.name" @click="$emit('click-list-item', item, index)">
			{{ item.name }}
			<div v-if="item.childList.length > 0 && listItem === index" class="child-list">
				<div :class="['list-item', { 'list-item-active': childItem === idx }]" class="list-item"
					v-for="(child, idx) in item.childList" :key="child.name"
					@click.stop="$emit('click-child-item', child, idx)">
					{{ child.name }}
				</div>
			</div>
		</div>
	</div> -->

	<!-- 要素信息面板 -->
	<div v-if="showInfoPanel && active">
		<transition name="info-panel-pop">
			<div v-if="!infoMinimized" class="info-panel" :style="infoPanelStyle">
				<div class="info-header">
					<h3>要素信息</h3>
					<div class="info-actions">
						<button @click="minimizeInfo" class="min-btn">—</button>
						<button @click="closeInfo" class="close-btn">×</button>
					</div>
				</div>
				<div class="info-content">
					<div v-if="infoIsTable" class="info-section info-section-table">
						<div class="info-table-wrap">
							<table class="info-table">
								<thead>
									<tr>
										<th v-for="col in infoTable.columns" :key="col">{{ col }}</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(row, idx) in infoTable.rows" :key="idx">
										<td v-for="col in infoTable.columns" :key="col">{{ formatCell(row?.[col]) }}</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<div v-else-if="clickInfo.coordinates" class="info-section">
						<h4>坐标信息</h4>
						<p><strong>经度:</strong> {{ clickInfo.coordinates.longitude.toFixed(6) }}°</p>
						<p><strong>纬度:</strong> {{ clickInfo.coordinates.latitude.toFixed(6) }}°</p>
						<p><strong>高度:</strong> {{ clickInfo.coordinates.height.toFixed(2) }}m</p>
					</div>

					<div v-if="!infoIsTable && Object.keys(clickInfo.properties).length > 0" class="info-section">
						<h4>属性信息</h4>
						<div v-for="(value, key) in clickInfo.properties" :key="key" class="property-item">
							<strong>{{ key }}:</strong> {{ value }}
						</div>
					</div>

					<div v-if="!infoIsTable && Object.keys(clickInfo.properties).length === 0" class="info-section">
						<p>该要素暂无属性信息</p>
					</div>
				</div>
			</div>
		</transition>

		<transition name="info-float-pop">
			<div v-if="infoMinimized" class="info-float" :class="[infoDock.side, { dragging: infoFloatDrag.active, snapped: infoFloatSnapped }]"
				:style="infoFloatStyle" @pointerdown.prevent="onFloatPointerDown">
				<img class="info-float-icon" :src="textIcon" alt="" draggable="false" />
			</div>
		</transition>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { getMenuTreeList, getFeaturesByNodeIdAsync } from '../../api/map';

const props = defineProps({
	active: Boolean,
	icons: Object,
	activeTool: String,
	djcxGongneng: Boolean,
	djcxLoading: Boolean,
	djcxActiveTab: String,
	djcxTab1: Object,
	djcxTab2: Object,
	djcxTab3: Object,
	list: Array,
	listItem: Number,
	childItem: Number,
	showInfoPanel: Boolean,
	clickInfo: Object,
});

const emit = defineEmits([
	'toggle-gongneng', 'start-tool', 'reset-drawing', 'update:djcxActiveTab',
	'set-group-items', 'toggle-folder', 'click-list-item', 'click-child-item', 'close-info',
	'check-menu-node',
	'node-features-change'
]);

const menuTreeFlat = ref([]);
const menuTreeLoaded = ref(false);
const menuTreeLoading = ref(false);
const menuTreeError = ref(false);
const expanded = reactive({});
const checked = reactive({});

const textIcon = new URL('../../assets/文本.png', import.meta.url).href;
const infoMinimized = ref(false);
const infoDock = reactive({ side: 'right', top: 120 });
const infoDockOrigin = reactive({ side: 'right', top: 120 });
const infoFloat = reactive({ x: 0, y: 120 });
const infoFloatSnapped = ref(true);
const infoFloatDrag = reactive({ active: false, pointerId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0, moved: false });
const infoFloatSize = 46;
const infoFloatDockWidth = 76;
const infoFloatMargin = 0;
const infoFloatTopMin = 60;

const infoTable = computed(() => props.clickInfo?.table || null);
const infoIsTable = computed(() => Array.isArray(infoTable.value?.rows) && infoTable.value.rows.length >= 1 && Array.isArray(infoTable.value?.columns) && infoTable.value.columns.length >= 3);

const infoPanelStyle = computed(() => {
	if (infoIsTable.value) {
		return {
			top: '120px',
			left: '50%',
			right: 'auto',
			width: 'min(1400px, calc(100vw - 40px))',
			height: 'min(75vh, calc(100vh - 160px))',
			maxHeight: 'min(75vh, calc(100vh - 160px))',
			'--info-panel-base-transform': 'translateX(-50%)',
		};
	}
	const top = Number(infoDock.top) || 120;
	return {
		top: `${top}px`,
		left: infoDock.side === 'left' ? '20px' : 'auto',
		right: infoDock.side === 'right' ? '20px' : 'auto',
		'--info-panel-base-transform': 'translateX(0px)',
	};
});

const infoFloatStyle = computed(() => ({
	left: `${infoFloat.x}px`,
	top: `${infoFloat.y}px`,
}));

function clampNumber(v, min, max) {
	const n = Number(v);
	if (!Number.isFinite(n)) return min;
	return Math.min(max, Math.max(min, n));
}

function formatCell(v) {
	if (v == null || v === '') return '-';
	if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
	try { return JSON.stringify(v); } catch { return String(v); }
}

function syncFloatToDock() {
	const w = window.innerWidth || 0;
	const h = window.innerHeight || 0;
	const floatW = infoFloatSnapped.value ? infoFloatDockWidth : infoFloatSize;
	const x = infoDock.side === 'left' ? infoFloatMargin : Math.max(infoFloatMargin, w - floatW - infoFloatMargin);
	const y = clampNumber(infoDock.top, infoFloatTopMin, Math.max(infoFloatTopMin, h - infoFloatSize - infoFloatMargin));
	infoFloat.x = x;
	infoFloat.y = y;
}

function minimizeInfo() {
	infoDockOrigin.side = infoDock.side;
	infoDockOrigin.top = infoDock.top;
	infoMinimized.value = true;
	infoFloatSnapped.value = true;
	syncFloatToDock();
}

function restoreInfo() {
	infoDock.side = infoDockOrigin.side;
	infoDock.top = infoDockOrigin.top;
	infoMinimized.value = false;
}

function closeInfo() {
	infoMinimized.value = false;
	emit('close-info');
}

function onFloatPointerMove(e) {
	if (!infoFloatDrag.active) return;
	if (infoFloatDrag.pointerId != null && e.pointerId !== infoFloatDrag.pointerId) return;
	const w = window.innerWidth || 0;
	const h = window.innerHeight || 0;
	const nextLeft = infoFloatDrag.startLeft + (e.clientX - infoFloatDrag.startX);
	const nextTop = infoFloatDrag.startTop + (e.clientY - infoFloatDrag.startY);
	const left = clampNumber(nextLeft, infoFloatMargin, Math.max(infoFloatMargin, w - infoFloatSize - infoFloatMargin));
	const top = clampNumber(nextTop, infoFloatTopMin, Math.max(infoFloatTopMin, h - infoFloatSize - infoFloatMargin));
	infoFloat.x = left;
	infoFloat.y = top;
	if (!infoFloatDrag.moved) {
		const dx = Math.abs(e.clientX - infoFloatDrag.startX);
		const dy = Math.abs(e.clientY - infoFloatDrag.startY);
		if (dx + dy >= 4) infoFloatDrag.moved = true;
	}
}

function onFloatPointerUp(e) {
	if (!infoFloatDrag.active) return;
	if (infoFloatDrag.pointerId != null && e.pointerId !== infoFloatDrag.pointerId) return;
	infoFloatDrag.active = false;
	infoFloatDrag.pointerId = null;
	window.removeEventListener('pointermove', onFloatPointerMove);
	window.removeEventListener('pointerup', onFloatPointerUp);

	const w = window.innerWidth || 0;
	const snapLeft = infoFloat.x + infoFloatSize / 2 < w / 2;
	infoDock.side = snapLeft ? 'left' : 'right';
	infoDock.top = infoFloat.y;
	infoFloatSnapped.value = true;
	syncFloatToDock();

	if (!infoFloatDrag.moved) restoreInfo();
}

function onFloatPointerDown(e) {
	if (!infoMinimized.value) return;
	const target = e.currentTarget;
	try { target.setPointerCapture(e.pointerId); } catch {}
	infoFloatDrag.active = true;
	infoFloatSnapped.value = false;
	infoFloatDrag.pointerId = e.pointerId;
	infoFloatDrag.startX = e.clientX;
	infoFloatDrag.startY = e.clientY;
	infoFloatDrag.startLeft = infoFloat.x;
	infoFloatDrag.startTop = infoFloat.y;
	infoFloatDrag.moved = false;
	window.addEventListener('pointermove', onFloatPointerMove, { passive: true });
	window.addEventListener('pointerup', onFloatPointerUp, { passive: true });
}

function onResize() {
	if (infoMinimized.value) syncFloatToDock();
}

onMounted(() => {
	infoDockOrigin.side = infoDock.side;
	infoDockOrigin.top = infoDock.top;
	syncFloatToDock();
	window.addEventListener('resize', onResize, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', onResize);
	window.removeEventListener('pointermove', onFloatPointerMove);
	window.removeEventListener('pointerup', onFloatPointerUp);
});

watch(
	() => props.showInfoPanel,
	(v) => { if (!v) infoMinimized.value = false; }
);

watch(
	() => props.clickInfo,
	() => {
		if (!props.showInfoPanel) return;
		if (props.activeTool === 'duodian' && infoMinimized.value) return;
		restoreInfo();
	},
	{ deep: true }
);

const childrenByParentId = computed(() => {
	const list = Array.isArray(menuTreeFlat.value) ? menuTreeFlat.value : [];
	const map = new Map();
	list.forEach((it) => {
		if (!it || it.id == null) return;
		const pid = String(it.parentId ?? 0);
		const id = String(it.id);
		const arr = map.get(pid);
		if (arr) arr.push(id);
		else map.set(pid, [id]);
	});
	return map;
});

function setDescendantsChecked(parentId, value) {
	const stack = [String(parentId)];
	while (stack.length) {
		const cur = stack.pop();
		const children = childrenByParentId.value.get(String(cur)) || [];
		children.forEach((cid) => {
			checked[cid] = value;
			stack.push(cid);
		});
	}
}

async function onCheckNode(id, e) {
	const next = Boolean(e?.target?.checked);
	checked[String(id)] = next;
	setDescendantsChecked(id, next);
	emit('check-menu-node', String(id));
	if (!next) {
		emit('node-features-change', { id: String(id), checked: false, records: [] });
		return;
	}
	try {
		const res = await getFeaturesByNodeIdAsync(String(id));
		const list = Array.isArray(res) ? res : (res?.data || res?.list || []);
		emit('node-features-change', { id: String(id), checked: next, records: Array.isArray(list) ? list : [] });
	} catch (err) {
		console.error(err);
		emit('node-features-change', { id: String(id), checked: next, records: [], error: err });
	}
}

const menuTreeRoots = computed(() => {
	const list = Array.isArray(menuTreeFlat.value) ? menuTreeFlat.value : [];
	const map = new Map();
	list.forEach((it) => {
		if (!it || it.id == null) return;
		map.set(String(it.id), { ...it, id: String(it.id), parentId: String(it.parentId ?? 0), children: [] });
	});
	const roots = [];
	for (const node of map.values()) {
		const pid = String(node.parentId ?? '0');
		const parent = map.get(pid);
		if (!pid || pid === '0' || !parent) {
			roots.push(node);
		} else {
			parent.children.push(node);
		}
	}
	const sortRec = (arr) => {
		arr.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
		arr.forEach((n) => {
			if (Array.isArray(n.children) && n.children.length) sortRec(n.children);
		});
	};
	sortRec(roots);
	return roots;
});

const menuVisibleNodes = computed(() => {
	const out = [];
	const walk = (nodes, level) => {
		if (!Array.isArray(nodes)) return;
		nodes.forEach((raw, idx) => {
			const id = String(raw.id ?? `${level}-${idx}`);
			const label = raw.name ?? raw.title ?? raw.label ?? String(id);
			const children = Array.isArray(raw.children) ? raw.children : [];
			const hasChildren = raw.isFolder === true ? children.length > 0 : children.length > 0;
			out.push({
				key: `${id}-${level}-${idx}`,
				id,
				label,
				level,
				hasChildren,
				raw,
			});
			if (hasChildren && expanded[id]) walk(children, level + 1);
		});
	};
	walk(menuTreeRoots.value, 0);
	return out;
});

function toggleExpand(n) {
	if (!n?.hasChildren) return;
	expanded[n.id] = !expanded[n.id];
}

watch(
	() => props.active,
	async (val) => {
		if (!val || menuTreeLoaded.value) return;
		menuTreeLoading.value = true;
		menuTreeError.value = false;
		try {
			const data = await getMenuTreeList();
			const list = Array.isArray(data) ? data : (data?.data || data?.list || []);
			menuTreeFlat.value = Array.isArray(list) ? list : [];
			menuTreeFlat.value.forEach((it) => {
				if (!it || it.id == null) return;
				const id = String(it.id);
				if (expanded[id] == null) expanded[id] = true;
				if (checked[id] == null) checked[id] = Boolean(it.isChecked);
			});
			menuTreeLoaded.value = true;
		} catch (e) {
			menuTreeFlat.value = [];
			menuTreeError.value = true;
			menuTreeLoaded.value = true;
		} finally {
			menuTreeLoading.value = false;
		}
	},
	{ immediate: true }
);

</script>

<style scoped>
.djcx-loading-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.25);
	backdrop-filter: blur(2px);
	z-index: 3000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.djcx-loading-card {
	background: #fff;
	border: 1px solid #e2e8f0;
	border-radius: 14px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
	padding: 18px 20px;
	display: flex;
	align-items: center;
	gap: 12px;
	color: #0f172a;
	font-size: 14px;
}

.djcx-loading-spinner {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 2px solid #e2e8f0;
	border-top-color: #0f172a;
	animation: djcxSpin 0.9s linear infinite;
}

@keyframes djcxSpin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

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

.djcx_gongneng {
	position: absolute;
	top: 120px;
	width: 380px;
	height: calc(100vh - 150px);
	background: #fff;
	box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
	z-index: 3;
	transition: left 0.3s ease;
	display: flex;
	flex-direction: column;
	border-radius: 12px;
	overflow: hidden;
}

.card-tabs {
	display: flex;
	border-bottom: 1px solid #e0e3e6;
}

.card-tab {
	flex: 1;
	padding: 12px;
	border: none;
	background: #f8fafc;
	cursor: pointer;
	font-size: 13px;
	color: #64748b;
}

.card-tab.active {
	background: #fff;
	color: #0f172a;
	font-weight: 600;
	border-bottom: 2px solid #3b82f6;
}

.card-content {
	flex: 1;
	overflow-y: auto;
	padding: 22px 16px;
}

.filter-section {
	margin-bottom: 20px;
}

.section-header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 10px;
	cursor: pointer;
}

.section-title {
	font-size: 14px;
	font-weight: 600;
	color: #1e293b;
}

.section-items {
	list-style: none;
	padding: 0;
	margin: 0 0 0 24px;
}

.section-items li {
	margin-bottom: 8px;
}

.section-items label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	color: #475569;
	cursor: pointer;
}

.tree-panel {
	user-select: none;
}

.tree-loading {
	padding: 10px 0;
	font-size: 13px;
	color: #64748b;
}

.tree-node {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 0;
	cursor: pointer;
	font-size: 13px;
	color: #334155;
}

.tree-children {
	margin-left: 18px;
}

.menu-tree {
	margin-left: 0;
}

.tree-check {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
}

.form-panel {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.form-row {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.form-label {
	font-size: 12px;
	color: #64748b;
}

.form-input {
	height: 32px;
	border: 1px solid #e2e8f0;
	border-radius: 4px;
	padding: 0 8px;
	font-size: 13px;
	outline: none;
}

.form-textarea {
	height: 60px;
	border: 1px solid #e2e8f0;
	border-radius: 4px;
	padding: 6px 8px;
	font-size: 13px;
	outline: none;
	resize: none;
}

.list {
	position: absolute;
	top: 110px;
	width: 200px;
	background: rgba(255, 255, 255, 0.9);
	border-radius: 4px;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	z-index: 2;
	transition: left 0.3s ease;
}

.list-item {
	padding: 10px 15px;
	cursor: pointer;
	font-size: 14px;
	color: #333;
	border-bottom: 1px solid #eee;
}

.list-item:hover {
	background: #f0f7ff;
}

.list-item-active {
	background: #e6f7ff;
	color: #1890ff;
	font-weight: 600;
}

.child-list {
	margin-top: 8px;
	border-top: 1px solid #eee;
}

.info-panel {
	position: fixed;
	width: 400px;
	height: calc(100vh - 190px);
	max-height: calc(100vh - 150px);
	background: #fff;
	color: #0f172a;
	border-radius: 12px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
	z-index: 1000;
	overflow: hidden;
	border: 1px solid #e2e8f0;
	display: flex;
	flex-direction: column;
	transform: var(--info-panel-base-transform, translateX(0px));
}

.info-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px 20px;
	background: #f8fafc;
	border-bottom: 1px solid #e2e8f0;
}

.info-actions {
	display: flex;
	gap: 8px;
	align-items: center;
}

.min-btn {
	background: none;
	border: none;
	font-size: 18px;
	color: #334155;
	cursor: pointer;
	padding: 0;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: all 0.2s ease;
	background: #f1f5f9;
	line-height: 1;
}

.min-btn:hover {
	background: #e2e8f0;
	color: #0f172a;
}

.info-header h3 {
	margin: 0;
	font-size: 18px;
	color: #0f172a;
	font-weight: 600;
}

.close-btn {
	background: none;
	border: none;
	font-size: 24px;
	color: #334155;
	cursor: pointer;
	padding: 0;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: all 0.2s ease;
	background: #f1f5f9;
}

.close-btn:hover {
	background: #e2e8f0;
	color: #0f172a;
}

.info-content {
	padding: 20px;
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

.info-table-wrap {
	width: 100%;
	overflow: auto;
	height: 100%;
	max-height: 100%;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
}

.info-section-table {
	height: 100%;
	min-height: 0;
	margin-bottom: 0;
}

.info-table {
	width: max-content;
	min-width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	font-size: 13px;
	color: #334155;
	white-space: nowrap;
}

.info-table th,
.info-table td {
	padding: 10px 12px;
	border-bottom: 1px solid #e2e8f0;
	border-right: 1px solid #e2e8f0;
	text-align: left;
	vertical-align: top;
}

.info-table th:last-child,
.info-table td:last-child {
	border-right: none;
}

.info-table thead th {
	position: sticky;
	top: 0;
	background: #f8fafc;
	color: #0f172a;
	font-weight: 600;
	z-index: 1;
}

.info-table tbody tr:nth-child(even) td {
	background: #f8fafc;
}

.info-table tbody tr:nth-child(odd) td {
	background: #fff;
}

.info-table tbody tr:last-child td {
	border-bottom: none;
}

.info-table tbody tr:hover td {
	background: #eef2f7;
}

.info-section {
	margin-bottom: 20px;
}

.info-section h4 {
	margin: 0 0 10px 0;
	font-size: 16px;
	color: #0f172a;
	font-weight: 600;
	border-bottom: 1px solid #e2e8f0;
	padding-bottom: 5px;
}

.info-section p {
	margin: 8px 0;
	font-size: 14px;
	color: #334155;
	line-height: 1.5;
}

.property-item {
	padding: 8px 0;
	border-bottom: 1px solid #e2e8f0;
	font-size: 14px;
	color: #334155;
	line-height: 1.4;
}

.property-item strong {
	color: #0f172a;
	margin-right: 8px;
	display: inline-block;
	min-width: 80px;
}

.info-float {
	position: fixed;
	width: 46px;
	height: 46px;
	border-radius: 50%;
	background: #fff;
	border: 1px solid #e2e8f0;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
	z-index: 1001;
	display: flex;
	align-items: center;
	justify-content: center;
	touch-action: none;
	user-select: none;
	cursor: grab;
	transition: left 0.22s ease, top 0.22s ease, width 0.22s ease, border-radius 0.22s ease;
}

.info-float:active {
	cursor: grabbing;
}

.info-float.dragging {
	transition: none;
}

.info-float.snapped {
	width: 76px;
}

.info-float.left.snapped {
	border-radius: 0 999px 999px 0;
}

.info-float.right.snapped {
	border-radius: 999px 0 0 999px;
}

.info-float-icon {
	width: 28px;
	height: 28px;
	object-fit: contain;
}

.info-panel-pop-enter-active,
.info-panel-pop-leave-active {
	transition: opacity 0.22s ease, transform 0.22s ease;
}

.info-panel-pop-enter-from,
.info-panel-pop-leave-to {
	opacity: 0;
	transform: var(--info-panel-base-transform, translateX(0px)) scale(0.98);
}

.info-panel-pop-enter-to,
.info-panel-pop-leave-from {
	opacity: 1;
	transform: var(--info-panel-base-transform, translateX(0px)) scale(1);
}

.info-float-pop-enter-active,
.info-float-pop-leave-active {
	transition: opacity 0.18s ease, transform 0.18s ease;
}

.info-float-pop-enter-from,
.info-float-pop-leave-to {
	opacity: 0;
	transform: scale(0.9);
}

.info-float-pop-enter-to,
.info-float-pop-leave-from {
	opacity: 1;
	transform: scale(1);
}
</style>
