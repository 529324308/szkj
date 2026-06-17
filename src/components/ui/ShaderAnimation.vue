<template>
  <div ref="containerRef" class="shader-animation"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  playOnce: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['complete']);

const SHADER_TIME_STEP = 0.05;
const SHADER_PHASE_SCALE = 0.05;
const SHADER_LINE_RANGE = 5;
const SHADER_LAST_TRAIL_OFFSET = 0.02;
const SHADER_EDGE_MARGIN = 0.015;
const containerRef = ref(null);
let sceneRef = null;
let completed = false;

const vertexShader = `
  void main() {
    gl_Position = vec4( position, 1.0 );
  }
`;

const fragmentShader = `
  #define TWO_PI 6.2831853072
  #define PI 3.14159265359

  precision highp float;
  uniform vec2 resolution;
  uniform float time;

  void main(void) {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
    float t = time*0.05;
    float lineWidth = 0.002;

    vec3 color = vec3(0.0);
    for(int j = 0; j < 3; j++){
      for(int i=0; i < 5; i++){
        color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
      }
    }

    gl_FragColor = vec4(color[0],color[1],color[2],1.0);
  }
`;

onMounted(() => {
  const container = containerRef.value;
  if (!container) return;

  const camera = new THREE.Camera();
  camera.position.z = 1;

  const scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    time: { type: 'f', value: 1.0 },
    resolution: { type: 'v2', value: new THREE.Vector2() },
  };
  const startShaderPhase = uniforms.time.value * SHADER_PHASE_SCALE;
  let cycleCompleteTime = uniforms.time.value + 1;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const onWindowResize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    uniforms.resolution.value.x = renderer.domElement.width;
    uniforms.resolution.value.y = renderer.domElement.height;

    if (props.playOnce) {
      cycleCompleteTime = calculateVisibleSweepEndTime(width, height, startShaderPhase);
    }
  };

  onWindowResize();
  window.addEventListener('resize', onWindowResize, false);

  const animate = () => {
    const animationId = window.requestAnimationFrame(animate);
    const nextTime = uniforms.time.value + SHADER_TIME_STEP;

    if (props.playOnce && nextTime >= cycleCompleteTime) {
      window.cancelAnimationFrame(animationId);
      if (sceneRef) {
        sceneRef.animationId = 0;
      }
      if (!completed) {
        completed = true;
        emit('complete');
      }
      return;
    }

    uniforms.time.value = nextTime;
    renderer.render(scene, camera);

    if (sceneRef) {
      sceneRef.animationId = animationId;
    }
  };

  sceneRef = {
    renderer,
    geometry,
    material,
    animationId: 0,
    onWindowResize,
  };

  animate();
});

function calculateVisibleSweepEndTime(width, height, startShaderPhase) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const minSide = Math.min(safeWidth, safeHeight);
  const maxUvLength = Math.hypot(safeWidth / minSide, safeHeight / minSide);
  const endShaderPhase = (maxUvLength / SHADER_LINE_RANGE) + SHADER_LAST_TRAIL_OFFSET + SHADER_EDGE_MARGIN;

  return Math.max(1, endShaderPhase / SHADER_PHASE_SCALE, (startShaderPhase + SHADER_TIME_STEP) / SHADER_PHASE_SCALE);
}

onBeforeUnmount(() => {
  if (!sceneRef) return;

  window.removeEventListener('resize', sceneRef.onWindowResize);
  window.cancelAnimationFrame(sceneRef.animationId);

  const container = containerRef.value;
  const canvas = sceneRef.renderer.domElement;
  if (container && canvas?.parentNode === container) {
    container.removeChild(canvas);
  }

  sceneRef.renderer.dispose();
  sceneRef.geometry.dispose();
  sceneRef.material.dispose();
  sceneRef = null;
});
</script>

<style scoped>
.shader-animation {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.shader-animation :deep(canvas) {
  display: block;
}
</style>
