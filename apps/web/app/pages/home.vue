<script setup lang="ts">
import type { CourseListResponse } from '@ieb/shared'
import PageIntro from '../components/base/PageIntro.vue'
import FeaturedBanner from '../components/content/FeaturedBanner.vue'
import MetricCard from '../components/admin/MetricCard.vue'
import CourseGrid from '../components/content/CourseGrid.vue'

definePageMeta({
  layout: 'content'
})

useSeoMeta({
  title: 'Home'
})

const buildCourseMeta = (moduleCount: number, totalDurationInMinutes: number) => {
  if (moduleCount > 0) {
    return moduleCount === 1 ? '1 modulo' : `${moduleCount} modulos`
  }

  if (totalDurationInMinutes > 0) {
    return `${totalDurationInMinutes} min`
  }

  return 'Curso'
}

const featuredSlides = [
  {
    id: 'slide-1',
    title: 'Novos cursos para lideranca e discipulado',
    description: 'Espaco reservado para noticias, lancamentos e avisos da plataforma.',
    badge: 'Destaques'
  }
]

const defaultCourseResponse = {
  status: 'success',
  data: []
} satisfies CourseListResponse

const { data: courseResponse, pending: coursesPending } = await useAsyncData<CourseListResponse>(
  'home-courses',
  () =>
    $fetch('/api/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultCourseResponse
  }
)

const courses = computed(() => {
  if (!courseResponse.value || courseResponse.value.status !== 'success') {
    return []
  }

  return courseResponse.value.data.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription,
    coverImageUrl: course.coverImageUrl,
    meta: buildCourseMeta(course.moduleIds.length, course.totalDurationInMinutes)
  }))
})

const coursesErrorMessage = computed(() => {
  if (!courseResponse.value || courseResponse.value.status !== 'error') {
    return ''
  }

  return courseResponse.value.messages[0] || 'Nao foi possivel carregar os cursos.'
})

const metrics = [
  { label: 'Continuar assistindo', value: 'Aula 04', detail: 'Retomar o ultimo video assistido.' },
  { label: 'Cursos concluidos', value: '03', detail: 'Resumo de certificados liberados.' }
]
</script>

<template>
  <div class="section-stack">
    <FeaturedBanner
      v-for="slide in featuredSlides"
      :key="slide.id"
      :badge="slide.badge"
      :title="slide.title"
      :description="slide.description"
    />

    <section class="grid-cards">
      <MetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :detail="metric.detail"
      />
    </section>

    <section class="section-stack pt-4">
      <PageIntro
        eyebrow="Cursos"
        title="Todos os cursos que você tem acesso"
        description="Aqui estão todos os cursos que você tem acesso."
      />

      <p v-if="coursesPending" class="body-copy">Carregando cursos...</p>
      <p v-else-if="coursesErrorMessage" class="body-copy">{{ coursesErrorMessage }}</p>
      <p v-else-if="courses.length === 0" class="body-copy">Nenhum curso disponivel para sua conta no momento.</p>

      <CourseGrid :items="courses" />
    </section>
  </div>
</template>
