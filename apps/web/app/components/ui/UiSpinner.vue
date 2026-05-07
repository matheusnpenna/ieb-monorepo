<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    tone?: 'accent' | 'neutral' | 'light'
    label?: string
  }>(),
  {
    size: 'md',
    tone: 'accent',
    label: 'Carregando'
  }
)

const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'h-4 w-4 border-2'
  }

  if (props.size === 'lg') {
    return 'h-10 w-10 border-[3px]'
  }

  return 'h-6 w-6 border-2'
})

const toneClass = computed(() => {
  if (props.tone === 'neutral') {
    return 'border-white/12 border-t-white/70'
  }

  if (props.tone === 'light') {
    return 'border-white/18 border-t-white'
  }

  return 'border-[rgba(229,9,20,0.16)] border-t-[color:var(--ds-accent-strong)] shadow-[0_0_18px_rgba(229,9,20,0.18)]'
})
</script>

<template>
  <span class="inline-flex items-center gap-3" role="status" :aria-label="label">
    <span
      aria-hidden="true"
      :class="[
        'inline-block animate-spin rounded-full border-solid',
        sizeClass,
        toneClass
      ]"
    />
    <span class="sr-only">{{ label }}</span>
    <slot />
  </span>
</template>
