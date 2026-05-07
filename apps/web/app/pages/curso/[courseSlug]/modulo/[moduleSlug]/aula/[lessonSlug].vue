<script setup lang="ts">
import type { LessonCompletionResponse, ModuleDetailResponse } from '@ieb/shared'
import SurfaceCard from '../../../../../../components/base/SurfaceCard.vue'
import UiButton from '../../../../../../components/ui/UiButton.vue'
import { getRequestErrorMessage } from '../../../../../../lib/utils'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))
const moduleSlug = computed(() => String(route.params.moduleSlug ?? ''))
const lessonSlug = computed(() => String(route.params.lessonSlug ?? ''))

const defaultModuleDetailResponse = {
  status: 'success',
  data: null
} satisfies ModuleDetailResponse

const { data: moduleDetailResponse, refresh: refreshModuleDetail } = await useAsyncData<ModuleDetailResponse>(
  () => `module-lessons-${courseSlug.value}-${moduleSlug.value}`,
  () =>
    $fetch(`/api/courses/${courseSlug.value}/modules/${moduleSlug.value}`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [courseSlug, moduleSlug],
    default: () => defaultModuleDetailResponse
  }
)

const lessons = computed(() => {
  if (!moduleDetailResponse.value || moduleDetailResponse.value.status !== 'success') {
    return []
  }

  return moduleDetailResponse.value.data?.lessons || []
})

const currentLessonIndex = computed(() =>
  lessons.value.findIndex((lesson) => lesson.slug === lessonSlug.value)
)

const currentLesson = computed(() => {
  if (currentLessonIndex.value < 0) {
    return null
  }

  return lessons.value[currentLessonIndex.value] || null
})

const isCompletingLesson = ref(false)
const completionErrorMessage = ref('')

const previousLesson = computed(() => {
  if (currentLessonIndex.value <= 0) {
    return null
  }

  return lessons.value[currentLessonIndex.value - 1] || null
})

const nextLesson = computed(() => {
  if (currentLessonIndex.value < 0 || currentLessonIndex.value >= lessons.value.length - 1) {
    return null
  }

  return lessons.value[currentLessonIndex.value + 1] || null
})

const previousLessonHref = computed(() => {
  if (!previousLesson.value) {
    return null
  }

  return `/curso/${courseSlug.value}/modulo/${moduleSlug.value}/aula/${previousLesson.value.slug}`
})

const nextLessonHref = computed(() => {
  if (!nextLesson.value) {
    return null
  }

  return `/curso/${courseSlug.value}/modulo/${moduleSlug.value}/aula/${nextLesson.value.slug}`
})

const completeLessonButtonLabel = computed(() =>
  currentLesson.value?.isCompleted ? 'Aula concluida' : 'Marcar como concluida'
)

const markLessonAsCompleted = async () => {
  if (!currentLesson.value || currentLesson.value.isCompleted || isCompletingLesson.value) {
    return
  }

  completionErrorMessage.value = ''
  isCompletingLesson.value = true

  try {
    await $fetch<LessonCompletionResponse>(
      `/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/lessons/${lessonSlug.value}/complete`,
      {
        method: 'POST',
        credentials: 'include'
      }
    )

    await refreshModuleDetail()
  } catch (error) {
    const requestError = error as { data?: { messages?: string[] } }

    completionErrorMessage.value =
      requestError?.data?.messages?.[0] ||
      getRequestErrorMessage(error, 'Nao foi possivel concluir a aula.')
  } finally {
    isCompletingLesson.value = false
  }
}

useSeoMeta({
  title: computed(() => (currentLesson.value?.title ? `Aula ${currentLesson.value.title}` : `Aula ${lessonSlug.value}`).trim())
})
</script>

<template>
  <div class="section-stack">
    <div class="flex items-center gap-5">
      <span class="pill w-fit">Aula</span>
      <h1 class="display-title">{{ currentLesson?.title || lessonSlug }}</h1>
    </div>

    <SurfaceCard>
      <div class="section-stack">
        <div class="lesson-completion-row">
          <UiButton
            :disabled="!currentLesson || currentLesson.isCompleted || isCompletingLesson"
            :loading="isCompletingLesson"
            :variant="currentLesson?.isCompleted ? 'secondary' : 'primary'"
            size="lg"
            @click="markLessonAsCompleted"
          >
            <svg v-if="currentLesson?.isCompleted" class="button-icon" viewBox="0 0 20 20" aria-hidden="true">
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
            {{ completeLessonButtonLabel }}
          </UiButton>
        </div>

        <p v-if="completionErrorMessage" class="completion-feedback">
          {{ completionErrorMessage }}
        </p>

        <div class="player-placeholder">Area reservada para video, texto ou audio.</div>

        <div class="lesson-navigation">
          <UiButton
            :to="previousLessonHref || undefined"
            :disabled="!previousLessonHref"
            variant="secondary"
            size="lg"
          >
            <svg class="button-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M9.5 3.5L5 8l4.5 4.5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.6"
              />
            </svg>
            Anterior
          </UiButton>
          <UiButton
            :to="nextLessonHref || undefined"
            :disabled="!nextLessonHref"
            size="lg"
          >
            Proximo
            <svg class="button-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M6.5 3.5L11 8l-4.5 4.5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.6"
              />
            </svg>
          </UiButton>
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <div class="section-stack">
        <h2 class="section-title">Informações</h2>
        <p class="body-copy">
          {{
            currentLesson?.description ||
              'Template inicial para o player com HLS.js, resumo da aula e area de acompanhamento do progresso.'
          }}
        </p>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.player-placeholder {
  min-height: 320px;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(71, 55, 36, 0.26);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.4);
  color: var(--color-muted);
}

.lesson-completion-row {
  display: flex;
  justify-content: flex-end;
}

.completion-feedback {
  color: #ff9d9d;
}

.lesson-navigation {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.button-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

@media (max-width: 720px) {
  .lesson-navigation {
    flex-direction: column;
  }
}
</style>
