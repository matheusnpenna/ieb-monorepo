<script setup lang="ts">
import type {
  StudentAssessmentItem,
  StudentAssessmentSubmissionResponse,
  StudentModuleAssessmentResponse
} from '@ieb/shared'
import PageIntro from '../../../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../../../components/base/SurfaceCard.vue'
import UiButton from '../../../../../components/ui/UiButton.vue'
import UiCheckbox from '../../../../../components/ui/UiCheckbox.vue'
import UiSpinner from '../../../../../components/ui/UiSpinner.vue'
import UiTextarea from '../../../../../components/ui/UiTextarea.vue'
import { getRequestErrorMessage } from '../../../../../lib/utils'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))
const moduleSlug = computed(() => String(route.params.moduleSlug ?? ''))

const defaultAssessmentResponse = {
  status: 'success',
  data: null
} satisfies StudentModuleAssessmentResponse

const answerDrafts = reactive<Record<string, Record<string, string | string[]>>>({})
const submitPendingByAssessmentId = reactive<Record<string, boolean>>({})
const feedbackByAssessmentId = reactive<Record<string, string>>({})

useSeoMeta({
  title: `Avaliacoes ${moduleSlug.value || ''}`.trim()
})

const {
  data: assessmentResponse,
  pending: assessmentPending,
  refresh: refreshAssessments
} = await useAsyncData<StudentModuleAssessmentResponse>(
  () => `student-module-assessment-page-${courseSlug.value}-${moduleSlug.value}`,
  () =>
    $fetch(`/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/assessment`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [courseSlug, moduleSlug],
    default: () => defaultAssessmentResponse
  }
)

const assessmentData = computed(() =>
  assessmentResponse.value?.status === 'success' ? assessmentResponse.value.data : null
)

const assessmentErrorMessage = computed(() =>
  assessmentResponse.value?.status === 'error'
    ? assessmentResponse.value.messages[0] || 'Nao foi possivel carregar as avaliacoes do modulo.'
    : ''
)

const assessments = computed(() => assessmentData.value?.assessments || [])

const initializeAssessmentDraft = (assessment: StudentAssessmentItem) => {
  if (answerDrafts[assessment.id]) {
    return
  }

  answerDrafts[assessment.id] = assessment.questions.reduce<Record<string, string | string[]>>((accumulator, question) => {
    accumulator[question.id] = assessment.questionType === 'multiple_choice' ? [] : ''
    return accumulator
  }, {})
}

const ensureAssessmentDraft = (assessmentId: string) => {
  if (!answerDrafts[assessmentId]) {
    answerDrafts[assessmentId] = {}
  }

  return answerDrafts[assessmentId]!
}

watch(
  assessments,
  (items) => {
    items.forEach((assessment) => initializeAssessmentDraft(assessment))
  },
  { immediate: true }
)

const isOptionChecked = (assessmentId: string, questionId: string, optionId: string) => {
  const value = answerDrafts[assessmentId]?.[questionId]

  return Array.isArray(value) ? value.includes(optionId) : false
}

const toggleOption = (assessmentId: string, questionId: string, optionId: string, checked: boolean) => {
  const currentValue = answerDrafts[assessmentId]?.[questionId]
  const selectedOptionIds = Array.isArray(currentValue) ? [...currentValue] : []

  ensureAssessmentDraft(assessmentId)[questionId] = checked
    ? [...new Set([...selectedOptionIds, optionId])]
    : selectedOptionIds.filter((currentOptionId) => currentOptionId !== optionId)
}

const getTextAnswerValue = (assessmentId: string, questionId: string) => {
  const value = answerDrafts[assessmentId]?.[questionId]

  return typeof value === 'string' ? value : ''
}

const setTextAnswerValue = (assessmentId: string, questionId: string, value: string) => {
  ensureAssessmentDraft(assessmentId)[questionId] = value
}

const submitAssessment = async (assessment: StudentAssessmentItem) => {
  if (submitPendingByAssessmentId[assessment.id] || assessment.availability !== 'available') {
    return
  }

  submitPendingByAssessmentId[assessment.id] = true
  feedbackByAssessmentId[assessment.id] = ''

  try {
    const response = await $fetch<StudentAssessmentSubmissionResponse>(
      `/api/courses/${courseSlug.value}/modules/${moduleSlug.value}/assessments/${assessment.slug}/attempts`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          answers: answerDrafts[assessment.id]
        }
      }
    )

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel enviar a avaliacao.')
    }

    feedbackByAssessmentId[assessment.id] =
      response.data.attempt.status === 'pending_review'
        ? 'Respostas enviadas com sucesso. Sua prova agora aguarda correcao manual.'
        : `Prova enviada com sucesso. Sua nota atual e ${response.data.attempt.score ?? 0}%.`

    answerDrafts[assessment.id] = assessment.questions.reduce<Record<string, string | string[]>>((accumulator, question) => {
      accumulator[question.id] = assessment.questionType === 'multiple_choice' ? [] : ''
      return accumulator
    }, {})

    await refreshAssessments()
  } catch (error) {
    feedbackByAssessmentId[assessment.id] = getRequestErrorMessage(error, 'Nao foi possivel enviar a avaliacao.')
  } finally {
    submitPendingByAssessmentId[assessment.id] = false
  }
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Avaliacoes"
      :title="`Avaliacoes do modulo ${moduleSlug}`"
      description="Responda a prova completa e envie suas respostas apenas quando finalizar todas as questoes."
    />

    <div class="section-stack">
      <UiSpinner v-if="assessmentPending" size="lg" label="Carregando avaliacoes do modulo">
        <span class="body-copy">Carregando avaliacoes do modulo...</span>
      </UiSpinner>

      <p v-else-if="assessmentErrorMessage" class="feedback-message" data-tone="error">
        {{ assessmentErrorMessage }}
      </p>

      <template v-else-if="assessmentData">

        <p v-if="assessmentData.availability !== 'available'" class="assessment-meta">
          Progresso atual: {{ assessmentData.progress.completedLessons }} de {{ assessmentData.progress.totalLessons }} aulas concluidas.
        </p>

        <div v-else class="section-stack assessments-stack">
          <SurfaceCard v-for="assessment in assessmentData.assessments" :key="assessment.id" as="article">
            <form class="section-stack" @submit.prevent="submitAssessment(assessment)">
              <div class="assessment-header">
                <span class="pill">{{ assessment.questionType === 'multiple_choice' ? 'Multipla escolha' : 'Resposta livre' }}</span>
                <span class="assessment-meta">
                  Tentativas restantes: {{ assessment.attemptsRemaining }} de {{ assessment.maxAttempts }}
                </span>
              </div>

              <h2 class="section-title">{{ assessment.title }}</h2>
              <p class="body-copy">{{ assessment.description }}</p>

              <div v-if="assessment.latestAttempt" class="assessment-attempt-status">
                <p class="body-copy">
                  Ultima tentativa: {{ assessment.latestAttempt.attemptNumber }} ·
                  {{ assessment.latestAttempt.status === 'pending_review' ? 'aguardando correcao' : 'corrigida' }}
                  <template v-if="assessment.latestAttempt.score !== null">
                    · nota {{ assessment.latestAttempt.score }}%
                  </template>
                </p>
              </div>

              <p v-if="feedbackByAssessmentId[assessment.id]" class="body-copy">
                {{ feedbackByAssessmentId[assessment.id] }}
              </p>

              <p v-if="assessment.availability !== 'available'" class="feedback-message" data-tone="error">
                {{ assessment.blockingMessage }}
              </p>

              <div class="section-stack">
                <SurfaceCard v-for="(question, index) in assessment.questions" :key="question.id" as="article">
                  <div class="section-stack">
                    <h3 class="section-title">Questao {{ index + 1 }}</h3>
                    <p class="body-copy">{{ question.prompt }}</p>

                    <div v-if="assessment.questionType === 'multiple_choice'" class="options-list">
                      <UiCheckbox
                        v-for="option in question.options"
                        :key="option.id"
                        :model-value="isOptionChecked(assessment.id, question.id, option.id)"
                        :disabled="assessment.availability !== 'available' || submitPendingByAssessmentId[assessment.id]"
                        @update:model-value="toggleOption(assessment.id, question.id, option.id, $event)"
                      >
                        {{ option.label }}
                      </UiCheckbox>
                    </div>

                    <UiTextarea
                      v-else
                      :model-value="getTextAnswerValue(assessment.id, question.id)"
                      @update:model-value="setTextAnswerValue(assessment.id, question.id, $event)"
                      :rows="5"
                      :disabled="assessment.availability !== 'available' || submitPendingByAssessmentId[assessment.id]"
                      placeholder="Escreva sua resposta aqui."
                    />
                  </div>
                </SurfaceCard>
              </div>

              <UiButton
                type="submit"
                variant="success"
                size="lg"
                :loading="submitPendingByAssessmentId[assessment.id]"
                :disabled="assessment.availability !== 'available'"
              >
                Enviar prova inteira
              </UiButton>
            </form>
          </SurfaceCard>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.assessments-stack {
  gap: 1rem;
}

.assessment-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.assessment-meta {
  color: var(--ds-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.assessment-attempt-status {
  padding: 0.85rem 1rem;
  border: 1px solid var(--ds-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
}

.options-list {
  display: grid;
  gap: 0.75rem;
}

</style>
