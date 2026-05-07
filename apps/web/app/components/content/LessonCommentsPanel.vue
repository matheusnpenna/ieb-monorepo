<script setup lang="ts">
import type { LessonCommentItem, LessonCommentResponse, LessonCommentsResponse } from '@ieb/shared'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiField from '../ui/UiField.vue'
import UiSpinner from '../ui/UiSpinner.vue'
import UiTextarea from '../ui/UiTextarea.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'
import { getRequestErrorMessage } from '../../lib/utils'

const props = defineProps<{
  courseSlug: string
  moduleSlug: string
  lessonSlug: string
}>()

const { openConfirmationModal } = useConfirmationModal()

const defaultCommentsResponse = {
  status: 'success',
  data: []
} satisfies LessonCommentsResponse

const { data: commentsResponse, pending: commentsPending } = await useAsyncData<LessonCommentsResponse>(
  () => `lesson-comments-${props.courseSlug}-${props.moduleSlug}-${props.lessonSlug}`,
  () =>
    $fetch(`/api/courses/${props.courseSlug}/modules/${props.moduleSlug}/lessons/${props.lessonSlug}/comments`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [
      () => props.courseSlug,
      () => props.moduleSlug,
      () => props.lessonSlug
    ],
    default: () => defaultCommentsResponse
  }
)

const commentsErrorMessage = computed(() => {
  if (!commentsResponse.value || commentsResponse.value.status !== 'error') {
    return ''
  }

  return commentsResponse.value.messages[0] || 'Nao foi possivel carregar os comentarios.'
})

const commentsList = ref<LessonCommentItem[]>([])

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
      `/api/courses/${props.courseSlug}/modules/${props.moduleSlug}/lessons/${props.lessonSlug}/comments`,
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
  if (!comment.canEdit) {
    return
  }

  editingCommentId.value = comment.id
  editingCommentContent.value = comment.content
  commentActionErrorMessage.value = ''
}

const cancelEditingComment = () => {
  editingCommentId.value = null
  editingCommentContent.value = ''
}

const saveEditedComment = async (commentId: string) => {
  const comment = commentsList.value.find((item) => item.id === commentId)

  if (!comment?.canEdit || !editingCommentContent.value.trim() || busyCommentId.value) {
    return
  }

  commentActionErrorMessage.value = ''
  busyCommentId.value = commentId

  try {
    const response = await $fetch<LessonCommentResponse>(
      `/api/courses/${props.courseSlug}/modules/${props.moduleSlug}/lessons/${props.lessonSlug}/comments/${commentId}`,
      {
        method: 'PATCH',
        credentials: 'include',
        body: {
          content: editingCommentContent.value
        }
      }
    )

    if (response.status === 'success' && response.data) {
      commentsList.value = commentsList.value.map((item) => (item.id === commentId ? response.data! : item))
      cancelEditingComment()
    }
  } catch (error) {
    commentActionErrorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel editar o comentario.')
  } finally {
    busyCommentId.value = null
  }
}

const executeDeleteComment = async (commentId: string) => {
  const comment = commentsList.value.find((item) => item.id === commentId)

  if (!comment?.canDelete || busyCommentId.value) {
    return
  }

  commentActionErrorMessage.value = ''
  busyCommentId.value = commentId

  try {
    await $fetch<LessonCommentResponse>(
      `/api/courses/${props.courseSlug}/modules/${props.moduleSlug}/lessons/${props.lessonSlug}/comments/${commentId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    )

    commentsList.value = commentsList.value.filter((item) => item.id !== commentId)

    if (editingCommentId.value === commentId) {
      cancelEditingComment()
    }
  } catch (error) {
    commentActionErrorMessage.value = getRequestErrorMessage(error, 'Nao foi possivel excluir o comentario.')
  } finally {
    busyCommentId.value = null
  }
}

const requestDeleteComment = (comment: LessonCommentItem) => {
  if (!comment.canDelete) {
    return
  }

  openConfirmationModal({
    title: 'Excluir comentario',
    message: 'Esta acao remove o comentario desta aula. Deseja continuar?',
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'confirm',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel excluir o comentario.',
        onClick: () => executeDeleteComment(comment.id)
      }
    ]
  })
}

const formatCommentTimestamp = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
</script>

<template>
  <SurfaceCard>
    <div class="section-stack">
      <div class="comments-header">
        <div class="section-stack">
          <h2 class="section-title">Comentarios</h2>
          <p class="body-copy">Compartilhe duvidas, percepcoes e anotacoes sobre esta aula.</p>
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

      <p v-if="commentActionErrorMessage" class="comments-feedback">
        {{ commentActionErrorMessage }}
      </p>
      <p v-if="commentsErrorMessage" class="body-copy">{{ commentsErrorMessage }}</p>
      <p v-else-if="commentsPending" class="comments-loading">
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
                <span class="comment-meta">
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
                  @click="requestDeleteComment(comment)"
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
</template>

<style scoped>
.comments-loading {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  color: var(--color-muted);
}

.comments-feedback {
  color: #ff9d9d;
}

.comments-actions,
.comment-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
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

.comment-meta {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .comments-actions,
  .comment-controls,
  .comment-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
