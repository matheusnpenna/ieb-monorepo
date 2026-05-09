<script setup lang="ts">
import type { AdminCoursesResponse, AdminModulesResponse, Course, CourseModule } from '@ieb/shared'
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

const defaultModulesResponse = {
  status: 'success',
  data: []
} satisfies AdminModulesResponse

const defaultCoursesResponse = {
  status: 'success',
  data: []
} satisfies AdminCoursesResponse

const searchTerm = ref('')
const selectedCourseId = ref(typeof route.query.course === 'string' ? route.query.course : 'all')

const { data: modulesResponse, pending: modulesPending } = await useAsyncData<AdminModulesResponse>(
  'admin-modules-list',
  () =>
    $fetch('/api/admin/modules', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultModulesResponse
  }
)

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-modules-courses',
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

const courseById = computed(
  () => new Map(courses.value.map((course) => [course.id, course] as const))
)

const modules = computed(() => {
  if (!modulesResponse.value || modulesResponse.value.status !== 'success') {
    return []
  }

  return [...modulesResponse.value.data].sort((left, right) => {
    const leftCourseTitle = courseById.value.get(left.courseId)?.title || left.courseId
    const rightCourseTitle = courseById.value.get(right.courseId)?.title || right.courseId

    if (leftCourseTitle !== rightCourseTitle) {
      return leftCourseTitle.localeCompare(rightCourseTitle, 'pt-BR')
    }

    if (left.order !== right.order) {
      return left.order - right.order
    }

    return left.title.localeCompare(right.title, 'pt-BR')
  })
})

const filteredModules = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  return modules.value.filter((module) => {
    if (selectedCourseId.value !== 'all' && module.courseId !== selectedCourseId.value) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return module.title.toLowerCase().includes(normalizedSearch)
  })
})

const groupedModules = computed(() => {
  const groups = new Map<
    string,
    {
      course: Course | null
      modules: CourseModule[]
    }
  >()

  for (const module of filteredModules.value) {
    const existingGroup = groups.get(module.courseId)

    if (existingGroup) {
      existingGroup.modules.push(module)
      continue
    }

    groups.set(module.courseId, {
      course: courseById.value.get(module.courseId) || null,
      modules: [module]
    })
  }

  return [...groups.entries()]
    .map(([courseId, group]) => ({
      courseId,
      course: group.course,
      modules: group.modules
    }))
    .sort((left, right) => {
      const leftTitle = left.course?.title || left.courseId
      const rightTitle = right.course?.title || right.courseId

      return leftTitle.localeCompare(rightTitle, 'pt-BR')
    })
})

const modulesErrorMessage = computed(() => {
  if (!modulesResponse.value || modulesResponse.value.status !== 'error') {
    return ''
  }

  return modulesResponse.value.messages[0] || 'Nao foi possivel carregar os modulos do painel.'
})

const coursesErrorMessage = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'error') {
    return ''
  }

  return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos do painel.'
})

const listErrorMessage = computed(() => modulesErrorMessage.value || coursesErrorMessage.value)

const newModuleHref = computed(() =>
  selectedCourseId.value !== 'all' ? `/admin/modulos/novo?course=${selectedCourseId.value}` : '/admin/modulos/novo'
)
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Modulos"
      title="Modulos cadastrados"
      description="Encontre modulos pelo titulo, filtre por curso e entre na edicao para ajustes ou exclusao."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="list-toolbar modules-toolbar">
          <UiInput
            v-model="searchTerm"
            placeholder="Pesquisar por titulo do modulo"
          />

          <UiSelect v-model="selectedCourseId">
            <option value="all">Todos os cursos</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </UiSelect>

          <UiButton :to="newModuleHref" variant="success" size="lg">
            Novo modulo
          </UiButton>
        </div>

        <UiSpinner v-if="modulesPending || coursesPending" size="lg" label="Carregando modulos do painel">
          <span class="body-copy">Carregando modulos do painel...</span>
        </UiSpinner>

        <p v-else-if="listErrorMessage" class="feedback-message" data-tone="error">
          {{ listErrorMessage }}
        </p>

        <p v-else-if="groupedModules.length === 0" class="body-copy">
          Nenhum modulo encontrado com os filtros atuais.
        </p>

        <div v-else class="section-stack grouped-modules">
          <section v-for="group in groupedModules" :key="group.courseId" class="section-stack">
            <div class="group-header">
              <div class="section-stack group-copy">
                <h2 class="section-title">{{ group.course?.title || 'Curso indisponivel' }}</h2>
                <p class="body-copy">
                  {{ group.course ? `${group.modules.length} modulo(s) neste curso.` : `Curso vinculado: ${group.courseId}` }}
                </p>
              </div>
            </div>

            <ul class="list-clean module-list">
              <li v-for="module in group.modules" :key="module.id">
                <SurfaceCard as="article">
                  <div class="section-stack module-card">
                    <div class="module-card-header">
                      <div class="section-stack module-card-copy">
                        <div class="module-card-meta">
                          <span class="pill">Ordem {{ module.order }}</span>
                          <span class="body-copy">Slug: {{ module.slug }}</span>
                        </div>
                        <h3 class="section-title module-card-title">{{ module.title }}</h3>
                        <p class="body-copy">{{ module.description }}</p>
                      </div>

                      <UiButton :to="`/admin/modulos/${module.slug}`" variant="secondary" size="sm">
                        Editar modulo
                      </UiButton>
                    </div>

                    <div class="module-card-footer">
                      <span class="body-copy">Aulas: {{ module.lessonIds.length }}</span>
                      <span class="body-copy">Avaliacoes: {{ module.assessmentIds.length }}</span>
                      <span class="body-copy">Duracao estimada: {{ module.estimatedDurationInMinutes }} min</span>
                      <span class="body-copy">Atualizado em {{ formatTimestamp(module.updatedAt) }}</span>
                    </div>
                  </div>
                </SurfaceCard>
              </li>
            </ul>
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

.modules-toolbar {
  grid-template-columns: minmax(0, 1.3fr) minmax(220px, 0.8fr) auto;
}

.grouped-modules {
  gap: 1.5rem;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.group-copy {
  gap: 0.35rem;
}

.module-list {
  display: grid;
  gap: 1rem;
}

.module-card {
  gap: 1rem;
}

.module-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.module-card-copy {
  gap: 0.75rem;
}

.module-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.module-card-title {
  font-size: 1.3rem;
}

.module-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

@media (max-width: 960px) {
  .modules-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
