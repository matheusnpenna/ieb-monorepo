<script setup lang="ts">
import type {
  LessonCommentItem,
  LessonCommentResponse,
  LessonCommentsResponse,
  LessonDetailProgress,
  LessonDetailResponse,
  LessonProgressUpdateResponse
} from '@ieb/shared'
import SurfaceCard from '../../../../../../components/base/SurfaceCard.vue'
import UiButton from '../../../../../../components/ui/UiButton.vue'
import UiField from '../../../../../../components/ui/UiField.vue'
import UiSpinner from '../../../../../../components/ui/UiSpinner.vue'
import UiTextarea from '../../../../../../components/ui/UiTextarea.vue'
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

const defaultCommentsResponse = {
  status: 'success',
  data: []
} satisfies LessonCommentsResponse

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

const { data: commentsResponse, pending: commentsPending } = await useAsyncData<LessonCommentsResponse>(
  () => `lesson-comments-${courseSlug.value}-${moduleSlug.value}-${lessonSlug.value}`,
  () =>
    $fetch(`/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/lessons/${lessonSlug.value}/comments`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [courseSlug, moduleSlug, lessonSlug],
    default: () => defaultCommentsResponse
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

const commentsErrorMessage = computed(() => {
  if (!commentsResponse.value || commentsResponse.value.status !== 'error') {
    return ''
  }

  return commentsResponse.value.messages[0] || 'Nao foi possivel carregar os comentarios.'
})

const lessonProgressState = ref<LessonDetailProgress | null>(null)
const commentsList = ref<LessonCommentItem[]>([])

watch(
  () => lessonDetail.value?.progress,
  (progress) => {
    lessonProgressState.value = progress ? { ...progress } : null
  },
  { immediate: true }
)

watch(
  () => commentsResponse.value,
  (response) => {
    if (!response || response.status !== 'success') {
      commentsList.value = []
      return
    }

    commentsList.value = [...response.data]
  },
  { immediate: true }
)

const isSavingProgress = ref(false)
const queuedProgressPayload = ref<{ lastPositionInSeconds: number; markAsCompleted: boolean } | null>(null)
const progressErrorMessage = ref('')
const isCompletingLesson = ref(false)

const previousLessonHref = computed(() => lessonDetail.value?.previousLesson?.href || null)
const nextLessonHref = computed(() => lessonDetail.value?.nextLesson?.href || null)

const isLessonCompleted = computed(() => lessonProgressState.value?.isCompleted || false)

const completeLessonButtonLabel = computed(() =>
  isLessonCompleted.value ? 'Aula concluida' : 'Marcar como concluida'
)

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

const markLessonAsCompleted = async () => {
  if (!lesson.value || isLessonCompleted.value || isCompletingLesson.value) {
    return
  }

  progressErrorMessage.value = ''
  isCompletingLesson.value = true

  try {
    await persistLessonProgress({
      lastPositionInSeconds: Math.max(lessonProgressState.value?.lastPositionInSeconds || 0, lesson.value.durationInMinutes * 60),
      markAsCompleted: true
    })
  } catch (error) {
    progressErrorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel concluir a aula.')
  } finally {
    isCompletingLesson.value = false
  }
}

const newComment = ref('')
const commentActionErrorMessage = ref('')
const isSubmittingComment = ref(false)
const editingCommentId = ref<string | null>(null)
const editingCommentContent = ref('')
const busyCommentId = ref<string | null>(null)

const submitComment = async () => {
  if (!newComment.value.trim() || isSubmittingComment.value) {
    return
  }

  commentActionErrorMessage.value = ''
  isSubmittingComment.value = true

  try {
    const response = await $fetch<LessonCommentResponse>(
      `/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/lessons/${lessonSlug.value}/comments`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          content: newComment.value
        }
      }
    )

    if (response.status === 'success' && response.data) {
      commentsList.value = [...commentsList.value, response.data]
      newComment.value = ''
    }
  } catch (error) {
    commentActionErrorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel publicar o comentario.')
  } finally {
    isSubmittingComment.value = false
  }
}

const startEditingComment = (comment: LessonCommentItem) => {
  editingCommentId.value = comment.id
  editingCommentContent.value = comment.content
  commentActionErrorMessage.value = ''
}

const cancelEditingComment = () => {
  editingCommentId.value = null
  editingCommentContent.value = ''
}

const saveEditedComment = async (commentId: string) => {
  if (!editingCommentContent.value.trim() || busyCommentId.value) {
    return
  }

  commentActionErrorMessage.value = ''
  busyCommentId.value = commentId

  try {
    const response = await $fetch<LessonCommentResponse>(
      `/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/lessons/${lessonSlug.value}/comments/${commentId}`,
      {
        method: 'PATCH',
        credentials: 'include',
        body: {
          content: editingCommentContent.value
        }
      }
    )

    if (response.status === 'success' && response.data) {
      commentsList.value = commentsList.value.map((comment) => (comment.id === commentId ? response.data! : comment))
      cancelEditingComment()
    }
  } catch (error) {
    commentActionErrorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel editar o comentario.')
  } finally {
    busyCommentId.value = null
  }
}

const deleteComment = async (commentId: string) => {
  if (busyCommentId.value) {
    return
  }

  commentActionErrorMessage.value = ''
  busyCommentId.value = commentId

  try {
    await $fetch<LessonCommentResponse>(
      `/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/lessons/${lessonSlug.value}/comments/${commentId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    )

    commentsList.value = commentsList.value.filter((comment) => comment.id !== commentId)

    if (editingCommentId.value === commentId) {
      cancelEditingComment()
    }
  } catch (error) {
    commentActionErrorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel excluir o comentario.')
  } finally {
    busyCommentId.value = null
  }
}

const formatCommentTimestamp = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))

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
          <div class="lesson-completion-row">
            <UiButton
              :disabled="!lesson || isLessonCompleted || isCompletingLesson"
              :loading="isCompletingLesson"
              :variant="isLessonCompleted ? 'secondary' : 'primary'"
              size="lg"
              @click="markLessonAsCompleted"
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
              {{ completeLessonButtonLabel }}
            </UiButton>
          </div>

          <p v-if="progressErrorMessage" class="completion-feedback">
            {{ progressErrorMessage }}
          </p>

          <LessonVideoPlayer
            :src="lessonDetail?.videoUrl || null"
            :poster="lesson?.thumbnailUrl || null"
            :title="lesson?.title || 'Aula'"
            :start-at-seconds="lessonProgressState?.lastPositionInSeconds || 0"
            @progress="onVideoProgress"
          />

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

    <SurfaceCard>
      <div class="section-stack">
        <div class="comments-header">
          <div class="section-stack">
            <h2 class="section-title">Comentários</h2>
            <p class="body-copy">Compartilhe dúvidas, percepções e anotações sobre esta aula.</p>
          </div>
        </div>

        <UiField label="Novo comentario">
          <UiTextarea
            v-model="newComment"
            :rows="4"
            placeholder="Escreva seu comentario sobre esta aula"
          />
        </UiField>

        <div class="comments-actions">
          <UiButton :loading="isSubmittingComment" :disabled="!newComment.trim()" @click="submitComment">
            Publicar comentario
          </UiButton>
        </div>

        <p v-if="commentActionErrorMessage" class="completion-feedback">
          {{ commentActionErrorMessage }}
        </p>
        <p v-if="commentsErrorMessage" class="body-copy">{{ commentsErrorMessage }}</p>
        <p v-else-if="commentsPending" class="lesson-loading">
          <UiSpinner aria-label="Carregando comentarios" />
          <span>Carregando comentarios...</span>
        </p>
        <div v-else-if="commentsList.length > 0" class="comments-list">
          <SurfaceCard
            v-for="comment in commentsList"
            :key="comment.id"
            as="article"
            class="comment-card"
          >
            <div class="section-stack">
              <div class="comment-header">
                <div class="section-stack comment-author">
                  <strong>{{ comment.author.fullName }}</strong>
                  <span class="lesson-meta">
                    {{ formatCommentTimestamp(comment.createdAt) }}
                    <template v-if="comment.isEdited"> · Editado</template>
                  </span>
                </div>

                <div v-if="comment.canEdit || comment.canDelete" class="comment-controls">
                  <UiButton
                    v-if="comment.canEdit"
                    variant="ghost"
                    size="sm"
                    :disabled="busyCommentId === comment.id"
                    @click="startEditingComment(comment)"
                  >
                    Editar
                  </UiButton>
                  <UiButton
                    v-if="comment.canDelete"
                    variant="ghost"
                    size="sm"
                    :disabled="busyCommentId === comment.id"
                    @click="deleteComment(comment.id)"
                  >
                    Excluir
                  </UiButton>
                </div>
              </div>

              <template v-if="editingCommentId === comment.id">
                <UiField label="Editar comentario">
                  <UiTextarea
                    v-model="editingCommentContent"
                    :rows="4"
                    placeholder="Atualize seu comentario"
                  />
                </UiField>
                <div class="comments-actions">
                  <UiButton
                    size="sm"
                    :loading="busyCommentId === comment.id"
                    :disabled="!editingCommentContent.trim()"
                    @click="saveEditedComment(comment.id)"
                  >
                    Salvar
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    size="sm"
                    :disabled="busyCommentId === comment.id"
                    @click="cancelEditingComment"
                  >
                    Cancelar
                  </UiButton>
                </div>
              </template>
              <p v-else class="body-copy">{{ comment.content }}</p>
            </div>
          </SurfaceCard>
        </div>
        <p v-else class="body-copy">
          Nenhum comentario foi publicado nesta aula ainda.
        </p>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.lesson-loading {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  color: var(--color-muted);
}

.lesson-completion-row {
  display: flex;
  justify-content: flex-end;
}

.completion-feedback {
  color: #ff9d9d;
}

.lesson-navigation,
.comments-actions,
.comment-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.lesson-navigation {
  justify-content: space-between;
}

.button-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
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

.comments-list {
  display: grid;
  gap: 1rem;
}

.comment-card {
  height: 100%;
}

.comment-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.comment-author {
  gap: 0.25rem;
}

@media (max-width: 720px) {
  .lesson-navigation,
  .comments-actions,
  .comment-controls,
  .comment-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .lesson-completion-row {
    justify-content: stretch;
  }
}
</style>
