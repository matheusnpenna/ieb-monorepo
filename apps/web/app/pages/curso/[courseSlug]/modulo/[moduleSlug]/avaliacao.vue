<script setup lang="ts">
import type { StudentModuleAssessmentResponse } from '@ieb/shared'
import PageIntro from '../../../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../../../components/base/SurfaceCard.vue'

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

useSeoMeta({
  title: `Avaliacoes ${moduleSlug.value || ''}`.trim()
})

const { data: assessmentResponse, pending: assessmentPending } = await useAsyncData<StudentModuleAssessmentResponse>(
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
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Avaliacoes"
      :title="`Avaliacoes do modulo ${moduleSlug}`"
      description="Confira as provas disponiveis para este modulo e a estrutura de questoes cadastrada."
    />

    <SurfaceCard>
      <div class="section-stack">
        <p v-if="assessmentPending" class="body-copy">Carregando avaliacoes do modulo...</p>
        <p v-else-if="assessmentErrorMessage" class="feedback-message" data-tone="error">
          {{ assessmentErrorMessage }}
        </p>
        <template v-else-if="assessmentData">
          <p class="body-copy">{{ assessmentData.message }}</p>

          <p v-if="assessmentData.availability !== 'available'" class="assessment-meta">
            Progresso atual: {{ assessmentData.progress.completedLessons }} de {{ assessmentData.progress.totalLessons }} aulas concluidas.
          </p>

          <div v-else class="section-stack assessments-stack">
            <SurfaceCard v-for="assessment in assessmentData.assessments" :key="assessment.id" as="article">
              <div class="section-stack">
                <div class="assessment-header">
                  <span class="pill">{{ assessment.questionType === 'multiple_choice' ? 'Multipla escolha' : 'Resposta livre' }}</span>
                  <span class="assessment-meta">
                    Nota minima: {{ assessment.passingScore }}% ·
                    {{ assessment.timeLimitInMinutes ? `${assessment.timeLimitInMinutes} min` : 'sem limite' }}
                  </span>
                </div>
                <h2 class="section-title">{{ assessment.title }}</h2>
                <p class="body-copy">{{ assessment.description }}</p>

                <div class="section-stack">
                  <SurfaceCard v-for="(question, index) in assessment.questions" :key="question.id" as="article">
                    <div class="section-stack">
                      <h3 class="section-title">Questao {{ index + 1 }}</h3>
                      <p class="body-copy">{{ question.prompt }}</p>

                      <ul v-if="question.options.length > 0" class="list-clean options-list">
                        <li v-for="option in question.options" :key="option.id" class="option-item">
                          {{ option.label }}
                        </li>
                      </ul>

                      <p v-else class="body-copy">
                        Resposta livre. Esta questao sera corrigida manualmente por um administrador.
                      </p>
                    </div>
                  </SurfaceCard>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </template>
      </div>
    </SurfaceCard>
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
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.options-list {
  display: grid;
  gap: 0.5rem;
}

.option-item {
  padding: 0.85rem 1rem;
  border: 1px solid var(--ds-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
}
</style>
