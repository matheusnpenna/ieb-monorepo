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
import AudioPlayer from '../../../../../../components/ui/AudioPlayer.vue'
import PdfViewer from '../../../../../../components/ui/PdfViewer.vue'
import UiSpinner from '../../../../../../components/ui/UiSpinner.vue'
import LessonVideoPlayer from '../../../../../../components/content/LessonVideoPlayer.vue'
import { getRequestErrorMessage } from '../../../../../../lib/utils'

definePageMeta({
  layout: 'content'
})

interface TimedMediaProgressPayload {
  currentTimeInSeconds: number
  durationInSeconds: number
  completionRate: number
  ended: boolean
}

interface AudioProgressPayload {
  currentTimeInSeconds: number
  durationInSeconds: number
  percentage: number
}

interface PdfReadingProgressPayload {
  currentPage: number
  totalPages: number
  percentage: number
}

interface StoredLessonProgress {
  lastPositionInSeconds: number
  watchedMinutes: number
  completionRate: number
  isCompleted: boolean
  updatedAt: string
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
const lessonMediaUrl = computed(() => lesson.value?.mediaUrl?.trim() || null)
const isVideoLesson = computed(() => lesson.value?.contentType === 'video')
const isAudioLesson = computed(() => lesson.value?.contentType === 'audio')
const isPdfLesson = computed(() => lesson.value?.contentType === 'pdf')
const pdfInitialPage = computed(() => Math.max(1, Math.floor(lessonProgressState.value?.lastPositionInSeconds || 1)))
const progressStorageKey = computed(() =>
  `lesson-progress:${courseSlug.value}:${moduleSlug.value}:${lessonSlug.value}`
)

const lessonErrorMessage = computed(() => {
  if (!lessonDetailResponse.value || lessonDetailResponse.value.status !== 'error') {
    return ''
  }

  return lessonDetailResponse.value.messages[0] || 'Nao foi possivel carregar a aula.'
})
const mediaUnavailableMessage = computed(() => {
  if (!lesson.value) {
    return 'Nenhuma aula foi encontrada para exibicao.'
  }

  if (isAudioLesson.value) {
    return 'Nenhum audio foi disponibilizado para esta aula no momento.'
  }

  if (isPdfLesson.value) {
    return 'Nenhum PDF foi disponibilizado para esta aula no momento.'
  }

  return 'Nenhum video foi disponibilizado para esta aula no momento.'
})

const lessonProgressState = ref<LessonDetailProgress | null>(null)

const readStoredProgress = () => {
  if (!import.meta.client) {
    return null
  }

  try {
    const storedValue = window.sessionStorage.getItem(progressStorageKey.value)

    return storedValue ? (JSON.parse(storedValue) as StoredLessonProgress) : null
  } catch {
    return null
  }
}

const writeStoredProgress = (progress: LessonDetailProgress) => {
  if (!import.meta.client) {
    return
  }

  const storedProgress: StoredLessonProgress = {
    ...progress,
    updatedAt: new Date().toISOString()
  }

  window.sessionStorage.setItem(progressStorageKey.value, JSON.stringify(storedProgress))
}

const mergeProgressWithStoredPosition = (progress: LessonDetailProgress | null) => {
  const storedProgress = readStoredProgress()

  if (!storedProgress || storedProgress.lastPositionInSeconds <= (progress?.lastPositionInSeconds || 0)) {
    return progress ? { ...progress } : null
  }

  return {
    lastPositionInSeconds: storedProgress.lastPositionInSeconds,
    watchedMinutes: Math.max(progress?.watchedMinutes || 0, storedProgress.watchedMinutes),
    completionRate: Math.max(progress?.completionRate || 0, storedProgress.completionRate),
    isCompleted: Boolean(progress?.isCompleted || storedProgress.isCompleted)
  }
}

const setLessonProgressState = (progress: LessonDetailProgress | null, options?: { persistLocal?: boolean }) => {
  lessonProgressState.value = progress ? { ...progress } : null

  if (options?.persistLocal && lessonProgressState.value) {
    writeStoredProgress(lessonProgressState.value)
  }
}

const patchLessonDetailProgress = (progress: LessonDetailProgress) => {
  if (!lessonDetailResponse.value || lessonDetailResponse.value.status !== 'success' || !lessonDetailResponse.value.data) {
    return
  }

  lessonDetailResponse.value = {
    ...lessonDetailResponse.value,
    data: {
      ...lessonDetailResponse.value.data,
      progress: {
        ...progress
      }
    }
  }
}

watch(
  () => lessonDetail.value?.progress,
  (progress) => {
    setLessonProgressState(mergeProgressWithStoredPosition(progress || null))
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
    const progress = {
      lastPositionInSeconds: response.data.lastPositionInSeconds,
      watchedMinutes: response.data.watchedMinutes,
      completionRate: response.data.completionRate,
      isCompleted: response.data.isCompleted
    }

    setLessonProgressState(progress, { persistLocal: true })
    patchLessonDetailProgress(progress)
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

const onTimedMediaProgress = async (payload: TimedMediaProgressPayload) => {
  if (!lesson.value) {
    return
  }

  const currentSavedPosition = lessonProgressState.value?.lastPositionInSeconds || 0

  if (!payload.ended && payload.currentTimeInSeconds <= currentSavedPosition) {
    return
  }

  const optimisticProgress = {
    lastPositionInSeconds: payload.currentTimeInSeconds,
    watchedMinutes: Math.max(
      lessonProgressState.value?.watchedMinutes || 0,
      Math.ceil(payload.currentTimeInSeconds / 60)
    ),
    completionRate: Math.max(lessonProgressState.value?.completionRate || 0, payload.completionRate),
    isCompleted: Boolean(lessonProgressState.value?.isCompleted || payload.ended)
  }

  setLessonProgressState(optimisticProgress, { persistLocal: true })
  patchLessonDetailProgress(optimisticProgress)

  await saveLessonProgress({
    lastPositionInSeconds: payload.currentTimeInSeconds,
    markAsCompleted: payload.ended
  })
}

const onAudioProgress = (payload: AudioProgressPayload) =>
  onTimedMediaProgress({
    currentTimeInSeconds: payload.currentTimeInSeconds,
    durationInSeconds: payload.durationInSeconds,
    completionRate: payload.percentage,
    ended: false
  })

const onAudioEnded = (payload: AudioProgressPayload) =>
  onTimedMediaProgress({
    currentTimeInSeconds: payload.currentTimeInSeconds,
    durationInSeconds: payload.durationInSeconds,
    completionRate: 100,
    ended: true
  })

const onPdfReadingProgress = async (payload: PdfReadingProgressPayload) => {
  if (!lesson.value) {
    return
  }

  const currentSavedPage = lessonProgressState.value?.lastPositionInSeconds || 0
  const isCompleted = payload.percentage >= 100

  if (!isCompleted && payload.currentPage <= currentSavedPage) {
    return
  }

  const optimisticProgress = {
    lastPositionInSeconds: payload.currentPage,
    watchedMinutes: Math.max(lessonProgressState.value?.watchedMinutes || 0, payload.currentPage),
    completionRate: Math.max(lessonProgressState.value?.completionRate || 0, payload.percentage),
    isCompleted: Boolean(lessonProgressState.value?.isCompleted || isCompleted)
  }

  setLessonProgressState(optimisticProgress, { persistLocal: true })
  patchLessonDetailProgress(optimisticProgress)

  await saveLessonProgress({
    lastPositionInSeconds: payload.currentPage,
    markAsCompleted: isCompleted
  })
}

const onLessonCompletionUpdated = (progress: LessonDetailProgress) => {
  setLessonProgressState(progress, { persistLocal: true })
  patchLessonDetailProgress(progress)
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

          <template v-if="lesson">
            <LessonVideoPlayer
              v-if="isVideoLesson && lessonMediaUrl"
              :src="lessonMediaUrl"
              :poster="lesson.thumbnailUrl || null"
              :title="lesson.title || 'Aula'"
              :start-at-seconds="lessonProgressState?.lastPositionInSeconds || 0"
              @progress="onTimedMediaProgress"
            />

            <AudioPlayer
              v-else-if="isAudioLesson && lessonMediaUrl"
              :src="lessonMediaUrl"
              :title="lesson.title || 'Audio da aula'"
              :initial-position-in-seconds="lessonProgressState?.lastPositionInSeconds || 0"
              @progress="onAudioProgress"
              @ended="onAudioEnded"
            />

            <PdfViewer
              v-else-if="isPdfLesson && lessonMediaUrl"
              :src="lessonMediaUrl"
              :initial-page="pdfInitialPage"
              @page-change="onPdfReadingProgress"
              @reading-progress="onPdfReadingProgress"
            />

            <div v-else class="lesson-media-empty">
              {{ mediaUnavailableMessage }}
            </div>
          </template>

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

.lesson-media-empty {
  min-height: 260px;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-muted);
  text-align: center;
  padding: 2rem;
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
