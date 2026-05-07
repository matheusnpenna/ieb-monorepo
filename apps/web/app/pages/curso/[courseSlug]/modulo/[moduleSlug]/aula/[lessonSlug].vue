<script setup lang="ts">
import type {
  LessonDetailProgress,
  LessonDetailResponse,
  LessonProgressUpdateResponse
} from '@ieb/shared'
import LessonCommentsPanel from '../../../../../../components/content/LessonCommentsPanel.vue'
import LessonCompletionToggle from '../../../../../../components/content/LessonCompletionToggle.vue'
import LessonNavigationControls from '../../../../../../components/content/LessonNavigationControls.vue'
import SurfaceCard from '../../../../../../components/base/SurfaceCard.vue'
import UiSpinner from '../../../../../../components/ui/UiSpinner.vue'
import LessonVideoPlayer from '../../../../../../components/content/LessonVideoPlayer.vue'
import { getRequestErrorMessage } from '../../../../../../lib/utils'

definePageMeta({
  layout: 'content'
})

interface PlayerProgressPayload {
  currentTimeInSeconds: number
  durationInSeconds: number
  completionRate: number
  ended: boolean
}

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))
const moduleSlug = computed(() => String(route.params.moduleSlug ?? ''))
const lessonSlug = computed(() => String(route.params.lessonSlug ?? ''))

const defaultLessonDetailResponse = {
  status: 'success',
  data: null
} satisfies LessonDetailResponse

const { data: lessonDetailResponse, pending: lessonPending } = await useAsyncData<LessonDetailResponse>(
  () => `lesson-detail-${courseSlug.value}-${moduleSlug.value}-${lessonSlug.value}`,
  () =>
    $fetch(`/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/lessons/${lessonSlug.value}`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [courseSlug, moduleSlug, lessonSlug],
    default: () => defaultLessonDetailResponse
  }
)

const lessonDetail = computed(() => {
  if (!lessonDetailResponse.value || lessonDetailResponse.value.status !== 'success') {
    return null
  }

  return lessonDetailResponse.value.data
})

const lesson = computed(() => lessonDetail.value?.lesson || null)
const moduleData = computed(() => lessonDetail.value?.module || null)

const lessonErrorMessage = computed(() => {
  if (!lessonDetailResponse.value || lessonDetailResponse.value.status !== 'error') {
    return ''
  }

  return lessonDetailResponse.value.messages[0] || 'Nao foi possivel carregar a aula.'
})

const lessonProgressState = ref<LessonDetailProgress | null>(null)

watch(
  () => lessonDetail.value?.progress,
  (progress) => {
    lessonProgressState.value = progress ? { ...progress } : null
  },
  { immediate: true }
)

const isSavingProgress = ref(false)
const queuedProgressPayload = ref<{ lastPositionInSeconds: number; markAsCompleted: boolean } | null>(null)
const progressErrorMessage = ref('')

const persistLessonProgress = async (payload: { lastPositionInSeconds: number; markAsCompleted: boolean }) => {
  const response = await $fetch<LessonProgressUpdateResponse>(
    `/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/lessons/${lessonSlug.value}/progress`,
    {
      method: 'PATCH',
      credentials: 'include',
      body: payload
    }
  )

  if (response.status === 'success' && response.data) {
    lessonProgressState.value = {
      lastPositionInSeconds: response.data.lastPositionInSeconds,
      watchedMinutes: response.data.watchedMinutes,
      completionRate: response.data.completionRate,
      isCompleted: response.data.isCompleted
    }
  }
}

const flushQueuedProgress = async () => {
  if (!queuedProgressPayload.value) {
    return
  }

  const payload = queuedProgressPayload.value
  queuedProgressPayload.value = null
  await saveLessonProgress(payload)
}

const saveLessonProgress = async (payload: { lastPositionInSeconds: number; markAsCompleted: boolean }) => {
  if (isSavingProgress.value) {
    queuedProgressPayload.value = payload
    return
  }

  isSavingProgress.value = true

  try {
    await persistLessonProgress(payload)
    progressErrorMessage.value = ''
  } catch (error) {
    progressErrorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar o progresso da aula.')
  } finally {
    isSavingProgress.value = false
    await flushQueuedProgress()
  }
}

const onVideoProgress = async (payload: PlayerProgressPayload) => {
  if (!lesson.value) {
    return
  }

  const currentSavedPosition = lessonProgressState.value?.lastPositionInSeconds || 0

  if (!payload.ended && payload.currentTimeInSeconds <= currentSavedPosition) {
    return
  }

  await saveLessonProgress({
    lastPositionInSeconds: payload.currentTimeInSeconds,
    markAsCompleted: payload.ended
  })
}

const onLessonCompletionUpdated = (progress: LessonDetailProgress) => {
  lessonProgressState.value = { ...progress }
  progressErrorMessage.value = ''
}

useSeoMeta({
  title: computed(() => (lesson.value?.title ? `Aula ${lesson.value.title}` : `Aula ${lessonSlug.value}`).trim())
})
</script>

<template>
  <div class="section-stack">
    <div class="flex items-center gap-5">
      <span class="pill w-fit">Aula</span>
      <h1 class="display-title">{{ lesson?.title || lessonSlug }}</h1>
    </div>

    <SurfaceCard>
      <div class="section-stack">
        <p v-if="lessonPending" class="lesson-loading">
          <UiSpinner aria-label="Carregando aula" />
          <span>Carregando detalhes da aula...</span>
        </p>
        <p v-else-if="lessonErrorMessage" class="body-copy">{{ lessonErrorMessage }}</p>
        <template v-else>
          <p v-if="progressErrorMessage" class="completion-feedback">
            {{ progressErrorMessage }}
          </p>

          <LessonCompletionToggle
            v-if="lesson"
            :course-slug="courseSlug"
            :module-slug="moduleSlug"
            :lesson-slug="lessonSlug"
            :lesson-duration-in-minutes="lesson.durationInMinutes"
            :progress="lessonProgressState"
            @updated="onLessonCompletionUpdated"
          />

          <LessonVideoPlayer
            :src="lessonDetail?.videoUrl || null"
            :poster="lesson?.thumbnailUrl || null"
            :title="lesson?.title || 'Aula'"
            :start-at-seconds="lessonProgressState?.lastPositionInSeconds || 0"
            @progress="onVideoProgress"
          />

          <LessonNavigationControls
            :previous-lesson="lessonDetail?.previousLesson || null"
            :next-lesson="lessonDetail?.nextLesson || null"
          />
        </template>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <div class="section-stack">
        <h2 class="section-title">Informações</h2>
        <p class="body-copy">
          {{
            lesson?.description ||
              'Template inicial para o player com HLS.js, resumo da aula e area de acompanhamento do progresso.'
          }}
        </p>
        <div v-if="lesson?.bodyContent" class="lesson-body" v-html="lesson.bodyContent" />
        <p v-if="moduleData" class="lesson-meta">
          Modulo: {{ moduleData.title }} · Duracao: {{ lesson?.durationInMinutes || 0 }} min
        </p>
      </div>
    </SurfaceCard>

    <LessonCommentsPanel
      :course-slug="courseSlug"
      :module-slug="moduleSlug"
      :lesson-slug="lessonSlug"
    />
  </div>
</template>

<style scoped>
.lesson-loading {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  color: var(--color-muted);
}

.completion-feedback {
  color: #ff9d9d;
}

.lesson-meta {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.lesson-body {
  color: var(--color-text);
  line-height: 1.75;
}
</style>
