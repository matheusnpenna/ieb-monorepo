<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    to?: string
    href?: string
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'ghost' | 'success'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    size: 'md',
    block: false,
    disabled: false,
    loading: false
  }
)

const attrs = useAttrs()
const isDisabled = computed(() => props.disabled || props.loading)
const componentTag = computed(() => {
  if (props.to) {
    return 'NuxtLink'
  }

  if (props.href) {
    return 'a'
  }

  return 'button'
})

const variantClass = computed(() => {
  if (props.variant === 'secondary') {
    return 'border-white/16 bg-white/6 text-[color:var(--ds-text)] hover:-translate-y-0.5 hover:bg-white/10 focus-visible:ring-white/10'
  }

  if (props.variant === 'ghost') {
    return 'border-transparent bg-transparent text-white/78 hover:bg-white/7 hover:text-white focus-visible:ring-white/10'
  }

  if (props.variant === 'success') {
    return 'border-[color:var(--ds-success)] bg-[linear-gradient(180deg,#5ae07c_0%,#2ca74d_100%)] text-[#06110a] shadow-[0_14px_30px_rgba(70,211,105,0.24)] hover:-translate-y-0.5 hover:brightness-110 focus-visible:ring-[rgba(70,211,105,0.24)]'
  }

  return 'border-[color:var(--ds-accent)] bg-[linear-gradient(180deg,#ff2d2d_0%,#b20710_100%)] text-white shadow-[0_14px_30px_rgba(229,9,20,0.28)] hover:-translate-y-0.5 hover:brightness-110 focus-visible:ring-[rgba(229,9,20,0.2)]'
})

const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'min-h-10 px-4 text-sm'
  }

  if (props.size === 'lg') {
    return 'min-h-14 px-6 text-base'
  }

  return 'min-h-12 px-5 text-sm'
})
</script>

<template>
  <component
    :is="componentTag"
    v-bind="attrs"
    :to="to"
    :href="href"
    :type="componentTag === 'button' ? type : undefined"
    :tabindex="isDisabled && componentTag !== 'button' ? -1 : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :disabled="componentTag === 'button' ? isDisabled : undefined"
    :class="[
      'cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border font-semibold tracking-[0.01em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-4',
      variantClass,
      sizeClass,
      block ? 'w-full' : 'w-auto',
      isDisabled ? 'pointer-events-none opacity-60' : ''
    ]"
  >
    <slot />
  </component>
</template>
