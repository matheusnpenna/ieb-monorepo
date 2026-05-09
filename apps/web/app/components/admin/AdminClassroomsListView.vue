<script setup lang="ts">
import type { AdminClassroomsResponse, Classroom } from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const formatRegistrationStatus = (value: Classroom['registrationOpen']) => (value ? 'Cadastro aberto' : 'Cadastro fechado')

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return 'nao definida'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

const defaultClassroomsResponse = {
  status: 'success',
  data: []
} satisfies AdminClassroomsResponse

const searchTerm = ref('')

const { data: classroomsResponse, pending: classroomsPending } = await useAsyncData<AdminClassroomsResponse>(
  'admin-classrooms-list',
  () =>
    $fetch('/api/admin/classrooms', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultClassroomsResponse
  }
)

const classrooms = computed(() => {
  if (!classroomsResponse.value || classroomsResponse.value.status !== 'success') {
    return []
  }

  return [...classroomsResponse.value.data].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
})

const filteredClassrooms = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  if (!normalizedSearch) {
    return classrooms.value
  }

  return classrooms.value.filter((classroom) => classroom.name.toLowerCase().includes(normalizedSearch))
})

const classroomsErrorMessage = computed(() => {
  if (!classroomsResponse.value || classroomsResponse.value.status !== 'error') {
    return ''
  }

  return classroomsResponse.value.messages[0] || 'Nao foi possivel carregar as turmas do painel.'
})
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Turmas"
      title="Turmas cadastradas"
      description="Consulte as turmas do painel, filtre por nome e entre na edicao para revisar cadastro, janela e cursos vinculados."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="list-toolbar">
          <UiInput v-model="searchTerm" placeholder="Pesquisar por nome da turma" />

          <UiButton to="/admin/turmas/novo" variant="success" size="lg">
            Nova turma
          </UiButton>
        </div>

        <UiSpinner v-if="classroomsPending" size="lg" label="Carregando turmas do painel">
          <span class="body-copy">Carregando turmas do painel...</span>
        </UiSpinner>

        <p v-else-if="classroomsErrorMessage" class="feedback-message" data-tone="error">
          {{ classroomsErrorMessage }}
        </p>

        <p v-else-if="filteredClassrooms.length === 0" class="body-copy">
          Nenhuma turma encontrada com este filtro.
        </p>

        <ul v-else class="list-clean classroom-list">
          <li v-for="classroom in filteredClassrooms" :key="classroom.id">
            <SurfaceCard as="article">
              <div class="section-stack classroom-card">
                <div class="classroom-card-header">
                  <div class="section-stack classroom-card-copy">
                    <div class="classroom-card-meta">
                      <span class="pill">{{ formatRegistrationStatus(classroom.registrationOpen) }}</span>
                      <span class="body-copy">UUID: {{ classroom.uuid }}</span>
                    </div>
                    <h2 class="section-title classroom-card-title">{{ classroom.name }}</h2>
                    <p class="body-copy">{{ classroom.description }}</p>
                  </div>

                  <UiButton :to="`/admin/turmas/${classroom.uuid}`" variant="secondary" size="sm">
                    Editar turma
                  </UiButton>
                </div>

                <div class="classroom-card-footer">
                  <span class="body-copy">Cursos vinculados: {{ classroom.linkedCourseIds.length }}</span>
                  <span class="body-copy">Inicio do cadastro: {{ formatTimestamp(classroom.registrationStartsAt) }}</span>
                  <span class="body-copy">Fim do cadastro: {{ formatTimestamp(classroom.registrationEndsAt) }}</span>
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

.classroom-list {
  display: grid;
  gap: 1rem;
}

.classroom-card {
  gap: 1rem;
}

.classroom-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.classroom-card-copy {
  gap: 0.75rem;
}

.classroom-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.classroom-card-title {
  font-size: 1.4rem;
}

.classroom-card-footer {
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
