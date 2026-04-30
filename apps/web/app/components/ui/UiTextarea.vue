<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

withDefaults(
  defineProps<{
    modelValue?: string | null
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    rows?: number
  }>(),
  {
    modelValue: '',
    placeholder: '',
    disabled: false,
    invalid: false,
    rows: 5
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()
</script>

<template>
  <textarea
    v-bind="attrs"
    :value="modelValue ?? ''"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="[
      'w-full rounded-[18px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] px-4 py-3.5 text-[0.98rem] text-[color:var(--ds-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:bg-white/8 focus:ring-4 focus:ring-[rgba(229,9,20,0.16)] disabled:cursor-not-allowed disabled:opacity-60',
      invalid ? 'border-[rgba(255,107,107,0.72)]' : 'border-white/12 focus:border-[color:var(--ds-accent)]'
    ]"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
