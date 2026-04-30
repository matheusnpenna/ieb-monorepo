<script setup lang="ts">
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
