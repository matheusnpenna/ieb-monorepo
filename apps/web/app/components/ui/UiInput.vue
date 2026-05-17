<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { vMaska } from 'maska/vue'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    type?: string
    placeholder?: string
    mask?: string
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
const inputClass = computed(() => [
  'h-13 w-full rounded-[18px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] px-4 text-[0.98rem] text-[color:var(--ds-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:bg-white/8 focus:ring-4 focus:ring-[rgba(229,9,20,0.16)] disabled:cursor-not-allowed disabled:opacity-60',
  props.invalid ? 'border-[rgba(255,107,107,0.72)]' : 'border-white/12 focus:border-[color:var(--ds-accent)]'
])
</script>

<template>
  <input
    v-if="mask"
    v-bind="attrs"
    :value="modelValue ?? ''"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    v-maska="mask"
    :class="inputClass"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />

  <input
    v-else
    v-bind="attrs"
    :value="modelValue ?? ''"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="inputClass"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
