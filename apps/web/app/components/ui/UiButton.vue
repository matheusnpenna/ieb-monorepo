<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    to?: string
    href?: string
    target?: string
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'ghost' | 'success'
    textColor?:
      | 'auto'
      | 'bg'
      | 'bg-elevated'
      | 'surface'
      | 'surface-strong'
      | 'border'
      | 'text'
      | 'muted'
      | 'accent'
      | 'accent-strong'
      | 'success'
      | 'danger'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    textColor: 'auto',
    size: 'md',
    block: false,
    disabled: false,
    loading: false
  }
)

const attrs = useAttrs()
const isDisabled = computed(() => props.disabled || props.loading)
const isNuxtLink = computed(() => Boolean(props.to))
const isAnchor = computed(() => !props.to && Boolean(props.href))
const sharedClass = computed(() => [
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border font-semibold tracking-[0.01em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-4',
  variantClass.value,
  textColorClass.value,
  sizeClass.value,
  props.block ? 'w-full' : 'w-auto',
  isDisabled.value ? 'pointer-events-none opacity-60' : ''
])

const variantClass = computed(() => {
  if (props.variant === 'secondary') {
    return 'border-white/16 bg-white/6 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:ring-white/10'
  }

  if (props.variant === 'ghost') {
    return 'border-transparent bg-transparent hover:bg-white/7 focus-visible:ring-white/10'
  }

  if (props.variant === 'success') {
    return 'border-[color:var(--ds-success)] bg-[linear-gradient(180deg,#5ae07c_0%,#2ca74d_100%)] shadow-[0_14px_30px_rgba(70,211,105,0.24)] hover:-translate-y-0.5 hover:brightness-110 focus-visible:ring-[rgba(70,211,105,0.24)]'
  }

  return 'border-[color:var(--ds-accent)] bg-[linear-gradient(180deg,#ff2d2d_0%,#b20710_100%)] shadow-[0_14px_30px_rgba(229,9,20,0.28)] hover:-translate-y-0.5 hover:brightness-110 focus-visible:ring-[rgba(229,9,20,0.2)]'
})

const textColorClass = computed(() => {
  if (props.textColor === 'bg') {
    return 'text-[color:var(--ds-bg)]'
  }

  if (props.textColor === 'bg-elevated') {
    return 'text-[color:var(--ds-bg-elevated)]'
  }

  if (props.textColor === 'surface') {
    return 'text-[color:var(--ds-surface)]'
  }

  if (props.textColor === 'surface-strong') {
    return 'text-[color:var(--ds-surface-strong)]'
  }

  if (props.textColor === 'border') {
    return 'text-[color:var(--ds-border)]'
  }

  if (props.textColor === 'text') {
    return 'text-[color:var(--ds-text)]'
  }

  if (props.textColor === 'muted') {
    return 'text-[color:var(--ds-muted)]'
  }

  if (props.textColor === 'accent') {
    return 'text-[color:var(--ds-accent)]'
  }

  if (props.textColor === 'accent-strong') {
    return 'text-[color:var(--ds-accent-strong)]'
  }

  if (props.textColor === 'success') {
    return 'text-[color:var(--ds-success)]'
  }

  if (props.textColor === 'danger') {
    return 'text-[color:var(--ds-danger)]'
  }

  if (props.variant === 'ghost') {
    return 'text-white/78 hover:text-white'
  }

  if (props.variant === 'success') {
    return 'text-[#06110a]'
  }

  if (props.variant === 'secondary') {
    return 'text-[color:var(--ds-text)]'
  }

  return 'text-white'
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
  <NuxtLink
    v-if="isNuxtLink"
    v-bind="attrs"
    :to="to || undefined"
    :target="target"
    :tabindex="isDisabled ? -1 : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :class="sharedClass"
  >
    <slot />
  </NuxtLink>

  <a
    v-else-if="isAnchor"
    v-bind="attrs"
    :href="href || undefined"
    :target="target"
    :tabindex="isDisabled ? -1 : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :class="sharedClass"
  >
    <slot />
  </a>

  <button
    v-else
    v-bind="attrs"
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading ? 'true' : undefined"
    :class="sharedClass"
  >
    <slot />
  </button>
</template>
