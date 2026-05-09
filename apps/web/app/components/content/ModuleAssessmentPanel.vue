<script setup lang="ts">
import type { StudentModuleAssessmentResponse } from '@ieb/shared'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const props = defineProps<{
  courseSlug: string
  moduleSlug: string
}>()

const defaultResponse = {
  status: 'success',
  data: null
} satisfies StudentModuleAssessmentResponse

const { data: assessmentResponse, pending: assessmentPending } = await useAsyncData<StudentModuleAssessmentResponse>(
  () => `module-assessments-${props.courseSlug}-${props.moduleSlug}`,
  () =>
    $fetch(`/api/courses/${props.courseSlug}/modules/${props.moduleSlug}/assessment`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [() => props.courseSlug, () => props.moduleSlug],
    default: () => defaultResponse
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

const assessmentHubHref = computed(() => `/curso/${props.courseSlug}/modulo/${props.moduleSlug}/avaliacao`)
</script>

<template>
  <SurfaceCard>
    <div class="section-stack">
      <h2 class="section-title">Avaliacoes do modulo</h2>

      <UiSpinner v-if="assessmentPending" size="lg" label="Carregando avaliacoes do modulo">
        <span class="body-copy">Carregando avaliacoes do modulo...</span>
      </UiSpinner>

      <p v-else-if="assessmentErrorMessage" class="feedback-message" data-tone="error">
        {{ assessmentErrorMessage }}
      </p>

      <template v-else-if="assessmentData">
        <p class="body-copy">{{ assessmentData.message }}</p>

        <div v-if="assessmentData.availability === 'available'" class="section-stack">
          <p class="assessment-meta">
            {{ assessmentData.assessments.length === 1 ? '1 avaliacao liberada' : `${assessmentData.assessments.length} avaliacoes liberadas` }}
          </p>

          <ul class="list-clean assessment-list">
            <li v-for="assessment in assessmentData.assessments" :key="assessment.id">
              <SurfaceCard as="article">
                <div class="section-stack">
                  <div class="assessment-card-header">
                    <span class="pill">{{ assessment.questionType === 'multiple_choice' ? 'Multipla escolha' : 'Resposta livre' }}</span>
                    <span class="assessment-meta">{{ assessment.questionCount }} questoes</span>
                  </div>
                  <h3 class="section-title">{{ assessment.title }}</h3>
                  <p class="body-copy">{{ assessment.description }}</p>
                </div>
              </SurfaceCard>
            </li>
          </ul>

          <UiButton :to="assessmentHubHref" variant="secondary" size="lg">Responder avaliação</UiButton>
        </div>
      </template>
    </div>
  </SurfaceCard>
</template>

<style scoped>
.assessment-list {
  display: grid;
  gap: 0.75rem;
}

.assessment-card-header {
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
</style>
