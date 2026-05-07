<script setup lang="ts">
import type { AdminCoursesResponse, Course } from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const formatVisibility = (value: Course['visibility']) => {
  if (value === 'published') {
    return 'Publicado'
  }

  if (value === 'archived') {
    return 'Arquivado'
  }

  return 'Rascunho'
}

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))

const defaultCoursesResponse = {
  status: 'success',
  data: []
} satisfies AdminCoursesResponse

const searchTerm = ref('')

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-courses-list',
  () =>
    $fetch('/api/admin/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultCoursesResponse
  }
)

const courses = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'success') {
    return []
  }

  return [...coursesResponse.value.data].sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))
})

const filteredCourses = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  if (!normalizedSearch) {
    return courses.value
  }

  return courses.value.filter((course) => course.title.toLowerCase().includes(normalizedSearch))
})

const coursesErrorMessage = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'error') {
    return ''
  }

  return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos do painel.'
})
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Cursos"
      title="Cursos cadastrados"
      description="Consulte todos os cursos do painel, filtre por titulo e entre na edicao de cada curso."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="list-toolbar">
          <UiInput
            v-model="searchTerm"
            placeholder="Pesquisar por titulo do curso"
          />

          <UiButton to="/admin/cursos/novo" variant="success" size="lg">
            Novo curso
          </UiButton>
        </div>

        <UiSpinner v-if="coursesPending" size="lg" label="Carregando cursos do painel">
          <span class="body-copy">Carregando cursos do painel...</span>
        </UiSpinner>

        <p v-else-if="coursesErrorMessage" class="feedback-message" data-tone="error">
          {{ coursesErrorMessage }}
        </p>

        <p v-else-if="filteredCourses.length === 0" class="body-copy">
          Nenhum curso encontrado com este filtro.
        </p>

        <ul v-else class="list-clean course-list">
          <li v-for="course in filteredCourses" :key="course.id">
            <SurfaceCard as="article">
              <div class="section-stack course-card">
                <div class="course-card-header">
                  <div class="section-stack course-card-copy">
                    <div class="course-card-meta">
                      <span class="pill">{{ formatVisibility(course.visibility) }}</span>
                      <span class="body-copy">Slug: {{ course.slug }}</span>
                    </div>
                    <h2 class="section-title course-card-title">{{ course.title }}</h2>
                    <p class="body-copy">{{ course.shortDescription }}</p>
                  </div>

                  <UiButton :to="`/admin/cursos/${course.slug}`" variant="secondary" size="sm">
                    Editar curso
                  </UiButton>
                </div>

                <div class="course-card-footer">
                  <span class="body-copy">Duracao: {{ course.totalDurationInMinutes }} min</span>
                  <span class="body-copy">Conclusao minima: {{ course.requiredCompletionRate }}%</span>
                  <span class="body-copy">Atualizado em {{ formatTimestamp(course.updatedAt) }}</span>
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
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
}

.course-list {
  display: grid;
  gap: 1rem;
}

.course-card {
  gap: 1rem;
}

.course-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.course-card-copy {
  gap: 0.75rem;
}

.course-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.course-card-title {
  font-size: 1.4rem;
}

.course-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

@media (max-width: 768px) {
  .list-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
