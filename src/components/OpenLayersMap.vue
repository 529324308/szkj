<template>
  <CesiumMap
    map-engine="openlayers"
    :device-profile="deviceProfile"
    :home-active="homeActive"
    @ready="emit('ready', $event)"
    @logout="emit('logout')"
  />
</template>

<script setup>
import CesiumMap from './CesiumMap.vue';

defineProps({
  deviceProfile: {
    type: Object,
    default: null,
  },
  homeActive: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['logout', 'ready']);
</script>
