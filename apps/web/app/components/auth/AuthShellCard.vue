<script setup lang="ts">
import BrandMark from '../base/BrandMark.vue'
import UiPanel from '../ui/UiPanel.vue';

defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <UiPanel tone="strong" padding="lg" class="w-full max-w-[520px]">
    <div class="grid gap-6">
      <BrandMark />
      <div class="grid gap-4">
        <h1 class="section-title">{{ title }}</h1>
        <p class="body-copy">{{ subtitle }}</p>
      </div>
      <slot />
    </div>
  </UiPanel>
</template>
