<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <SurfaceCard class="auth-shell">
    <div class="section-stack">
      <BrandMark />
      <div class="section-stack">
        <h1 class="section-title">{{ title }}</h1>
        <p class="body-copy">{{ subtitle }}</p>
      </div>
      <slot />
    </div>
  </SurfaceCard>
</template>

<style scoped>
.auth-shell {
  width: min(100%, 520px);
}
</style>

