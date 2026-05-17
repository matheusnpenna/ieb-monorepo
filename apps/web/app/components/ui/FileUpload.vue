<script setup lang="ts">
import { computed, ref } from 'vue'
import UiButton from './UiButton.vue'
import UiField from './UiField.vue'

const props = defineProps<{
  label: string
  hint: string
  buttonLabel: string
  accept: string
  loading?: boolean
  disabled?: boolean
  inputDisabled?: boolean
  fileSizeLimit?: number
}>()

const emit = defineEmits<{
  select: [event: Event]
  upload: []
}>()

const fileSizeError = ref('')
const formattedFileSizeLimit = computed(() => {
  if (!props.fileSizeLimit) {
    return ''
  }

  if (props.fileSizeLimit < 1024 * 1024) {
    return `${Math.max(1, Math.ceil(props.fileSizeLimit / 1024))} KB`
  }

  const megabytes = props.fileSizeLimit / (1024 * 1024)

  return Number.isInteger(megabytes) ? `${megabytes} MB` : `${megabytes.toFixed(1)} MB`
})

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const selectedFile = input.files?.[0] || null

  if (selectedFile && props.fileSizeLimit && selectedFile.size > props.fileSizeLimit) {
    fileSizeError.value = `O arquivo precisa ter ate ${formattedFileSizeLimit.value}.`
    input.value = ''
    emit('select', event)
    return
  }

  fileSizeError.value = ''
  emit('select', event)
}
</script>

<template>
  <UiField :label="label" :hint="hint" :error="fileSizeError">
    <div class="asset-upload-stack">
      <input
        :accept="accept"
        :disabled="inputDisabled"
        class="asset-file-input"
        type="file"
        @change="onFileSelected"
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

.asset-file-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
  cursor: pointer;
}
</style>
