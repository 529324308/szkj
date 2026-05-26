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
	<div v-if="showInfoPanel && active" class="info-panel">
		<div class="info-header">
			<h3>要素信息</h3>
			<button @click="$emit('close-info')" class="close-btn">×</button>
		</div>
		<div class="info-content">
			<div v-if="clickInfo.coordinates" class="info-section">
				<h4>坐标信息</h4>
				<p><strong>经度:</strong> {{ clickInfo.coordinates.longitude.toFixed(6) }}°</p>
				<p><strong>纬度:</strong> {{ clickInfo.coordinates.latitude.toFixed(6) }}°</p>
				<p><strong>高度:</strong> {{ clickInfo.coordinates.height.toFixed(2) }}m</p>
			</div>

			<div v-if="Object.keys(clickInfo.properties).length > 0" class="info-section">
				<h4>属性信息</h4>
				<div v-for="(value, key) in clickInfo.properties" :key="key" class="property-item">
					<strong>{{ key }}:</strong> {{ value }}
				</div>
			</div>

			<div v-if="Object.keys(clickInfo.properties).length === 0" class="info-section">
				<p>该要素暂无属性信息</p>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { getMenuTreeList, getFeaturesByNodeIdAsync } from '../../api/map';

const props = defineProps({
	active: Boolean,
	icons: Object,
	activeTool: String,
	djcxGongneng: Boolean,
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
	position: absolute;
	top: 130px;
	right: 20px;
	width: 350px;
	max-height: 80vh;
	background-color: #1e2a2cb6;
	color: #fff;
	border-radius: 8px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	z-index: 1000;
	overflow: hidden;
	border: 1px solid #45efff;
}

.info-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px 20px;
	background-color: #1e2a2cb6;
	border-bottom: 1px solid #45efff;
}

.info-header h3 {
	margin: 0;
	font-size: 18px;
	color: #fff;
	font-weight: 600;
}

.close-btn {
	background: none;
	border: none;
	font-size: 24px;
	color: #000;
	cursor: pointer;
	padding: 0;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: all 0.2s ease;
	background-color: #e9e9e9;
}

.close-btn:hover {
	background-color: #6d6d6d;
	color: #fff;
}

.info-content {
	padding: 20px;
	max-height: calc(80vh - 80px);
	overflow-y: auto;
}

.info-section {
	margin-bottom: 20px;
}

.info-section h4 {
	margin: 0 0 10px 0;
	font-size: 16px;
	color: #fff;
	font-weight: 600;
	border-bottom: 1px solid #45efff;
	padding-bottom: 5px;
}

.info-section p {
	margin: 8px 0;
	font-size: 14px;
	color: #fff;
	line-height: 1.5;
}

.property-item {
	padding: 8px 0;
	border-bottom: 1px solid #45efff;
	font-size: 14px;
	color: #fff;
	line-height: 1.4;
}

.property-item strong {
	color: #fff;
	margin-right: 8px;
	display: inline-block;
	min-width: 80px;
}
</style>
