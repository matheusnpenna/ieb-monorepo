<script setup lang="ts">
defineProps<{
  title: string
  description: string
  badge: string
}>()
</script>

<template>
  <SurfaceCard class="featured-banner">
    <div class="section-stack">
      <span class="pill">{{ badge }}</span>
      <h1 class="display-title">{{ title }}</h1>
      <p class="body-copy">{{ description }}</p>
      <div class="button-row">
        <NuxtLink to="/home" class="button-primary">Entrar na plataforma</NuxtLink>
        <NuxtLink to="/login" class="button-secondary">Acessar conta</NuxtLink>
      </div>
    </div>
  </SurfaceCard>
</template>

<style scoped>
.featured-banner {
  padding: 2rem;
  background:
    linear-gradient(140deg, rgba(141, 75, 47, 0.95), rgba(86, 50, 27, 0.9)),
    var(--color-surface);
  color: #fff9f2;
}

.featured-banner :deep(.body-copy) {
  color: rgba(255, 249, 242, 0.82);
}
</style>

