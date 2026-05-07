<script setup lang="ts">
import type { LessonDetailProgress, LessonProgressUpdateResponse } from '@ieb/shared'
import UiButton from '../ui/UiButton.vue'
import { getRequestErrorMessage } from '../../lib/utils'

const props = defineProps<{
  courseSlug: string
  moduleSlug: string
  lessonSlug: string
  lessonDurationInMinutes: number
  progress: LessonDetailProgress | null
}>()

const emit = defineEmits<{
  updated: [progress: LessonDetailProgress]
}>()

const isSubmitting = ref(false)
const errorMessage = ref('')

const isLessonCompleted = computed(() => props.progress?.isCompleted || false)
const actionLabel = computed(() => (isLessonCompleted.value ? 'Desmarcar como concluida' : 'Marcar como concluida'))
const buttonVariant = computed(() => (isLessonCompleted.value ? 'secondary' : 'primary'))

const persistCompletionState = async (nextCompletionState: boolean) => {
  const response = await $fetch<LessonProgressUpdateResponse>(
    `/api/courses/${props.courseSlug}/modules/${props.moduleSlug}/lessons/${props.lessonSlug}/progress`,
    {
      method: 'PATCH',
      credentials: 'include',
      body: {
        lastPositionInSeconds: nextCompletionState
          ? Math.max(props.progress?.lastPositionInSeconds || 0, props.lessonDurationInMinutes * 60)
          : props.progress?.lastPositionInSeconds || 0,
        markAsCompleted: nextCompletionState
      }
    }
  )

  if (response.status !== 'success' || !response.data) {
    throw new Error('Nao foi possivel atualizar a conclusao da aula.')
  }

  emit('updated', {
    lastPositionInSeconds: response.data.lastPositionInSeconds,
    watchedMinutes: response.data.watchedMinutes,
    completionRate: response.data.completionRate,
    isCompleted: response.data.isCompleted
  })
}

const onToggleCompletion = async () => {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await persistCompletionState(!isLessonCompleted.value)
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel atualizar a conclusao da aula.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="section-stack">
    <div class="lesson-completion-row">
      <UiButton
        :loading="isSubmitting"
        :variant="buttonVariant"
        size="lg"
        @click="onToggleCompletion"
      >
        <svg v-if="isLessonCompleted" class="button-icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" stroke-width="1.7" />
          <path
            d="M6.8 10.1l2.1 2.2 4.4-4.7"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.7"
          />
        </svg>
        <svg v-else class="button-icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" stroke-width="1.7" />
          <path
            d="M10 6.3v7.4M6.3 10h7.4"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="1.7"
          />
        </svg>
        {{ actionLabel }}
      </UiButton>
    </div>

    <p v-if="errorMessage" class="completion-feedback">
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.lesson-completion-row {
  display: flex;
  justify-content: flex-end;
}

.button-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.completion-feedback {
  color: #ff9d9d;
}

@media (max-width: 720px) {
  .lesson-completion-row {
    justify-content: stretch;
  }
}
</style>
