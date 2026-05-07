<script setup lang="ts">
import UiPanel from '../ui/UiPanel.vue';
import UiButton from '../ui/UiButton.vue';
defineProps<{
  title: string
  description: string
  badge: string
}>()
</script>

<template>
  <UiPanel tone="hero" padding="lg" class="featured-banner">
    <div class="section-stack">
      <span class="pill w-fit">{{ badge }}</span>
      <h1 class="display-title">{{ title }}</h1>
      <p class="body-copy">{{ description }}</p>
      <div class="button-row">
        <UiButton to="https://www.instagram.com/comunidadevideira/" target="_blank" size="lg">Instagram</UiButton>
        <UiButton to="https://www.youtube.com/@VideiraTV" target="_blank" variant="secondary" size="lg">Youtube</UiButton>
        <UiButton to="https://www.youtube.com/@VideiraTV/podcasts" target="_blank" variant="secondary" size="lg">Podcasts</UiButton>
        <UiButton to="https://www.youtube.com/@VideiraTV/streams" target="_blank" variant="secondary" size="lg">Macros e Celebrações</UiButton>
      </div>
    </div>
  </UiPanel>
</template>

<style scoped>
.featured-banner :deep(.body-copy) {
  color: rgba(245, 245, 241, 0.78);
}
</style>
