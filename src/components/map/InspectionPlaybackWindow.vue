<template>
  <el-dialog
    :model-value="modelValue"
    title="巡检轨迹回放"
    width="76vw"
    top="6vh"
    append-to-body
    destroy-on-close
    class="playback-window"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <div v-loading="loading" class="playback-window__body">
      <div class="playback-window__meta">
        <el-descriptions :column="4" border>
          <el-descriptions-item label="线路">{{ route?.routeName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ track?.stats?.durationMinutes || 0 }} 分钟</el-descriptions-item>
          <el-descriptions-item label="里程">{{ track?.stats?.distanceKm || 0 }} km</el-descriptions-item>
          <el-descriptions-item label="问题数">{{ track?.stats?.issueCount || 0 }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="playback-window__viewer">
        <div ref="viewerEl" class="playback-window__canvas"></div>
      </div>

      <div class="playback-window__toolbar">
        <el-button type="primary" @click="emit('toggle')">{{ playing ? '暂停' : '播放' }}</el-button>
        <el-button @click="emit('reset')">重置</el-button>
      </div>

      <el-slider :model-value="progress" :max="max" @input="emit('seek', $event)" />
      <div class="playback-window__progress">当前点位：{{ Math.min(progress + 1, max + 1) }} / {{ max + 1 }}</div>
    </div>
  </el-dialog>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import * as Cesium from 'cesium';

const props = defineProps({
  modelValue: Boolean,
  track: {
    type: Object,
    default: null,
  },
  route: {
    type: Object,
    default: null,
  },
  progress: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 0,
  },
  playing: Boolean,
  loading: Boolean,
});

const emit = defineEmits(['update:modelValue', 'toggle', 'reset', 'seek']);

const viewerEl = ref(null);
let viewer = null;
let dataSource = null;

function toPositions(points = []) {
  return points
    .filter((point) => Number.isFinite(Number(point.lng)) && Number.isFinite(Number(point.lat)))
    .map((point) => Cesium.Cartesian3.fromDegrees(Number(point.lng), Number(point.lat), Number(point.height) || 0));
}

function destroyViewer() {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy();
  }
  viewer = null;
  dataSource = null;
}

function ensureViewer() {
  if (viewer || !viewerEl.value) return;
  viewer = new Cesium.Viewer(viewerEl.value, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    shouldAnimate: true,
  });
  viewer._cesiumWidget._creditContainer.style.display = 'none';
  dataSource = new Cesium.CustomDataSource('inspection-playback-window');
  viewer.dataSources.add(dataSource);
}

function renderTrack() {
  if (!viewer || !dataSource || !props.track || !props.route) return;
  dataSource.entities.removeAll();

  const routePositions = toPositions(props.track.coordinates || props.route.coordinates || []);
  const trackPositions = toPositions(props.track.points || []);
  const currentIndex = Math.max(0, Math.min(props.progress, Math.max(0, trackPositions.length - 1)));

  if (routePositions.length) {
    dataSource.entities.add({
      id: `route-${props.route.id || props.route.routeId || 'base'}`,
      polyline: {
        positions: routePositions,
        width: 5,
        material: Cesium.Color.fromCssColorString('#1e293b').withAlpha(0.85),
      },
    });
  }

  if (trackPositions.length) {
    dataSource.entities.add({
      id: `track-${props.route.id || props.route.routeId || 'all'}`,
      polyline: {
        positions: trackPositions,
        width: 7,
        material: Cesium.Color.fromCssColorString('#7dd3fc').withAlpha(0.35),
      },
    });

    dataSource.entities.add({
      id: `progress-${props.route.id || props.route.routeId || 'progress'}`,
      polyline: {
        positions: trackPositions.slice(0, currentIndex + 1),
        width: 8,
        material: Cesium.Color.fromCssColorString('#22c55e'),
      },
    });

    dataSource.entities.add({
      id: `marker-${props.route.id || props.route.routeId || 'marker'}`,
      position: trackPositions[currentIndex],
      point: {
        pixelSize: 14,
        color: Cesium.Color.fromCssColorString('#22c55e'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
      },
      label: {
        text: `${props.route.routeName} ${currentIndex + 1}/${trackPositions.length}`,
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: new Cesium.Color(0.07, 0.33, 0.16, 0.82),
        pixelOffset: new Cesium.Cartesian2(0, -22),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
    });

    (props.track.issues || []).forEach((issue) => {
      if (!Number.isFinite(Number(issue.lng)) || !Number.isFinite(Number(issue.lat))) return;
      dataSource.entities.add({
        id: issue.id,
        position: Cesium.Cartesian3.fromDegrees(Number(issue.lng), Number(issue.lat), 0),
        billboard: undefined,
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString('#ef4444'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: issue.title || '问题',
          font: '13px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: new Cesium.Color(0.35, 0.08, 0.08, 0.82),
          pixelOffset: new Cesium.Cartesian2(0, -18),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        },
      });
    });

    viewer.zoomTo(
      dataSource.entities,
      new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-42), 0),
    ).catch(() => {});
  } else if (routePositions.length) {
    viewer.zoomTo(
      dataSource.entities,
      new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-42), 0),
    ).catch(() => {});
  }
}

async function openViewer() {
  await nextTick();
  ensureViewer();
  renderTrack();
}

function handleClosed() {
  destroyViewer();
}

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      await openViewer();
    } else {
      destroyViewer();
    }
  }
);

watch(
  () => [props.track, props.route, props.progress],
  async () => {
    if (!props.modelValue) return;
    await openViewer();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  destroyViewer();
});
</script>

<style scoped>
.playback-window__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.playback-window__viewer {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid #dbe5f0;
  background: linear-gradient(180deg, #f8fbff, #eef4fb);
}

.playback-window__canvas {
  width: 100%;
  height: 56vh;
  min-height: 460px;
}

.playback-window__toolbar {
  display: flex;
  gap: 10px;
}

.playback-window__progress {
  color: #64748b;
  font-size: 12px;
}

:deep(.playback-window .el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}
</style>
