<script setup lang="ts">
defineProps<{
  label: string
  value: string
  detail: string
}>()
</script>

<template>
  <SurfaceCard>
    <div class="section-stack">
      <span class="eyebrow">{{ label }}</span>
      <strong class="metric-value">{{ value }}</strong>
      <p class="body-copy">{{ detail }}</p>
    </div>
  </SurfaceCard>
</template>

<style scoped>
.metric-value {
  font-size: 2rem;
}
</style>

