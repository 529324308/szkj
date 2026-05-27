<template>
	<!-- 首页功能栏 -->
	<div class="toolbar" v-if="active">
		<button :class="['tool-btn', { active: activeTool === 'drawLine' }]" @click="emitTool('drawLine')">
			<img class="tool-icon" :src="icons.drawLine" alt="画线" />
			<span>画线</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawPolygon' }]" @click="emitTool('drawPolygon')">
			<img class="tool-icon" :src="icons.drawPolygon" alt="画多边形" />
			<span>画多边形</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawCircle' }]" @click="emitTool('drawCircle')">
			<img class="tool-icon" :src="icons.drawCircle" alt="画圆" />
			<span>画圆</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawRect' }]" @click="emitTool('drawRect')">
			<img class="tool-icon" :src="icons.drawRect" alt="矩形" />
			<span>矩形</span>
		</button>
		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button :class="['tool-btn', { active: activeTool === 'measureDistance' }]"
			@click="emitTool('measureDistance')">
			<img class="tool-icon" :src="icons.measureDistance" alt="测距" />
			<span>测距</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureArea' }]" @click="emitTool('measureArea')">
			<img class="tool-icon" :src="icons.measureArea" alt="测面积" />
			<span>测面积</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureVolume' }]"
			@click="emitTool('measureVolume')">
			<img class="tool-icon" :src="icons.measureVolume" alt="测方量" />
			<span>测方量</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureAzimuth' }]"
			@click="emitTool('measureAzimuth')">
			<img class="tool-icon" :src="icons.measureAzimuth" alt="测方位角" />
			<span>测方位角</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureAngle' }]" @click="emitTool('measureAngle')">
			<img class="tool-icon" :src="icons.measureAngle" alt="测夹角" />
			<span>测夹角</span>
		</button>

		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button class="tool-btn" @click="$emit('clear-all')">
			<img class="tool-icon" :src="icons.dixing" alt="添加地形" />
			<span>添加地形</span>
		</button>
		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button class="tool-btn" @click="$emit('clear-all')">
			<img class="tool-icon" :src="icons.clear" alt="清除" />
			<span>清除所有</span>
		</button>
	</div>

	<!-- 测绘信息面板 -->
	<div v-if="measurePanelVisible && active" class="measure-panel">
		<div class="measure-header">
			<div class="tabs">
				<span class="tab" :class="{ active: measureActiveTab === 'info' }"
					@click="$emit('update:measureActiveTab', 'info')">信息</span>
				<span class="tab" :class="{ active: measureActiveTab === 'data' }"
					@click="$emit('update:measureActiveTab', 'data')">数据</span>
			</div>
			<button class="close-btn" @click="$emit('update:measurePanelVisible', false)">×</button>
		</div>
		<div class="measure-body">
			<template v-if="measureActiveTab === 'info'">
				<input class="input" v-model="measureForm.name" placeholder="点击输入名称" />
				<div class="result-box">
					<div class="result-line">
						<span class="badge">长度</span>
						<div class="value">{{ formattedLength }}</div>
						<div class="unit">{{ unitLabel }}</div>
						<span class="divider" v-if="hasArea"></span>
						<template v-if="hasArea">
							<span class="badge" style="background:#20b36e">面积</span>
							<div class="value">{{ formattedArea }}</div>
							<div class="unit">{{ areaUnitLabel }}</div>
						</template>
					</div>
				</div>
				<div class="row" v-if="hasArea">
					<label>高度</label>
					<input type="number" class="input" v-model.number="measureForm.heightMeters" min="0" step="0.1"
						placeholder="请输入高度（米）" />
				</div>
				<div class="result-box" v-if="hasVolume">
					<div class="result-line">
						<span class="badge" style="background:#409eff">方量</span>
						<div class="value">{{ formattedVolume }}</div>
						<div class="unit">{{ volumeUnitLabel }}</div>
					</div>
				</div>
				<div class="row">
					<label>长度单位</label>
					<select v-model="measureForm.unit" class="select">
						<option value="auto">跟随地图设置(千米,米)</option>
						<option value="m">米</option>
						<option value="km">千米</option>
					</select>
				</div>
				<textarea class="textarea" v-model="measureForm.desc" placeholder="请输入描述"></textarea>
			</template>

			<template v-else>
				<div class="data-toolbar">
					<button class="copy-btn" @click="$emit('copy-all')">一键复制</button>
					<button class="copy-btn" @click="$emit('copy-coords')">仅复制坐标</button>
				</div>
				<div class="data-scroll">
					<table class="data-table">
						<thead>
							<tr>
								<th class="data-index"></th>
								<th class="data-th">经度</th>
								<th class="data-th">纬度</th>
								<th class="data-th">线段距离</th>
								<th class="data-th">累计距离</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(p, i) in lastMeasure.points" :key="i">
								<td class="data-index">{{ i }}</td>
								<td class="data-td">
									<div class="data-cell">{{ Number(p.lon).toFixed(12) }}</div>
								</td>
								<td class="data-td">
									<div class="data-cell">{{ Number(p.lat).toFixed(12) }}</div>
								</td>
								<td class="data-td">
									<div class="data-cell">{{ i === 0 ? '-' : formatMeters(lastMeasure.segmentsMeters[i]) }}</div>
								</td>
								<td class="data-td">
									<div class="data-cell">{{ formatMeters(lastMeasure.cumulativeMeters[i]) }}</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</template>
		</div>
		<div class="measure-footer">
			<button class="ghost" @click="$emit('delete-current')">删除</button>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	active: Boolean,
	activeTool: String,
	icons: Object,
	measurePanelVisible: Boolean,
	measureActiveTab: String,
	measureForm: Object,
	lastMeasure: Object,
});

const emit = defineEmits(['start-tool', 'clear-all', 'update:measurePanelVisible', 'update:measureActiveTab', 'copy-all', 'copy-coords', 'delete-current']);

const formattedLength = computed(() => {
	const m = props.measureForm.lengthMeters;
	const useKm = props.measureForm.unit === 'km' || (props.measureForm.unit === 'auto' && m >= 1000);
	return useKm ? (m / 1000).toFixed(2) : m.toFixed(2);
});

const unitLabel = computed(() => {
	const m = props.measureForm.lengthMeters;
	const useKm = props.measureForm.unit === 'km' || (props.measureForm.unit === 'auto' && m >= 1000);
	return useKm ? '千米' : '米';
});

const formattedArea = computed(() => {
	const a = props.measureForm.areaSqMeters;
	if (!a || a < 0) return '0.00';
	return a >= 1e6 ? (a / 1e6).toFixed(2) : a.toFixed(2);
});

const areaUnitLabel = computed(() => {
	const a = props.measureForm.areaSqMeters;
	return a >= 1e6 ? '平方千米' : '平方米';
});

const hasArea = computed(() => {
	// 如果是距离测量或方位角/夹角测量，强制不显示面积
	if (['distance', 'azimuth', 'angle'].includes(props.measureForm.kind)) return false;
	return props.measureForm.areaSqMeters > 0;
});

const formattedVolume = computed(() => {
	const v = props.measureForm.volumeCubicMeters;
	if (!v || v < 0) return '0.00';
	return v >= 1e9 ? (v / 1e9).toFixed(2) : v.toFixed(2);
});

const volumeUnitLabel = computed(() => {
	return (props.measureForm.volumeCubicMeters >= 1e9) ? '立方千米' : '立方米';
});

const hasVolume = computed(() => props.measureForm.areaSqMeters > 0 && props.measureForm.heightMeters > 0);

const formatMeters = (m) => {
	const useKm = props.measureForm.unit === 'km' || (props.measureForm.unit === 'auto' && m >= 1000);
	return useKm ? (m / 1000).toFixed(2) : m.toFixed(2);
}

const emitTool = (type) => {
	emit('start-tool', type);
};
</script>

<style scoped lang="scss">
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
	margin-bottom: 2px;
}

.tool-btn span {
	font-size: 11px;
}

.measure-panel {
	position: absolute;
	top: 130px;
	right: 20px;
	width: 420px;
	height: calc(100vh - 205px);
	background: #F0F0F0;
	border-radius: 10px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
	overflow: hidden;
	z-index: 3;
}

.measure-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #f3f5f7;
	padding: 10px 12px;
	border-bottom: 1px solid #e0e3e6;
}

.tabs {
	display: flex;
	gap: 8px;
}

.tab {
	background: #e9edef;
	color: #333;
	padding: 6px 10px;
	border-radius: 6px;
	font-size: 12px;
	cursor: pointer;
}

.tab.active {
	background: #ffffff;
	border: 1px solid #e0e3e6;
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

.measure-body {
	background-color: #fff;
	overflow: auto;
	padding: 14px;
	height: calc(100% - 132px);
}

.input {
	width: 100%;
	height: 36px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 0 10px;
	outline: none;
	box-sizing: border-box;
}

.result-box {
	margin-top: 12px;
	background: #edf3ff;
	border: 1px solid #cfe0ff;
	border-radius: 8px;
	padding: 14px;
}

.result-line {
	display: flex;
	align-items: center;
	gap: 10px;
}

.divider {
	width: 1px;
	height: 24px;
	background: #cfe0ff;
}

.badge {
	background: #4c87ff;
	color: #fff;
	font-size: 10px;
	padding: 2px 8px;
	border-radius: 12px;
}

.value {
	flex: 1;
	font-size: 18px;
	font-weight: 700;
	color: #1b2430;
	text-align: center;
}

.unit {
	font-size: 14px;
	color: #6c757d;
	margin-right: 6px;
}

.row {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-top: 12px;
}

.row label {
	width: 80px;
	color: #333;
	font-size: 13px;
}

.select {
	flex: 1;
	height: 34px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 0 10px;
	background: #fff;
}

.textarea {
	width: 100%;
	height: 80px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 8px 10px;
	outline: none;
	resize: vertical;
	margin-top: 12px;
	box-sizing: border-box;
}

.measure-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 10px 14px;
	border-top: 1px solid #e0e3e6;
	background: #fafbfc;
}

.ghost {
	background: #ffffff;
	border: 1px solid #e0e3e6;
	height: 30px;
	border-radius: 6px;
	padding: 0 10px;
	cursor: pointer;
	color: #333;
	transition: .3s;
}

.ghost:hover {
	background: #ff7676;
	color: #f2f2f2;
}

.data-toolbar {
	display: flex;
	gap: 12px;
	justify-content: flex-start;
	margin-bottom: 10px;
}

.copy-btn {
	background: #ffffff;
	border: 1px solid #5ea2ff;
	color: #2f7cff;
	padding: 6px 12px;
	border-radius: 8px;
	cursor: pointer;
}

.copy-btn:hover {
	background: #f0f6ff;
}

.data-table {
	width: max-content;
	border-collapse: collapse;
	border: 1px solid #e0e3e6;
}

.data-table thead tr {
	background: #f8fafc;
}

.data-th,
.data-td {
	border: 1px solid #e0e3e6;
	padding: 8px;
	text-align: left;
}

.data-index {
	width: 40px;
	text-align: center;
	border: 1px solid #e0e3e6;
}

.data-cell {
	height: 36px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 6px 10px;
	background: #fff;
	display: flex;
	align-items: center;
	white-space: nowrap;
}

.data-scroll {
	max-height: 300px;
	overflow: auto;
	border: 1px solid #e0e3e6;
	border-radius: 8px;
}
</style>
