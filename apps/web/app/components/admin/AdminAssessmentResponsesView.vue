<script setup lang="ts">
import type {
  AdminAssessmentAttemptResponse,
  AdminAssessmentAttemptsResponse,
  AdminAssessmentAttemptViewItem
} from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSpinner from '../ui/UiSpinner.vue'
import UiTextarea from '../ui/UiTextarea.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'
import { getRequestErrorMessage } from '../../lib/utils'

const { openConfirmationModal } = useConfirmationModal()

const defaultAttemptsResponse = {
  status: 'success',
  data: []
} satisfies AdminAssessmentAttemptsResponse

const studentSearch = ref('')
const emailSearch = ref('')
const moduleSearch = ref('')
const scoreDrafts = reactive<Record<string, string>>({})
const savePendingByAttemptId = reactive<Record<string, boolean>>({})
const feedbackMessage = ref('')

const { data: attemptsResponse, pending: attemptsPending, refresh: refreshAttempts } = await useAsyncData<AdminAssessmentAttemptsResponse>(
  'admin-assessment-attempts',
  () =>
    $fetch('/api/admin/assessment-attempts', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultAttemptsResponse
  }
)

const attempts = computed(() => {
  if (!attemptsResponse.value || attemptsResponse.value.status !== 'success') {
    return []
  }

  return [...attemptsResponse.value.data]
})

const filteredAttempts = computed(() => {
  const normalizedStudentSearch = studentSearch.value.trim().toLowerCase()
  const normalizedEmailSearch = emailSearch.value.trim().toLowerCase()
  const normalizedModuleSearch = moduleSearch.value.trim().toLowerCase()

  return attempts.value.filter((attempt) => {
    if (normalizedStudentSearch && !attempt.studentName.toLowerCase().includes(normalizedStudentSearch)) {
      return false
    }

    if (normalizedEmailSearch && !attempt.studentEmail.toLowerCase().includes(normalizedEmailSearch)) {
      return false
    }

    if (normalizedModuleSearch && !attempt.moduleTitle.toLowerCase().includes(normalizedModuleSearch)) {
      return false
    }

    return true
  })
})

const attemptsErrorMessage = computed(() =>
  attemptsResponse.value?.status === 'error'
    ? attemptsResponse.value.messages[0] || 'Nao foi possivel carregar as respostas de avaliacao.'
    : ''
)

watch(
  attempts,
  (items) => {
    items.forEach((attempt) => {
      scoreDrafts[attempt.id] = attempt.score === null ? '' : String(attempt.score)
    })
  },
  { immediate: true }
)

const formatAnswers = (answers: AdminAssessmentAttemptViewItem['answers']) =>
  Object.entries(answers).map(([questionId, value]) => ({
    questionId,
    value: Array.isArray(value) ? value.join(', ') : value
  }))

const saveScore = async (attempt: AdminAssessmentAttemptViewItem) => {
  if (savePendingByAttemptId[attempt.id]) {
    return
  }

  savePendingByAttemptId[attempt.id] = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminAssessmentAttemptResponse>(`/api/admin/assessment-attempts/${attempt.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        score: Number(scoreDrafts[attempt.id] || 0)
      }
    })

    if (response.status !== 'success' || !response.data || attemptsResponse.value?.status !== 'success') {
      throw new Error('Nao foi possivel salvar a nota.')
    }

    attemptsResponse.value = {
      status: 'success',
      data: attemptsResponse.value.data.map((item) => (item.id === response.data!.id ? response.data! : item))
    }
    feedbackMessage.value = 'Nota atualizada com sucesso.'
  } catch (error) {
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar a nota.')
  } finally {
    savePendingByAttemptId[attempt.id] = false
  }
}

const deleteAttempt = (attempt: AdminAssessmentAttemptViewItem) => {
  openConfirmationModal({
    title: 'Excluir resposta de avaliacao',
    message: `Deseja realmente excluir a tentativa ${attempt.attemptNumber} de ${attempt.studentName}? Isso liberara uma nova resposta para o aluno.`,
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel excluir a resposta.',
        onClick: async () => {
          await $fetch<AdminAssessmentAttemptResponse>(`/api/admin/assessment-attempts/${attempt.id}`, {
            method: 'DELETE',
            credentials: 'include'
          })

          await refreshAttempts()
          feedbackMessage.value = 'Resposta excluida com sucesso.'
        }
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Respostas"
      title="Respostas das avaliacoes"
      description="Pesquise por aluno, e-mail ou modulo, revise as respostas enviadas, ajuste a nota quando necessario e exclua tentativas para liberar nova prova."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="responses-toolbar">
          <UiInput v-model="studentSearch" placeholder="Pesquisar por nome do aluno" />
          <UiInput v-model="emailSearch" placeholder="Pesquisar por e-mail do aluno" />
          <UiInput v-model="moduleSearch" placeholder="Pesquisar por modulo da prova" />
          <UiButton to="/admin/avaliacoes" variant="ghost" size="sm">Voltar para avaliacoes</UiButton>
        </div>

        <p v-if="feedbackMessage" class="body-copy">{{ feedbackMessage }}</p>

        <UiSpinner v-if="attemptsPending" size="lg" label="Carregando respostas de avaliacao">
          <span class="body-copy">Carregando respostas de avaliacao...</span>
        </UiSpinner>

        <p v-else-if="attemptsErrorMessage" class="feedback-message" data-tone="error">
          {{ attemptsErrorMessage }}
        </p>

        <p v-else-if="filteredAttempts.length === 0" class="body-copy">
          Nenhuma resposta encontrada com os filtros informados.
        </p>

        <ul v-else class="list-clean attempts-list">
          <li v-for="attempt in filteredAttempts" :key="attempt.id">
            <SurfaceCard as="article">
              <div class="section-stack attempt-card">
                <div class="attempt-header">
                  <div class="section-stack attempt-copy">
                    <div class="attempt-meta">
                      <span class="pill">{{ attempt.assessmentQuestionType === 'multiple_choice' ? 'Multipla escolha' : 'Resposta livre' }}</span>
                      <span class="body-copy">Tentativa {{ attempt.attemptNumber }}</span>
                      <span class="body-copy">{{ attempt.status === 'pending_review' ? 'Aguardando correcao' : 'Corrigida' }}</span>
                    </div>
                    <h2 class="section-title attempt-title">{{ attempt.assessmentTitle }}</h2>
                    <p class="body-copy">
                      {{ attempt.studentName }} · {{ attempt.studentEmail }}
                    </p>
                    <p class="body-copy">
                      {{ attempt.courseTitle }} · {{ attempt.moduleTitle }}
                    </p>
                  </div>

                  <UiButton type="button" variant="ghost" textColor="accent" size="sm" @click="deleteAttempt(attempt)">
                    Excluir resposta
                  </UiButton>
                </div>

                <div class="attempt-score-row">
                  <UiInput v-model="scoreDrafts[attempt.id]" type="number" min="0" max="100" placeholder="Nota" />
                  <UiButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    :loading="savePendingByAttemptId[attempt.id]"
                    @click="saveScore(attempt)"
                  >
                    Salvar nota
                  </UiButton>
                  <span class="body-copy">Minimo: {{ attempt.passingScore }}%</span>
                  <span class="body-copy">Atual: {{ attempt.score === null ? 'sem nota' : `${attempt.score}%` }}</span>
                </div>

                <div class="attempt-answers">
                  <SurfaceCard
                    v-for="answer in formatAnswers(attempt.answers)"
                    :key="`${attempt.id}-${answer.questionId}`"
                    as="article"
                  >
                    <div class="section-stack">
                      <h3 class="section-title attempt-answer-title">Questao {{ answer.questionId }}</h3>
                      <UiTextarea :model-value="answer.value" :rows="3" disabled />
                    </div>
                  </SurfaceCard>
                </div>
              </div>
            </SurfaceCard>
          </li>
        </ul>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.responses-toolbar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 1rem;
  align-items: center;
}

.attempts-list {
  display: grid;
  gap: 1rem;
}

.attempt-card {
  gap: 1rem;
}

.attempt-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.attempt-copy {
  gap: 0.4rem;
}

.attempt-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.attempt-title {
  font-size: 1.2rem;
}

.attempt-score-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.attempt-answers {
  display: grid;
  gap: 0.75rem;
}

.attempt-answer-title {
  font-size: 1rem;
}

@media (max-width: 960px) {
  .responses-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
