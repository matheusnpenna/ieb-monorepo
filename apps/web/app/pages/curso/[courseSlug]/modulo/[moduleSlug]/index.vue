<script setup lang="ts">
import type { ModuleDetailResponse } from '@ieb/shared'
import ModuleAssessmentPanel from '../../../../../components/content/ModuleAssessmentPanel.vue'
import PageIntro from '../../../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))
const moduleSlug = computed(() => String(route.params.moduleSlug ?? ''))

const defaultModuleDetailResponse = {
  status: 'success',
  data: null
} satisfies ModuleDetailResponse

const { data: moduleDetailResponse, pending: modulePending } = await useAsyncData<ModuleDetailResponse>(
  () => `module-detail-${courseSlug.value}-${moduleSlug.value}`,
  () =>
    $fetch(`/api/courses/${courseSlug.value}/modules/${moduleSlug.value}`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [courseSlug, moduleSlug],
    default: () => defaultModuleDetailResponse
  }
)

const moduleDetail = computed(() => {
  if (!moduleDetailResponse.value || moduleDetailResponse.value.status !== 'success') {
    return null
  }

  return moduleDetailResponse.value.data
})

const moduleData = computed(() => moduleDetail.value?.module || null)
const progress = computed(() => moduleDetail.value?.progress || null)

const lessons = computed(() => {
  if (!moduleDetail.value) {
    return []
  }

  return moduleDetail.value.lessons.map((lesson, index) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    meta: `${index + 1}. ${lesson.durationInMinutes} min`,
    href: `/curso/${courseSlug.value}/modulo/${moduleSlug.value}/aula/${lesson.slug}`
  }))
})

const moduleErrorMessage = computed(() => {
  if (!moduleDetailResponse.value || moduleDetailResponse.value.status !== 'error') {
    return ''
  }

  return moduleDetailResponse.value.messages[0] || 'Nao foi possivel carregar o modulo.'
})

const lessonsInfoTitle = computed(() => {
  if (lessons.value.length === 1) {
    return '1 aula disponível'
  }

  return `${lessons.value.length} aulas disponíveis`
})

const progressSummary = computed(() => {
  if (!progress.value) {
    return ''
  }

  return `${progress.value.completedLessons} de ${progress.value.totalLessons} aulas finalizadas`
})

useSeoMeta({
  title: computed(() => (moduleData.value?.title ? `Módulo ${moduleData.value.title}` : `Módulo ${moduleSlug.value}`).trim())
})
</script>

<template>
  <div class="section-stack">
    <SurfaceCard>
      <div class="section-stack">
        <span class="pill w-fit">Modulo</span>
        <h1 class="display-title">{{ moduleData?.title || moduleSlug }}</h1>
        <p v-if="modulePending" class="body-copy">Carregando detalhes do modulo...</p>
        <p v-else-if="moduleErrorMessage" class="body-copy">{{ moduleErrorMessage }}</p>
        <template v-else>
          <p class="body-copy">
            {{ moduleData?.description || 'Este modulo concentra as aulas, o progresso e a avaliacao do aluno.' }}
          </p>

          <div v-if="progress" class="progress-block">
            <div class="progress-header">
              <span class="pill subtle">Progresso</span>
              <strong class="progress-percentage">{{ progress.completionPercentage }}%</strong>
            </div>
            <div class="progress-track" aria-hidden="true">
              <div class="progress-fill" :style="{ width: `${progress.completionPercentage}%` }" />
            </div>
            <p class="progress-copy">{{ progressSummary }}</p>
          </div>
        </template>
      </div>
    </SurfaceCard>

    <PageIntro
      eyebrow="Aulas"
      :title="lessonsInfoTitle"
      description="Clique em uma aula para abrir o detalhe e continuar a jornada deste módulo."
    />

    <section v-if="lessons.length > 0" class="lesson-list">
      <NuxtLink v-for="lesson in lessons" :key="lesson.id" :to="lesson.href" class="lesson-link">
        <SurfaceCard as="article" class="lesson-card">
          <div class="lesson-row">
            <div class="section-stack lesson-copy">
              <p class="lesson-meta">{{ lesson.meta }}</p>
              <h2 class="section-title">{{ lesson.title }}</h2>
              <p class="body-copy">{{ lesson.description }}</p>
            </div>
            <span class="lesson-cta">Abrir aula</span>
          </div>
        </SurfaceCard>
      </NuxtLink>
    </section>

    <SurfaceCard v-else-if="!modulePending && !moduleErrorMessage">
      <p class="body-copy">Nenhuma aula disponivel para este modulo no momento.</p>
    </SurfaceCard>

    <ModuleAssessmentPanel
      v-if="!modulePending && !moduleErrorMessage"
      :course-slug="courseSlug"
      :module-slug="moduleSlug"
    />
  </div>
</template>

<style scoped>
.progress-block {
  display: grid;
  gap: 0.9rem;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.progress-percentage {
  color: var(--color-text);
  font-size: 1.1rem;
}

.progress-track {
  overflow: hidden;
  height: 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #e50914 0%, #ff5b5b 100%);
}

.progress-copy,
.assessment-meta,
.lesson-meta {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.lesson-list {
  display: grid;
  gap: 1rem;
}

.lesson-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.lesson-card {
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.lesson-link:hover .lesson-card,
.lesson-link:focus-visible .lesson-card {
  transform: translateY(-2px);
}

.lesson-link:focus-visible {
  outline: none;
}

.lesson-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.lesson-copy {
  min-width: 0;
  flex: 1;
}

.lesson-cta {
  white-space: nowrap;
  color: var(--color-accent);
  font-weight: 700;
}

@media (max-width: 760px) {
  .lesson-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
