<script setup lang="ts">
import type {
  AdminAssessmentInput,
  AdminAssessmentQuestionInput,
  AdminAssessmentQuestionOptionInput,
  AdminAssessmentResponse,
  AdminAssessmentsResponse,
  AdminCoursesResponse,
  AdminModulesResponse
} from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiField from '../ui/UiField.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSpinner from '../ui/UiSpinner.vue'
import UiTextarea from '../ui/UiTextarea.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'
import { getRequestErrorMessage } from '../../lib/utils'

type FeedbackTone = 'success' | 'error'

const props = defineProps<{
  mode: 'create' | 'edit'
  assessmentSlug?: string
}>()

const route = useRoute()
const { openConfirmationModal } = useConfirmationModal()

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const buildEmptyOption = (): AdminAssessmentQuestionOptionInput => ({
  id: generateId('option'),
  label: '',
  isCorrect: false
})

const buildEmptyQuestion = (questionType: AdminAssessmentInput['questionType']): AdminAssessmentQuestionInput => ({
  id: generateId('question'),
  prompt: '',
  explanation: null,
  options:
    questionType === 'multiple_choice'
      ? [buildEmptyOption(), buildEmptyOption()]
      : []
})

const buildEmptyAssessmentForm = (): AdminAssessmentInput => ({
  courseId: '',
  moduleId: '',
  title: '',
  slug: '',
  description: '',
  questionType: 'multiple_choice',
  passingScore: 70,
  timeLimitInMinutes: 30,
  questions: [buildEmptyQuestion('multiple_choice')]
})

const normalizeAssessmentSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const createFourDigitSlugHash = (value: string, salt = 0) => {
  const normalizedValue = `${value}:${salt}`
  let hash = 0

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) % 9000
  }

  return String(hash + 1000)
}

const resolveUniqueSlug = (title: string, existingSlugs: string[]) => {
  const baseSlug = normalizeAssessmentSlug(title)

  if (!baseSlug) {
    return ''
  }

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`

    if (!existingSlugs.includes(nextSlug)) {
      return nextSlug
    }
  }

  return baseSlug
}

const defaultAssessmentResponse = {
  status: 'success',
  data: null
} satisfies AdminAssessmentResponse

const defaultAssessmentsResponse = {
  status: 'success',
  data: []
} satisfies AdminAssessmentsResponse

const defaultCoursesResponse = {
  status: 'success',
  data: []
} satisfies AdminCoursesResponse

const defaultModulesResponse = {
  status: 'success',
  data: []
} satisfies AdminModulesResponse

const questionTypeOptions = [
  { value: 'multiple_choice', label: 'Multipla escolha' },
  { value: 'free_text', label: 'Resposta livre' }
] as const

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-assessment-courses',
  () =>
    $fetch('/api/admin/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  { default: () => defaultCoursesResponse }
)

const { data: modulesResponse, pending: modulesPending } = await useAsyncData<AdminModulesResponse>(
  'admin-assessment-modules',
  () =>
    $fetch('/api/admin/modules', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  { default: () => defaultModulesResponse }
)

const { data: assessmentsResponse } = await useAsyncData<AdminAssessmentsResponse>(
  () => `admin-assessment-slugs-${props.mode}`,
  () =>
    $fetch('/api/admin/assessments', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  { default: () => defaultAssessmentsResponse }
)

const { data: assessmentResponse, pending: assessmentPending } = await useAsyncData<AdminAssessmentResponse>(
  () => `admin-assessment-editor-${props.assessmentSlug || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.assessmentSlug) {
      return Promise.resolve(defaultAssessmentResponse)
    }

    return $fetch(`/api/admin/assessments/${props.assessmentSlug}`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  { default: () => defaultAssessmentResponse }
)

const assessmentForm = ref<AdminAssessmentInput>(buildEmptyAssessmentForm())
const submitPending = ref(false)
const deletePending = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('success')

const isEditing = computed(() => props.mode === 'edit')
const courses = computed(() => (coursesResponse.value?.status === 'success' ? coursesResponse.value.data : []))
const modules = computed(() => (modulesResponse.value?.status === 'success' ? modulesResponse.value.data : []))
const moduleOptions = computed(() => modules.value.filter((module) => module.courseId === assessmentForm.value.courseId))
const currentAssessment = computed(() =>
  assessmentResponse.value?.status === 'success' ? assessmentResponse.value.data : null
)
const existingSlugs = computed(() =>
  assessmentsResponse.value?.status === 'success'
    ? assessmentsResponse.value.data.map((assessment) => assessment.slug).filter((slug) => slug !== currentAssessment.value?.slug)
    : []
)
const assessmentErrorMessage = computed(() =>
  assessmentResponse.value?.status === 'error'
    ? assessmentResponse.value.messages[0] || 'Nao foi possivel carregar a avaliacao.'
    : ''
)
const prerequisiteErrorMessage = computed(() => {
  if (courses.value.length === 0) {
    return 'Cadastre pelo menos um curso antes de criar avaliacoes no painel.'
  }

  if (modules.value.length === 0) {
    return 'Cadastre pelo menos um modulo antes de criar avaliacoes no painel.'
  }

  return ''
})

watch(
  currentAssessment,
  (assessment) => {
    if (!assessment) {
      if (!isEditing.value) {
        assessmentForm.value = buildEmptyAssessmentForm()
      }
      return
    }

    assessmentForm.value = {
      courseId: assessment.courseId,
      moduleId: assessment.moduleId,
      title: assessment.title,
      slug: assessment.slug,
      description: assessment.description,
      questionType: assessment.questionType,
      passingScore: assessment.passingScore,
      timeLimitInMinutes: assessment.timeLimitInMinutes,
      questions: assessment.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        explanation: question.explanation,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
          isCorrect: option.isCorrect
        }))
      }))
    }
  },
  { immediate: true }
)

watch(
  courses,
  (availableCourses) => {
    if (isEditing.value || availableCourses.length === 0 || assessmentForm.value.courseId) {
      return
    }

    const requestedCourseId = typeof route.query.course === 'string' ? route.query.course : ''
    const matchingRequestedCourse = availableCourses.find((course) => course.id === requestedCourseId)
    assessmentForm.value.courseId = matchingRequestedCourse?.id || availableCourses[0]!.id
  },
  { immediate: true }
)

watch(
  [moduleOptions, () => route.query.module],
  ([availableModules, requestedModule]) => {
    if (isEditing.value || availableModules.length === 0) {
      return
    }

    if (assessmentForm.value.moduleId && availableModules.some((module) => module.id === assessmentForm.value.moduleId)) {
      return
    }

    const requestedModuleId = typeof requestedModule === 'string' ? requestedModule : ''
    const matchingRequestedModule = availableModules.find((module) => module.id === requestedModuleId)
    assessmentForm.value.moduleId = matchingRequestedModule?.id || availableModules[0]!.id
  },
  { immediate: true }
)

watch(
  () => assessmentForm.value.courseId,
  () => {
    if (isEditing.value) {
      return
    }

    if (!moduleOptions.value.some((module) => module.id === assessmentForm.value.moduleId)) {
      assessmentForm.value.moduleId = moduleOptions.value[0]?.id || ''
    }
  }
)

watch(
  () => assessmentForm.value.questionType,
  (questionType) => {
    assessmentForm.value.questions = assessmentForm.value.questions.map((question) => ({
      ...question,
      options:
        questionType === 'multiple_choice'
          ? question.options.length >= 2
            ? question.options
            : [buildEmptyOption(), buildEmptyOption()]
          : []
    }))
  }
)

watch(
  () => assessmentForm.value.title,
  (title) => {
    if (isEditing.value) {
      return
    }

    assessmentForm.value.slug = resolveUniqueSlug(title, existingSlugs.value)
  }
)

const addQuestion = () => {
  assessmentForm.value.questions.push(buildEmptyQuestion(assessmentForm.value.questionType))
}

const removeQuestion = (questionId: string) => {
  if (assessmentForm.value.questions.length === 1) {
    return
  }

  assessmentForm.value.questions = assessmentForm.value.questions.filter((question) => question.id !== questionId)
}

const onRemoveQuestionRequest = (questionId: string) => {
  if (assessmentForm.value.questions.length === 1) {
    return
  }

  openConfirmationModal({
    title: 'Remover questao',
    message: 'Deseja realmente remover esta questao da avaliacao?',
    actions: [
      { id: 'cancel', label: 'Cancelar', variant: 'secondary' },
      {
        id: 'remove',
        label: 'Remover questao',
        variant: 'ghost',
        onClick: async () => {
          removeQuestion(questionId)
        }
      }
    ]
  })
}

const addOption = (questionId: string) => {
  const question = assessmentForm.value.questions.find((item) => item.id === questionId)

  if (!question || assessmentForm.value.questionType !== 'multiple_choice') {
    return
  }

  question.options.push(buildEmptyOption())
}

const removeOption = (questionId: string, optionId: string) => {
  const question = assessmentForm.value.questions.find((item) => item.id === questionId)

  if (!question || question.options.length <= 2) {
    return
  }

  question.options = question.options.filter((option) => option.id !== optionId)
}

const markCorrectOption = (questionId: string, optionId: string) => {
  const question = assessmentForm.value.questions.find((item) => item.id === questionId)

  if (!question) {
    return
  }

  question.options = question.options.map((option) => ({
    ...option,
    isCorrect: option.id === optionId
  }))
}

const buildPayload = (): AdminAssessmentInput => ({
  courseId: assessmentForm.value.courseId,
  moduleId: assessmentForm.value.moduleId,
  title: assessmentForm.value.title,
  slug: assessmentForm.value.slug,
  description: assessmentForm.value.description,
  questionType: assessmentForm.value.questionType,
  passingScore: Number(assessmentForm.value.passingScore || 0),
  timeLimitInMinutes:
    assessmentForm.value.timeLimitInMinutes === null || assessmentForm.value.timeLimitInMinutes === undefined
      ? null
      : Number(assessmentForm.value.timeLimitInMinutes),
  questions: assessmentForm.value.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    explanation: question.explanation,
    options:
      assessmentForm.value.questionType === 'multiple_choice'
        ? question.options.map((option) => ({
            id: option.id,
            label: option.label,
            isCorrect: option.isCorrect
          }))
        : []
  }))
})

const onSubmit = async () => {
  if (submitPending.value || prerequisiteErrorMessage.value) {
    return
  }

  submitPending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminAssessmentResponse>(
      isEditing.value ? `/api/admin/assessments/${props.assessmentSlug}` : '/api/admin/assessments',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        credentials: 'include',
        body: buildPayload()
      }
    )

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel salvar a avaliacao.')
    }

    if (isEditing.value) {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Avaliacao atualizada com sucesso.'
      assessmentResponse.value = {
        status: 'success',
        data: response.data
      }
      return
    }

    await navigateTo(`/admin/avaliacoes/${response.data.slug}?status=created`)
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar a avaliacao.')
  } finally {
    submitPending.value = false
  }
}

const onDeleteConfirmed = async () => {
  if (!props.assessmentSlug || deletePending.value) {
    return
  }

  deletePending.value = true

  try {
    await $fetch<AdminAssessmentResponse>(`/api/admin/assessments/${props.assessmentSlug}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    await navigateTo('/admin/avaliacoes')
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover a avaliacao.')
  } finally {
    deletePending.value = false
  }
}

const onDeleteRequest = () => {
  if (!currentAssessment.value) {
    return
  }

  openConfirmationModal({
    title: 'Excluir avaliacao',
    message: `Deseja realmente excluir a avaliacao ${currentAssessment.value.title}? Esta acao sera registrada no painel administrativo.`,
    actions: [
      { id: 'cancel', label: 'Cancelar', variant: 'secondary' },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel remover a avaliacao.',
        onClick: onDeleteConfirmed
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Avaliacoes"
      :title="isEditing ? 'Editar avaliacao' : 'Nova avaliacao'"
      :description="isEditing ? 'Atualize a prova do modulo mantendo curso, modulo e slug travados apos a criacao.' : 'Cadastre uma nova avaliacao e defina todas as questoes no mesmo formato.'"
    />

    <SurfaceCard>
      <div v-if="assessmentPending || coursesPending || modulesPending" class="section-stack">
        <UiSpinner size="lg" label="Carregando avaliacao do painel">
          <span class="body-copy">Carregando avaliacao do painel...</span>
        </UiSpinner>
      </div>

      <div v-else-if="assessmentErrorMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ assessmentErrorMessage }}</p>
        <UiButton to="/admin/avaliacoes" variant="secondary">Voltar para avaliacoes</UiButton>
      </div>

      <div v-else-if="prerequisiteErrorMessage && !isEditing" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ prerequisiteErrorMessage }}</p>
        <UiButton :to="courses.length === 0 ? '/admin/cursos/novo' : '/admin/modulos/novo'" variant="success">
          {{ courses.length === 0 ? 'Criar primeiro curso' : 'Criar primeiro modulo' }}
        </UiButton>
      </div>

      <form v-else class="section-stack" @submit.prevent="onSubmit">
        <div class="section-stack">
          <p class="body-copy">
            {{ isEditing ? 'Curso, modulo e slug permanecem fixos apos a criacao. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' : 'Escolha curso e modulo, monte a avaliacao e revise as questoes. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' }}
          </p>
        </div>

        <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">
          {{ feedbackMessage }}
        </p>

        <div class="form-grid assessment-form-grid">
          <UiField label="Curso" required>
            <UiSelect v-model="assessmentForm.courseId" :disabled="isEditing">
              <option value="" disabled>Selecione um curso</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.title }}
              </option>
            </UiSelect>
          </UiField>

          <UiField label="Modulo" required>
            <UiSelect v-model="assessmentForm.moduleId" :disabled="isEditing">
              <option value="" disabled>Selecione um modulo</option>
              <option v-for="module in moduleOptions" :key="module.id" :value="module.id">
                {{ module.title }}
              </option>
            </UiSelect>
          </UiField>
        </div>

        <UiField label="Titulo" required>
          <UiInput v-model="assessmentForm.title" placeholder="Ex.: Avaliacao final do modulo" />
        </UiField>

        <UiField label="Slug" required hint="Gerado automaticamente a partir do titulo.">
          <UiInput :model-value="assessmentForm.slug" disabled />
        </UiField>

        <UiField label="Descricao" required>
          <UiTextarea v-model="assessmentForm.description" :rows="4" placeholder="Contextualize a avaliacao." />
        </UiField>

        <div class="form-grid assessment-form-grid">
          <UiField label="Tipo de questao" required>
            <UiSelect v-model="assessmentForm.questionType">
              <option v-for="option in questionTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>

          <UiField label="Nota minima (%)" required>
            <UiInput v-model="assessmentForm.passingScore" type="number" min="0" max="100" />
          </UiField>

          <UiField label="Tempo limite em minutos" hint="Deixe vazio para sem limite.">
            <UiInput v-model="assessmentForm.timeLimitInMinutes" type="number" min="1" />
          </UiField>
        </div>

        <div class="questions-stack">
          <div class="questions-header">
            <h2 class="section-title">Questoes</h2>
            <UiButton type="button" variant="secondary" size="sm" @click="addQuestion">Adicionar questao</UiButton>
          </div>

          <SurfaceCard v-for="(question, questionIndex) in assessmentForm.questions" :key="question.id" as="article">
            <div class="section-stack">
              <div class="question-header">
                <span class="pill">Questao {{ questionIndex + 1 }}</span>
                <UiButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  :disabled="assessmentForm.questions.length === 1"
                  @click="onRemoveQuestionRequest(question.id)"
                >
                  Remover questao
                </UiButton>
              </div>

              <UiField label="Enunciado" required>
                <UiTextarea v-model="question.prompt" :rows="3" placeholder="Escreva o enunciado da questao." />
              </UiField>

              <UiField label="Explicacao" hint="Opcional para contexto interno ou feedback futuro.">
                <UiTextarea v-model="question.explanation" :rows="2" placeholder="Explicacao opcional." />
              </UiField>

              <div v-if="assessmentForm.questionType === 'multiple_choice'" class="section-stack">
                <div class="options-header">
                  <h3 class="section-title options-title">Alternativas</h3>
                  <UiButton type="button" variant="secondary" size="sm" @click="addOption(question.id)">
                    Adicionar alternativa
                  </UiButton>
                </div>

                <div class="options-stack">
                  <SurfaceCard v-for="option in question.options" :key="option.id" as="article">
                    <div class="option-row">
                      <label class="option-radio">
                        <input
                          type="radio"
                          :name="question.id"
                          :checked="option.isCorrect"
                          @change="markCorrectOption(question.id, option.id)"
                        >
                        <span>Correta</span>
                      </label>

                      <UiTextarea v-model="option.label" :rows="3" placeholder="Texto da alternativa" />

                      <UiButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        :disabled="question.options.length <= 2"
                        @click="removeOption(question.id, option.id)"
                      >
                        Remover
                      </UiButton>
                    </div>
                  </SurfaceCard>
                </div>
              </div>

              <p v-else class="body-copy">
                Esta avaliacao usa apenas questoes abertas. A nota sera atribuida manualmente por um administrador apos a correcao.
              </p>
            </div>
          </SurfaceCard>
        </div>

        <div class="form-actions">
          <UiButton type="submit" variant="success" size="lg" :loading="submitPending">
            {{ isEditing ? 'Salvar alteracoes' : 'Criar avaliacao' }}
          </UiButton>
          <UiButton to="/admin/avaliacoes" type="button" variant="ghost" size="lg" :disabled="submitPending || deletePending">
            Voltar para avaliacoes
          </UiButton>
          <UiButton
            v-if="isEditing"
            type="button"
            variant="ghost"
            textColor="accent"
            size="lg"
            :disabled="submitPending || deletePending"
            @click="onDeleteRequest"
          >
            Excluir avaliacao
          </UiButton>
        </div>
      </form>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.assessment-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.questions-stack {
  display: grid;
  gap: 1rem;
}

.questions-header,
.question-header,
.options-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.options-title {
  font-size: 1.1rem;
}

.options-stack {
  display: grid;
  gap: 0.75rem;
}

.option-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: start;
}

.option-radio {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ds-text);
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .assessment-form-grid,
  .option-row {
    grid-template-columns: 1fr;
  }
}
</style>
