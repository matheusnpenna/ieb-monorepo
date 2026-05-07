<script setup lang="ts">
import UiPanel from '../ui/UiPanel.vue';
import UiButton from '../ui/UiButton.vue';
const props = withDefaults(
  defineProps<{
    title: string
    description: string
    badge: string
    actions?: Array<{
      label: string
      to: string
      target?: string
      variant?: typeof UiButton.props.variant
    }>
  }>(), 
  {
    actions: () => []
  }
)
</script>

<template>
  <UiPanel tone="hero" padding="lg" class="featured-banner">
    <div class="section-stack">
      <span class="pill w-fit">{{ badge }}</span>
      <h1 class="display-title">{{ title }}</h1>
      <p class="body-copy">{{ description }}</p>
      <div class="button-row">
        <UiButton
          v-for="action in actions"
          :key="action.to"
          :to="action.to"
          :target="action.target"
          :variant="action.variant"
          size="lg"
        >
          {{ action.label }}
        </UiButton>
      </div>
    </div>
  </UiPanel>
</template>

<style scoped>
.featured-banner :deep(.body-copy) {
  color: rgba(245, 245, 241, 0.78);
}
</style>
