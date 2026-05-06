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
        <UiButton to="/home" size="lg">Entrar na plataforma</UiButton>
        <UiButton to="/login" variant="secondary" size="lg">Acessar conta</UiButton>
      </div>
    </div>
  </UiPanel>
</template>

<style scoped>
.featured-banner :deep(.body-copy) {
  color: rgba(245, 245, 241, 0.78);
}
</style>
