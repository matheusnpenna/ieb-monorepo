<script setup lang="ts">
import type { CourseListResponse } from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import CourseGrid from './CourseGrid.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const buildCourseMeta = (moduleCount: number, totalDurationInMinutes: number) => {
  if (moduleCount > 0) {
    return moduleCount === 1 ? '1 modulo' : `${moduleCount} modulos`
  }

  if (totalDurationInMinutes > 0) {
    return `${totalDurationInMinutes} min`
  }

  return 'Curso'
}

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
</script>

<template>
  <section class="section-stack pt-4">
    <PageIntro
      eyebrow="Cursos"
      title="Todos os cursos que você tem acesso"
      description="Aqui estão todos os cursos que você tem acesso."
    />

    <UiSpinner v-if="coursesPending" size="lg" label="Carregando cursos">
      <span class="body-copy">Carregando cursos...</span>
    </UiSpinner>
    <p v-else-if="coursesErrorMessage" class="body-copy">{{ coursesErrorMessage }}</p>
    <p v-else-if="courses.length === 0" class="body-copy">Nenhum curso disponivel para sua conta no momento.</p>

    <CourseGrid :items="courses" />
  </section>
</template>
