<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

withDefaults(
  defineProps<{
    modelValue?: boolean
    disabled?: boolean
    invalid?: boolean
    label?: string
  }>(),
  {
    modelValue: false,
    disabled: false,
    invalid: false,
    label: ''
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const attrs = useAttrs()
</script>

<template>
  <label
    :class="[
      'ui-checkbox group flex cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-3 text-[0.98rem] text-[color:var(--ds-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition',
      invalid
        ? 'border-[rgba(255,107,107,0.72)]'
        : 'border-white/12 hover:border-white/22',
      disabled ? 'cursor-not-allowed opacity-60' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]'
    ]"
  >
    <input
      v-bind="attrs"
      :checked="modelValue"
      :disabled="disabled"
      type="checkbox"
      class="sr-only"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >

    <span
      :class="[
        'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
        modelValue
          ? 'border-[color:var(--ds-accent)] bg-[linear-gradient(180deg,#ff2d2d_0%,#b20710_100%)] text-white'
          : 'border-white/20 bg-black/20 text-transparent group-hover:border-white/35',
        invalid ? 'border-[rgba(255,107,107,0.72)]' : ''
      ]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none">
        <path
          d="M3.5 8.2L6.6 11.3L12.4 4.9"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
      </svg>
    </span>

    <span class="min-w-0 flex-1 leading-6">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>
