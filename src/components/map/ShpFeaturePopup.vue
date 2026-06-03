<template>
	<div v-if="visible">
		<transition name="shp-info-panel-pop">
			<div
				v-if="!minimized"
				class="shp-feature-panel"
				:style="panelStyle"
			>
				<div class="shp-feature-header" @pointerdown.prevent="$emit('header-pointerdown', $event)">
					<div class="shp-feature-header-main">
						<div class="shp-feature-title">{{ popup.title }}</div>
						<div class="shp-feature-subtitle">{{ popup.subtitle }}</div>
					</div>
					<div class="shp-feature-actions">
						<button
							type="button"
							class="shp-feature-action"
							@pointerdown.stop.prevent
							@click.stop="$emit('minimize')"
						>−</button>
						<button
							type="button"
							class="shp-feature-action close"
							@pointerdown.stop.prevent
							@click.stop="$emit('close')"
						>×</button>
					</div>
				</div>
				<div class="shp-feature-body">
					<div class="shp-feature-section">
						<div class="shp-feature-section-title">基础信息</div>
						<div class="shp-feature-meta-item">
							<span class="shp-feature-meta-key">图层名称</span>
							<span class="shp-feature-meta-value">{{ popup.layerName || '-' }}</span>
						</div>
						<div class="shp-feature-meta-item">
							<span class="shp-feature-meta-key">要素名称</span>
							<span class="shp-feature-meta-value">{{ popup.title || '-' }}</span>
						</div>
						<div class="shp-feature-meta-item">
							<span class="shp-feature-meta-key">几何类型</span>
							<span class="shp-feature-meta-value">{{ popup.geometryType || '-' }}</span>
						</div>
						<div class="shp-feature-meta-item">
							<span class="shp-feature-meta-key">要素序号</span>
							<span class="shp-feature-meta-value">{{ popup.featureIndexDisplay }}</span>
						</div>
						<div class="shp-feature-meta-item">
							<span class="shp-feature-meta-key">来源文件</span>
							<span class="shp-feature-meta-value">{{ popup.sourceFileName || '-' }}</span>
						</div>
					</div>

					<div class="shp-feature-section">
						<div class="shp-feature-section-title">属性信息</div>
						<div v-if="entries.length" class="shp-feature-properties">
							<div v-for="item in entries" :key="item.key" class="shp-feature-property">
								<div class="shp-feature-property-key">{{ item.key }}</div>
								<div class="shp-feature-property-value">{{ item.value }}</div>
							</div>
						</div>
						<div v-else class="shp-feature-empty">该要素暂时没有属性信息</div>
					</div>
				</div>
			</div>
		</transition>

		<transition name="shp-info-float-pop">
			<div
				v-if="minimized"
				class="shp-feature-float"
				:class="[floatDockSide, { dragging: floatDragging, snapped: floatSnapped }]"
				:style="floatStyle"
				@pointerdown.prevent="$emit('float-pointerdown', $event)"
			>
				<img class="shp-feature-float-icon" :src="shpIcon" alt="SHP要素" draggable="false" />
			</div>
		</transition>
	</div>
</template>

<script setup>
defineProps({
	visible: { type: Boolean, default: false },
	minimized: { type: Boolean, default: false },
	popup: { type: Object, required: true },
	entries: { type: Array, default: () => [] },
	panelStyle: { type: Object, default: () => ({}) },
	floatStyle: { type: Object, default: () => ({}) },
	floatDockSide: { type: String, default: 'right' },
	floatDragging: { type: Boolean, default: false },
	floatSnapped: { type: Boolean, default: false },
	shpIcon: { type: String, required: true },
});

defineEmits(['close', 'minimize', 'header-pointerdown', 'float-pointerdown']);
</script>

<style scoped>
.shp-feature-panel {
	position: fixed;
	z-index: 9998;
	background: rgba(255, 255, 255, 0.98);
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
	overflow: hidden;
	display: flex;
	flex-direction: column;
	backdrop-filter: blur(6px);
}

.shp-feature-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 14px;
	background: linear-gradient(90deg, #ff6a3d 0%, #ff855f 100%);
	color: #fff;
	cursor: move;
	user-select: none;
}

.shp-feature-header-main {
	min-width: 0;
}

.shp-feature-title {
	font-size: 15px;
	font-weight: 700;
	line-height: 1.4;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.shp-feature-subtitle {
	margin-top: 2px;
	font-size: 12px;
	opacity: 0.88;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.shp-feature-actions {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.shp-feature-action {
	width: 26px;
	height: 26px;
	border: 0;
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.2);
	color: #fff;
	font-size: 16px;
	cursor: pointer;
	transition: background 0.2s ease;
}

.shp-feature-action:hover {
	background: rgba(255, 255, 255, 0.3);
}

.shp-feature-action.close:hover {
	background: rgba(220, 38, 38, 0.9);
}

.shp-feature-body {
	flex: 1;
	overflow: auto;
	padding: 14px;
	background: #fffaf8;
}

.shp-feature-section + .shp-feature-section {
	margin-top: 16px;
}

.shp-feature-section-title {
	margin-bottom: 10px;
	font-size: 13px;
	font-weight: 700;
	color: #c2410c;
}

.shp-feature-meta-item,
.shp-feature-property {
	display: grid;
	grid-template-columns: 88px minmax(0, 1fr);
	gap: 12px;
	padding: 9px 10px;
	border-radius: 8px;
	background: #fff;
	border: 1px solid #fde6de;
}

.shp-feature-meta-item + .shp-feature-meta-item,
.shp-feature-property + .shp-feature-property {
	margin-top: 8px;
}

.shp-feature-meta-key,
.shp-feature-property-key {
	font-size: 12px;
	font-weight: 700;
	color: #9a3412;
	word-break: break-all;
}

.shp-feature-meta-value,
.shp-feature-property-value {
	font-size: 12px;
	line-height: 1.6;
	color: #374151;
	word-break: break-all;
	white-space: pre-wrap;
}

.shp-feature-empty {
	padding: 18px 12px;
	border-radius: 8px;
	background: #fff;
	border: 1px dashed #fdba74;
	font-size: 12px;
	color: #92400e;
	text-align: center;
}

.shp-feature-float {
	position: fixed;
	width: 46px;
	height: 46px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #ff6a3d 0%, #ff855f 100%);
	border: 1px solid rgba(255, 255, 255, 0.5);
	box-shadow: 0 14px 28px rgba(249, 115, 22, 0.35);
	backdrop-filter: blur(6px);
	cursor: grab;
	z-index: 9999;
	user-select: none;
	transition: left 0.22s ease, top 0.22s ease, width 0.22s ease, border-radius 0.22s ease;
}

.shp-feature-float.dragging {
	transition: none;
}

.shp-feature-float.snapped {
	width: 76px;
}

.shp-feature-float.left.snapped {
	border-radius: 0 999px 999px 0;
}

.shp-feature-float.right.snapped {
	border-radius: 999px 0 0 999px;
}

.shp-feature-float-icon {
	width: 26px;
	height: 26px;
	object-fit: contain;
}

.shp-info-panel-pop-enter-active,
.shp-info-panel-pop-leave-active {
	transition: opacity 0.22s ease, transform 0.22s ease;
}

.shp-info-panel-pop-enter-from,
.shp-info-panel-pop-leave-to {
	opacity: 0;
	transform: scale(0.98);
}

.shp-info-panel-pop-enter-to,
.shp-info-panel-pop-leave-from {
	opacity: 1;
	transform: scale(1);
}

.shp-info-float-pop-enter-active,
.shp-info-float-pop-leave-active {
	transition: opacity 0.18s ease, transform 0.18s ease;
}

.shp-info-float-pop-enter-from,
.shp-info-float-pop-leave-to {
	opacity: 0;
	transform: scale(0.9);
}

.shp-info-float-pop-enter-to,
.shp-info-float-pop-leave-from {
	opacity: 1;
	transform: scale(1);
}
</style>
