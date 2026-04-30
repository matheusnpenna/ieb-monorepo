<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string
    required?: boolean
  }>(),
  {
    hint: '',
    error: '',
    required: false
  }
)
</script>

<template>
  <label class="grid gap-3 text-sm text-[color:var(--ds-text)]">
    <span class="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-white/78">
      {{ label }}
      <span v-if="required" class="text-[color:var(--ds-accent)]">*</span>
    </span>

    <slot />

    <p v-if="error" class="m-0 text-sm leading-6 text-[color:var(--ds-danger)]">
      {{ error }}
    </p>
    <p v-else-if="hint" class="m-0 text-sm leading-6 text-[color:var(--ds-muted)]">
      {{ hint }}
    </p>
  </label>
</template>
