<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <header class="grid gap-5">
    <span class="eyebrow">{{ eyebrow }}</span>
    <h1 class="section-title max-w-[15ch]">{{ title }}</h1>
    <p class="body-copy max-w-[68ch]">{{ description }}</p>
  </header>
</template>
