<script setup lang="ts">
import type { CourseDetailResponse } from '@ieb/shared'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'
import UiButton from '../../../components/ui/UiButton.vue'
import PageIntro from '../../../components/base/PageIntro.vue'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))

const defaultCourseDetailResponse = {
  status: 'success',
  data: null
} satisfies CourseDetailResponse

const { data: courseDetailResponse, pending: coursePending } = await useAsyncData<CourseDetailResponse>(
  () => `course-detail-${courseSlug.value}`,
  () =>
    $fetch(`/api/courses/${courseSlug.value}`, {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    watch: [courseSlug],
    default: () => defaultCourseDetailResponse
  }
)

const course = computed(() => {
  if (!courseDetailResponse.value || courseDetailResponse.value.status !== 'success') {
    return null
  }

  return courseDetailResponse.value.data?.course || null
})

const modules = computed(() => {
  if (!courseDetailResponse.value || courseDetailResponse.value.status !== 'success') {
    return []
  }

  return (courseDetailResponse.value.data?.modules || []).map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    lessonCountLabel: module.lessonIds.length === 1 ? '1 aula' : `${module.lessonIds.length} aulas`,
    href: `/curso/${courseSlug.value}/modulo/${module.slug}`
  }))
})

const startCourseHref = computed(() => {
  if (!courseDetailResponse.value || courseDetailResponse.value.status !== 'success') {
    return null
  }

  return courseDetailResponse.value.data?.actions.startCourseHref || null
})

const continueWatchingHref = computed(() => {
  if (!courseDetailResponse.value || courseDetailResponse.value.status !== 'success') {
    return null
  }

  return courseDetailResponse.value.data?.actions.continueWatchingHref || null
})

const courseErrorMessage = computed(() => {
  if (!courseDetailResponse.value || courseDetailResponse.value.status !== 'error') {
    return ''
  }

  return courseDetailResponse.value.messages[0] || 'Nao foi possivel carregar o curso.'
})

const modulesInfoTitle = computed(() => {
  if (!course.value) {
    return 'Módulos'
  }

  return `${course.value.moduleIds.length} módulos neste curso`
})

useSeoMeta({
  title: computed(() => (course.value?.title ? `Curso ${course.value.title}` : `Curso ${courseSlug.value || ''}`).trim())
})
</script>

<template>
  <div class="section-stack">
    <SurfaceCard>
      <div class="section-stack">
        <span class="pill w-fit">Curso</span>
        <h1 class="display-title">{{ course?.title || courseSlug }}</h1>
        <p v-if="coursePending" class="body-copy">Carregando detalhes do curso...</p>
        <p v-else-if="courseErrorMessage" class="body-copy">{{ courseErrorMessage }}</p>
        <p v-else class="body-copy">
          {{ course?.description || 'Esta tela concentra informacoes do curso, progresso percentual, certificado e modulos disponiveis.' }}
        </p>

        <div v-if="!coursePending && !courseErrorMessage" class="course-actions">
          <UiButton :to="startCourseHref || undefined" :disabled="!startCourseHref" size="lg">
            Iniciar curso
          </UiButton>
          <UiButton v-if="continueWatchingHref" :to="continueWatchingHref" variant="secondary" size="lg">
            Continuar assistindo
          </UiButton>
        </div>
      </div>
    </SurfaceCard>

    <PageIntro
      eyebrow="Módulos"
      :title="modulesInfoTitle"
      description="Confira os módulos disponíveis para este curso."
    />

    <section v-if="modules.length > 0" class="modules-grid">
      <SurfaceCard v-for="module in modules" :key="module.id" as="article" class="module-card">
        <div class="section-stack module-card-content">
          <h2 class="section-title">{{ module.title }}</h2>
          <p class="body-copy module-description">{{ module.description }}</p>
          <p class="module-meta">{{ module.lessonCountLabel }}</p>
          <NuxtLink :to="module.href" class="button-secondary module-link">Abrir modulo</NuxtLink>
        </div>
      </SurfaceCard>
    </section>

    <SurfaceCard v-else-if="!coursePending && !courseErrorMessage">
      <p class="body-copy">Nenhum modulo disponivel para este curso no momento.</p>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.course-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;
}

.module-card {
  height: 100%;
}

.module-card-content {
  height: 100%;
}

.module-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  line-clamp: 5;
}

.module-link {
  margin-top: auto;
  align-self: flex-start;
}

.module-meta {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

@media (min-width: 700px) {
  .modules-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1080px) {
  .modules-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
