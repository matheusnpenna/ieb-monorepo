<script setup lang="ts">
import SurfaceCard from '../base/SurfaceCard.vue';
defineProps<{
  label: string
  value: string
  detail: string
}>()
</script>

<template>
  <SurfaceCard>
    <div class="section-stack metric-card">
      <span class="eyebrow">{{ label }}</span>
      <strong class="metric-value">{{ value }}</strong>
      <p class="body-copy">{{ detail }}</p>
    </div>
  </SurfaceCard>
</template>

<style scoped>
.metric-value {
  font-size: 1.5rem;
}

.metric-card {
  gap: .1rem;
}
</style>

