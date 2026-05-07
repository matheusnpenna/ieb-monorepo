<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiPanel from './UiPanel.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'

const {
  isOpen,
  title,
  message,
  actions,
  dismissible,
  busyActionId,
  feedbackMessage,
  closeConfirmationModal,
  runConfirmationAction
} = useConfirmationModal()

const onBackdropClick = (event: MouseEvent) => {
  if (!dismissible.value) {
    return
  }

  if (event.target === event.currentTarget) {
    closeConfirmationModal()
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value || !dismissible.value) {
    return
  }

  if (event.key === 'Escape') {
    closeConfirmationModal()
  }
}

watch(isOpen, (nextIsOpen) => {
  if (!import.meta.client) {
    return
  }

  if (nextIsOpen) {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
    return
  }

  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }

  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click="onBackdropClick">
      <UiPanel
        as="section"
        tone="strong"
        padding="lg"
        class="modal-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'confirmation-modal-title' : undefined"
      >
        <div class="section-stack">
          <div class="section-stack modal-copy">
            <span class="pill w-fit">Confirmacao</span>
            <h2 id="confirmation-modal-title" class="section-title modal-title">{{ title }}</h2>
            <p class="body-copy">{{ message }}</p>
          </div>

          <p v-if="feedbackMessage" class="modal-feedback">{{ feedbackMessage }}</p>

          <div v-if="actions.length > 0" class="modal-actions">
            <UiButton
              v-for="action in actions"
              :key="action.id"
              :variant="action.variant || 'secondary'"
              :disabled="action.disabled"
              :loading="busyActionId === action.id"
              size="lg"
              @click="runConfirmationAction(action.id)"
            >
              {{ action.label }}
            </UiButton>
          </div>
        </div>
      </UiPanel>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background:
    radial-gradient(circle at top, rgba(229, 9, 20, 0.22), transparent 35%),
    rgba(5, 5, 5, 0.74);
  backdrop-filter: blur(14px);
}

.modal-dialog {
  width: min(100%, 560px);
}

.modal-copy {
  gap: 0.85rem;
}

.modal-title {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.85rem;
}

.modal-feedback {
  color: #ff9d9d;
}

@media (max-width: 720px) {
  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>
