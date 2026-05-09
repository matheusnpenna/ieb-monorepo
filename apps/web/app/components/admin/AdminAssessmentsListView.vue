<script setup lang="ts">
import type {
  AdminAssessmentSettingsResponse,
  AdminAssessmentsResponse,
  AdminCoursesResponse,
  AdminModulesResponse
} from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSpinner from '../ui/UiSpinner.vue'
import { getRequestErrorMessage } from '../../lib/utils'

const route = useRoute()

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

const defaultSettingsResponse = {
  status: 'success',
  data: null
} satisfies AdminAssessmentSettingsResponse

const searchTerm = ref('')
const selectedCourseId = ref(typeof route.query.course === 'string' ? route.query.course : '')
const selectedModuleId = ref(typeof route.query.module === 'string' ? route.query.module : '')
const settingsForm = ref({
  maxAttemptsPerAssessment: 3
})
const settingsSubmitPending = ref(false)
const settingsFeedbackMessage = ref('')
const hasRequiredFilters = computed(() => Boolean(selectedCourseId.value && selectedModuleId.value))

const { data: settingsResponse, pending: settingsPending, refresh: refreshSettings } = await useAsyncData<AdminAssessmentSettingsResponse>(
  'admin-assessment-settings',
  () =>
    $fetch('/api/admin/assessments/settings', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultSettingsResponse
  }
)

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-assessment-courses',
  () =>
    $fetch('/api/admin/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultCoursesResponse
  }
)

const { data: modulesResponse, pending: modulesPending } = await useAsyncData<AdminModulesResponse>(
  'admin-assessment-modules',
  () =>
    $fetch('/api/admin/modules', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultModulesResponse
  }
)

const { data: assessmentsResponse, pending: assessmentsPending } = await useAsyncData<AdminAssessmentsResponse>(
  () => `admin-assessments-${selectedCourseId.value || 'empty'}-${selectedModuleId.value || 'empty'}`,
  () => {
    if (!hasRequiredFilters.value) {
      return Promise.resolve(defaultAssessmentsResponse)
    }

    return $fetch('/api/admin/assessments', {
      credentials: 'include',
      ignoreResponseError: true,
      query: {
        courseId: selectedCourseId.value,
        moduleId: selectedModuleId.value
      }
    })
  },
  {
    default: () => defaultAssessmentsResponse,
    watch: [selectedCourseId, selectedModuleId]
  }
)

const courses = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'success') {
    return []
  }

  return [...coursesResponse.value.data].sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))
})

const modules = computed(() => {
  if (!modulesResponse.value || modulesResponse.value.status !== 'success') {
    return []
  }

  return [...modulesResponse.value.data].sort((left, right) => left.order - right.order)
})

const availableModules = computed(() =>
  modules.value.filter((module) => module.courseId === selectedCourseId.value)
)

watch(selectedCourseId, () => {
  if (!availableModules.value.some((module) => module.id === selectedModuleId.value)) {
    selectedModuleId.value = ''
  }
})

const assessments = computed(() => {
  if (!assessmentsResponse.value || assessmentsResponse.value.status !== 'success') {
    return []
  }

  return [...assessmentsResponse.value.data].sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))
})

const filteredAssessments = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  if (!normalizedSearch) {
    return assessments.value
  }

  return assessments.value.filter((assessment) => assessment.title.toLowerCase().includes(normalizedSearch))
})

const listErrorMessage = computed(() => {
  if (settingsResponse.value?.status === 'error') {
    return settingsResponse.value.messages[0] || 'Nao foi possivel carregar a configuracao das avaliacoes.'
  }

  if (assessmentsResponse.value?.status === 'error') {
    return assessmentsResponse.value.messages[0] || 'Nao foi possivel carregar as avaliacoes.'
  }

  if (coursesResponse.value?.status === 'error') {
    return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos.'
  }

  if (modulesResponse.value?.status === 'error') {
    return modulesResponse.value.messages[0] || 'Nao foi possivel carregar os modulos.'
  }

  return ''
})

watch(
  settingsResponse,
  (response) => {
    if (!response || response.status !== 'success' || !response.data) {
      return
    }

    settingsForm.value.maxAttemptsPerAssessment = response.data.maxAttemptsPerAssessment
  },
  { immediate: true }
)

const newAssessmentHref = computed(() => {
  const query = new URLSearchParams()

  if (selectedCourseId.value) {
    query.set('course', selectedCourseId.value)
  }

  if (selectedModuleId.value) {
    query.set('module', selectedModuleId.value)
  }

  return query.size > 0 ? `/admin/avaliacoes/novo?${query.toString()}` : '/admin/avaliacoes/novo'
})

const onSaveSettings = async () => {
  if (settingsSubmitPending.value) {
    return
  }

  settingsSubmitPending.value = true
  settingsFeedbackMessage.value = ''

  try {
    const response = await $fetch<AdminAssessmentSettingsResponse>('/api/admin/assessments/settings', {
      method: 'PATCH',
      credentials: 'include',
      body: {
        maxAttemptsPerAssessment: Number(settingsForm.value.maxAttemptsPerAssessment || 0)
      }
    })

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel salvar a configuracao de tentativas.')
    }

    settingsResponse.value = response
    settingsFeedbackMessage.value = 'Limite global de tentativas atualizado com sucesso.'
    await refreshSettings()
  } catch (error) {
    settingsFeedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar a configuracao de tentativas.')
  } finally {
    settingsSubmitPending.value = false
  }
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Avaliacoes"
      title="Avaliacoes cadastradas"
      description="Escolha curso e modulo para carregar as avaliacoes, filtre por titulo e entre na edicao."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="assessment-settings-card">
          <div class="section-stack assessment-settings-copy">
            <h2 class="section-title">Tentativas globais da plataforma</h2>
            <p class="body-copy">
              Defina quantas vezes um aluno pode responder cada avaliacao em toda a plataforma.
            </p>
          </div>

          <div class="assessment-settings-form">
            <UiInput
              v-model.number="settingsForm.maxAttemptsPerAssessment"
              type="number"
              min="1"
              max="20"
              :disabled="settingsPending || settingsSubmitPending"
            />
            <UiButton type="button" variant="secondary" size="sm" :loading="settingsSubmitPending" @click="onSaveSettings">
              Salvar limite
            </UiButton>
            <UiButton to="/admin/avaliacoes/respostas" variant="ghost" size="sm">
              Ver respostas
            </UiButton>
          </div>

          <p v-if="settingsFeedbackMessage" class="body-copy">
            {{ settingsFeedbackMessage }}
          </p>
        </div>

        <div class="list-toolbar assessments-toolbar">
          <UiInput v-model="searchTerm" placeholder="Pesquisar por titulo da avaliacao" :disabled="!hasRequiredFilters" />

          <UiSelect v-model="selectedCourseId">
            <option value="" disabled>Selecione um curso</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </UiSelect>

          <UiSelect v-model="selectedModuleId" :disabled="!selectedCourseId">
            <option value="" disabled>Selecione um modulo</option>
            <option v-for="module in availableModules" :key="module.id" :value="module.id">
              {{ module.title }}
            </option>
          </UiSelect>

          <UiButton :to="newAssessmentHref" variant="success" size="lg">Nova avaliacao</UiButton>
        </div>

        <UiSpinner
          v-if="hasRequiredFilters && (assessmentsPending || coursesPending || modulesPending)"
          size="lg"
          label="Carregando avaliacoes do painel"
        >
          <span class="body-copy">Carregando avaliacoes do painel...</span>
        </UiSpinner>

        <p v-else-if="!hasRequiredFilters" class="body-copy">
          Selecione primeiro um curso e um modulo para carregar a lista de avaliacoes.
        </p>

        <p v-else-if="listErrorMessage" class="feedback-message" data-tone="error">
          {{ listErrorMessage }}
        </p>

        <p v-else-if="filteredAssessments.length === 0" class="body-copy">
          Nenhuma avaliacao encontrada para os filtros atuais.
        </p>

        <ul v-else class="list-clean assessment-list">
          <li v-for="assessment in filteredAssessments" :key="assessment.id">
            <SurfaceCard as="article">
              <div class="section-stack assessment-card">
                <div class="assessment-card-header">
                  <div class="section-stack assessment-card-copy">
                    <div class="assessment-card-meta">
                      <span class="pill">{{ assessment.questionType === 'multiple_choice' ? 'Multipla escolha' : 'Resposta livre' }}</span>
                      <span class="body-copy">Slug: {{ assessment.slug }}</span>
                    </div>
                    <h2 class="section-title assessment-card-title">{{ assessment.title }}</h2>
                    <p class="body-copy">{{ assessment.description }}</p>
                  </div>

                  <UiButton :to="`/admin/avaliacoes/${assessment.slug}`" variant="secondary" size="sm">
                    Editar avaliacao
                  </UiButton>
                </div>

                <div class="assessment-card-footer">
                  <span class="body-copy">Questoes: {{ assessment.questions.length }}</span>
                  <span class="body-copy">Nota minima: {{ assessment.passingScore }}%</span>
                  <span class="body-copy">
                    Tempo limite: {{ assessment.timeLimitInMinutes ? `${assessment.timeLimitInMinutes} min` : 'sem limite' }}
                  </span>
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
.list-toolbar {
  display: grid;
  gap: 1rem;
  align-items: center;
}

.assessments-toolbar {
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr) minmax(220px, 0.8fr) auto;
}

.assessment-list {
  display: grid;
  gap: 1rem;
}

.assessment-settings-card {
  display: grid;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--ds-border);
}

.assessment-settings-copy {
  gap: 0.35rem;
}

.assessment-settings-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.assessment-card {
  gap: 1rem;
}

.assessment-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.assessment-card-copy {
  gap: 0.75rem;
}

.assessment-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.assessment-card-title {
  font-size: 1.35rem;
}

.assessment-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

@media (max-width: 1080px) {
  .assessments-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
