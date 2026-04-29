<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <header class="section-stack">
    <span class="eyebrow">{{ eyebrow }}</span>
    <h1 class="section-title">{{ title }}</h1>
    <p class="body-copy">{{ description }}</p>
  </header>
</template>

