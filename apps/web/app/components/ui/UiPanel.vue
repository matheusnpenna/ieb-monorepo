<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    as?: string
    tone?: 'default' | 'strong' | 'hero'
    padding?: 'sm' | 'md' | 'lg'
  }>(),
  {
    as: 'section',
    tone: 'default',
    padding: 'md'
  }
)

const toneClass = computed(() => {
  if (props.tone === 'hero') {
    return 'border-white/14 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.32),transparent_34%),linear-gradient(160deg,rgba(34,34,34,0.96),rgba(13,13,13,0.98))]'
  }

  if (props.tone === 'strong') {
    return 'bg-[rgba(26,26,26,0.92)]'
  }

  return 'bg-[rgba(20,20,20,0.82)]'
})

const paddingClass = computed(() => {
  if (props.padding === 'sm') {
    return 'p-4'
  }

  if (props.padding === 'lg') {
    return 'p-8'
  }

  return 'p-5'
})
</script>

<template>
  <component
    :is="as"
    :class="[
      'rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl',
      toneClass,
      paddingClass
    ]"
  >
    <slot />
  </component>
</template>
