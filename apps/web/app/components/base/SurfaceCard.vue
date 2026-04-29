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
  <component :is="as" class="glass-panel surface-card">
    <slot />
  </component>
</template>

<style scoped>
.surface-card {
  padding: 1.35rem;
}
</style>

