<script setup lang="ts">
import UiButton from '../ui/UiButton.vue'
import UiField from '../ui/UiField.vue'

const props = defineProps<{
  label: string
  hint: string
  buttonLabel: string
  loading?: boolean
  disabled?: boolean
  accept?: string
}>()

const emit = defineEmits<{
  select: [event: Event]
  upload: []
}>()
</script>

<template>
  <UiField :label="label" :hint="hint">
    <div class="asset-upload-stack">
      <input
        :accept="accept || 'image/*'"
        class="asset-file-input"
        type="file"
        @change="emit('select', $event)"
      >
      <UiButton
        type="button"
        variant="secondary"
        size="sm"
        :loading="loading"
        :disabled="disabled"
        :aria-label="buttonLabel"
        @click="emit('upload')"
      >
        <svg class="upload-icon" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 13.8V4.9"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="1.7"
          />
          <path
            d="M6.8 8.1L10 4.9l3.2 3.2"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.7"
          />
          <path
            d="M4.5 15.1h11"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="1.7"
          />
        </svg>
      </UiButton>
    </div>
  </UiField>
</template>

<style scoped>
.asset-upload-stack {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.75rem;
}

.asset-file-input {
  display: block;
  width: 100%;
  border: 1px solid var(--ds-border);
  border-radius: 18px;
  padding: 0.85rem 1rem;
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
  color: var(--ds-text);
  cursor: pointer;
}

.upload-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
  cursor: pointer;
}
</style>
