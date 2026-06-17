<template>
  <slot :controller="controller"></slot>
</template>

<script setup>
defineProps({
  controller: {
    type: Object,
    default: () => ({}),
  },
});
</script>
