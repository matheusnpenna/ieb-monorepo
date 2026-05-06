<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

withDefaults(
  defineProps<{
    modelValue?: string | number | null
    type?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    disabled: false,
    invalid: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()
</script>

<template>
  <input
    v-bind="attrs"
    :value="modelValue ?? ''"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="[
      'h-13 w-full rounded-[18px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] px-4 text-[0.98rem] text-[color:var(--ds-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:bg-white/8 focus:ring-4 focus:ring-[rgba(229,9,20,0.16)] disabled:cursor-not-allowed disabled:opacity-60',
      invalid ? 'border-[rgba(255,107,107,0.72)]' : 'border-white/12 focus:border-[color:var(--ds-accent)]'
    ]"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
