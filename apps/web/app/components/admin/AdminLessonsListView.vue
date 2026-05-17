<script setup lang="ts">
import type { AdminCoursesResponse, AdminLessonsResponse, AdminModulesResponse, Course, CourseModule, Lesson } from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const route = useRoute()

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))

const formatContentType = (value: Lesson['contentType']) => {
  if (value === 'audio') {
    return 'Audio'
  }

  if (value === 'text') {
    return 'Texto'
  }

  if (value === 'pdf') {
    return 'PDF'
  }

  return 'Video'
}

const defaultLessonsResponse = {
  status: 'success',
  data: []
} satisfies AdminLessonsResponse

const defaultCoursesResponse = {
  status: 'success',
  data: []
} satisfies AdminCoursesResponse

const defaultModulesResponse = {
  status: 'success',
  data: []
} satisfies AdminModulesResponse

const searchTerm = ref('')
const selectedCourseId = ref(typeof route.query.course === 'string' ? route.query.course : '')
const selectedModuleId = ref(typeof route.query.module === 'string' ? route.query.module : '')
const hasRequiredFilters = computed(() => Boolean(selectedCourseId.value && selectedModuleId.value))

const { data: lessonsResponse, pending: lessonsPending } = await useAsyncData<AdminLessonsResponse>(
  () => `admin-lessons-list-${selectedCourseId.value || 'empty'}-${selectedModuleId.value || 'empty'}`,
  () => {
    if (!hasRequiredFilters.value) {
      return Promise.resolve(defaultLessonsResponse)
    }

    return $fetch('/api/admin/lessons', {
      credentials: 'include',
      ignoreResponseError: true,
      query: {
        courseId: selectedCourseId.value,
        moduleId: selectedModuleId.value
      }
    })
  },
  {
    default: () => defaultLessonsResponse,
    watch: [selectedCourseId, selectedModuleId]
  }
)

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-lessons-courses',
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
  'admin-lessons-modules',
  () =>
    $fetch('/api/admin/modules', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultModulesResponse
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

  return [...modulesResponse.value.data].sort((left, right) => {
    if (left.courseId !== right.courseId) {
      return left.courseId.localeCompare(right.courseId, 'pt-BR')
    }

    if (left.order !== right.order) {
      return left.order - right.order
    }

    return left.title.localeCompare(right.title, 'pt-BR')
  })
})

const courseById = computed(() => new Map(courses.value.map((course) => [course.id, course] as const)))
const moduleById = computed(() => new Map(modules.value.map((module) => [module.id, module] as const)))

const availableModulesForFilter = computed(() => {
  if (!selectedCourseId.value) {
    return []
  }

  return modules.value.filter((module) => module.courseId === selectedCourseId.value)
})

watch(
  selectedCourseId,
  () => {
    if (
      selectedModuleId.value &&
      !availableModulesForFilter.value.some((module) => module.id === selectedModuleId.value)
    ) {
      selectedModuleId.value = ''
    }
  }
)

const lessons = computed(() => {
  if (!lessonsResponse.value || lessonsResponse.value.status !== 'success') {
    return []
  }

  return [...lessonsResponse.value.data].sort((left, right) => {
    const leftCourseTitle = courseById.value.get(left.courseId)?.title || left.courseId
    const rightCourseTitle = courseById.value.get(right.courseId)?.title || right.courseId

    if (leftCourseTitle !== rightCourseTitle) {
      return leftCourseTitle.localeCompare(rightCourseTitle, 'pt-BR')
    }

    const leftModuleTitle = moduleById.value.get(left.moduleId)?.title || left.moduleId
    const rightModuleTitle = moduleById.value.get(right.moduleId)?.title || right.moduleId

    if (leftModuleTitle !== rightModuleTitle) {
      return leftModuleTitle.localeCompare(rightModuleTitle, 'pt-BR')
    }

    if (left.order !== right.order) {
      return left.order - right.order
    }

    return left.title.localeCompare(right.title, 'pt-BR')
  })
})

const filteredLessons = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  return lessons.value.filter((lesson) => {
    if (!normalizedSearch) {
      return true
    }

    return lesson.title.toLowerCase().includes(normalizedSearch)
  })
})

const groupedLessons = computed(() => {
  const groups = new Map<
    string,
    {
      course: Course | null
      modules: Map<
        string,
        {
          module: CourseModule | null
          lessons: Lesson[]
        }
      >
    }
  >()

  for (const lesson of filteredLessons.value) {
    const existingCourseGroup = groups.get(lesson.courseId) || {
      course: courseById.value.get(lesson.courseId) || null,
      modules: new Map()
    }

    const existingModuleGroup = existingCourseGroup.modules.get(lesson.moduleId) || {
      module: moduleById.value.get(lesson.moduleId) || null,
      lessons: []
    }

    existingModuleGroup.lessons.push(lesson)
    existingCourseGroup.modules.set(lesson.moduleId, existingModuleGroup)
    groups.set(lesson.courseId, existingCourseGroup)
  }

  return [...groups.entries()]
    .map(([courseId, group]) => ({
      courseId,
      course: group.course,
      modules: [...group.modules.entries()]
        .map(([moduleId, moduleGroup]) => ({
          moduleId,
          module: moduleGroup.module,
          lessons: moduleGroup.lessons
        }))
        .sort((left, right) => {
          const leftTitle = left.module?.title || left.moduleId
          const rightTitle = right.module?.title || right.moduleId

          return leftTitle.localeCompare(rightTitle, 'pt-BR')
        })
    }))
    .sort((left, right) => {
      const leftTitle = left.course?.title || left.courseId
      const rightTitle = right.course?.title || right.courseId

      return leftTitle.localeCompare(rightTitle, 'pt-BR')
    })
})

const lessonsErrorMessage = computed(() => {
  if (!lessonsResponse.value || lessonsResponse.value.status !== 'error') {
    return ''
  }

  return lessonsResponse.value.messages[0] || 'Nao foi possivel carregar as aulas do painel.'
})

const coursesErrorMessage = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'error') {
    return ''
  }

  return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos do painel.'
})

const modulesErrorMessage = computed(() => {
  if (!modulesResponse.value || modulesResponse.value.status !== 'error') {
    return ''
  }

  return modulesResponse.value.messages[0] || 'Nao foi possivel carregar os modulos do painel.'
})

const listErrorMessage = computed(
  () => lessonsErrorMessage.value || coursesErrorMessage.value || modulesErrorMessage.value
)

const newLessonHref = computed(() => {
  const searchParams = new URLSearchParams()

  if (selectedCourseId.value) {
    searchParams.set('course', selectedCourseId.value)
  }

  if (selectedModuleId.value) {
    searchParams.set('module', selectedModuleId.value)
  }

  const query = searchParams.toString()

  return query ? `/admin/aulas/novo?${query}` : '/admin/aulas/novo'
})
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Aulas"
      title="Aulas cadastradas"
      description="Encontre aulas pelo titulo, filtre por curso e modulo e entre na edicao para ajustes ou exclusao."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="list-toolbar lessons-toolbar">
          <UiInput
            v-model="searchTerm"
            placeholder="Pesquisar por titulo da aula"
            :disabled="!hasRequiredFilters"
          />

          <UiSelect v-model="selectedCourseId">
            <option value="" disabled>Selecione um curso</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </UiSelect>

          <UiSelect v-model="selectedModuleId" :disabled="!selectedCourseId">
            <option value="" disabled>Selecione um modulo</option>
            <option v-for="module in availableModulesForFilter" :key="module.id" :value="module.id">
              {{ module.title }}
            </option>
          </UiSelect>

          <UiButton :to="newLessonHref" variant="success" size="lg">
            Nova aula
          </UiButton>
        </div>

        <UiSpinner
          v-if="hasRequiredFilters && (lessonsPending || coursesPending || modulesPending)"
          size="lg"
          label="Carregando aulas do painel"
        >
          <span class="body-copy">Carregando aulas do painel...</span>
        </UiSpinner>

        <p v-else-if="!hasRequiredFilters" class="body-copy">
          Selecione primeiro um curso e um modulo para carregar a lista de aulas.
        </p>

        <p v-else-if="listErrorMessage" class="feedback-message" data-tone="error">
          {{ listErrorMessage }}
        </p>

        <p v-else-if="groupedLessons.length === 0" class="body-copy">
          Nenhuma aula encontrada com os filtros atuais.
        </p>

        <div v-else class="section-stack grouped-lessons">
          <section v-for="courseGroup in groupedLessons" :key="courseGroup.courseId" class="section-stack">
            <div class="group-header">
              <div class="section-stack group-copy">
                <h2 class="section-title">{{ courseGroup.course?.title || 'Curso indisponivel' }}</h2>
                <p class="body-copy">
                  {{ courseGroup.course ? `${courseGroup.modules.length} modulo(s) com aulas neste curso.` : `Curso vinculado: ${courseGroup.courseId}` }}
                </p>
              </div>
            </div>

            <div class="section-stack nested-groups">
              <section v-for="moduleGroup in courseGroup.modules" :key="moduleGroup.moduleId" class="section-stack">
                <div class="section-stack nested-header">
                  <h3 class="section-title nested-title">{{ moduleGroup.module?.title || 'Modulo indisponivel' }}</h3>
                  <p class="body-copy">
                    {{ moduleGroup.lessons.length }} aula(s) neste modulo.
                  </p>
                </div>

                <ul class="list-clean lesson-list">
                  <li v-for="lesson in moduleGroup.lessons" :key="lesson.id">
                    <SurfaceCard as="article">
                      <div class="section-stack lesson-card">
                        <div class="lesson-card-header">
                          <div class="section-stack lesson-card-copy">
                            <div class="lesson-card-meta">
                              <span class="pill">Ordem {{ lesson.order }}</span>
                              <span class="body-copy">{{ formatContentType(lesson.contentType) }}</span>
                              <span class="body-copy">Slug: {{ lesson.slug }}</span>
                            </div>
                            <h4 class="section-title lesson-card-title">{{ lesson.title }}</h4>
                            <p class="body-copy">{{ lesson.description }}</p>
                          </div>

                          <UiButton :to="`/admin/aulas/${lesson.slug}`" variant="secondary" size="sm">
                            Editar aula
                          </UiButton>
                        </div>

                        <div class="lesson-card-footer">
                          <span class="body-copy">Duracao: {{ lesson.durationInMinutes }} min</span>
                          <span class="body-copy">Conclusao manual: {{ lesson.allowManualCompletion ? 'Sim' : 'Nao' }}</span>
                          <span class="body-copy">Atualizado em {{ formatTimestamp(lesson.updatedAt) }}</span>
                        </div>
                      </div>
                    </SurfaceCard>
                  </li>
                </ul>
              </section>
            </div>
          </section>
        </div>
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

.lessons-toolbar {
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr) minmax(220px, 0.8fr) auto;
}

.grouped-lessons,
.nested-groups {
  gap: 1.5rem;
}

.group-header,
.nested-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.group-copy,
.nested-header {
  gap: 0.35rem;
}

.nested-title {
  font-size: 1.15rem;
}

.lesson-list {
  display: grid;
  gap: 1rem;
}

.lesson-card {
  gap: 1rem;
}

.lesson-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.lesson-card-copy {
  gap: 0.75rem;
}

.lesson-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.lesson-card-title {
  font-size: 1.25rem;
}

.lesson-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

@media (max-width: 1080px) {
  .lessons-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
