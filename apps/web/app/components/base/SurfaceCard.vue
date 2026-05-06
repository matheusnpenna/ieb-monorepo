<script setup lang="ts">
import UiPanel from '../ui/UiPanel.vue';
withDefaults(
  defineProps<{
    as?: string
  }>(),
  {
    as: 'section'
  }
)
</script>

<template>
  <UiPanel :as="as">
    <slot />
  </UiPanel>
</template>
