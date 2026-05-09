<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import UiSpinner from './UiSpinner.vue'

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
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-3xl border font-semibold tracking-[0.01em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-4',
  variantClass.value,
  textColorClass.value,
  sizeClass.value,
  props.block ? 'w-full' : 'w-auto',
  isDisabled.value ? 'pointer-events-none cursor-not-allowed opacity-60' : ''
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

const textColorMap = {
  bg: 'text-[color:var(--ds-bg)]',
  'bg-elevated': 'text-[color:var(--ds-bg-elevated)]',
  surface: 'text-[color:var(--ds-surface)]',
  'surface-strong': 'text-[color:var(--ds-surface-strong)]',
  border: 'text-[color:var(--ds-border)]',
  text: 'text-[color:var(--ds-text)]',
  muted: 'text-[color:var(--ds-muted)]',
  accent: 'text-[color:var(--ds-accent)]',
  'accent-strong': 'text-[color:var(--ds-accent-strong)]',
  success: 'text-[color:var(--ds-success)]',
  danger: 'text-[color:var(--ds-danger)]'
} as const

const variantTextColorMap = {
  primary: 'text-white',
  secondary: 'text-[color:var(--ds-text)]',
  ghost: 'text-white/78 hover:text-white',
  success: 'text-[#06110a]'
} as const

const textColorClass = computed(() => {
  if (props.textColor !== 'auto') {
    return textColorMap[props.textColor]
  }

  return variantTextColorMap[props.variant]
})

const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'min-h-10 max-h-15 px-4 text-sm'
  }

  if (props.size === 'lg') {
    return 'min-h-14 max-h-21 px-6 text-base'
  }

  return 'min-h-12 max-h-18 px-5 text-sm'
})

const spinnerTone = computed(() => {
  if (props.variant === 'success') {
    return 'neutral'
  }

  return 'light'
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
    <UiSpinner v-if="loading" class="ui-button__spinner" size="sm" :tone="spinnerTone" label="Carregando" />
    <slot v-else />
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
    <UiSpinner v-if="loading" class="ui-button__spinner" size="sm" :tone="spinnerTone" label="Carregando" />
    <slot v-else />
  </a>

  <button
    v-else
    v-bind="attrs"
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading ? 'true' : undefined"
    :class="sharedClass"
  >
    <UiSpinner v-if="loading" class="ui-button__spinner" size="sm" :tone="spinnerTone" label="Carregando" />
    <slot v-else />
  </button>
</template>

<style scoped>
.ui-button__spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
