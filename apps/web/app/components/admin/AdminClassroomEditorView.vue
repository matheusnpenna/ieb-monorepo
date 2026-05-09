<script setup lang="ts">
import type {
  AdminClassroomInput,
  AdminClassroomResponse,
  AdminClassroomsResponse,
  AdminCoursesResponse
} from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiField from '../ui/UiField.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSpinner from '../ui/UiSpinner.vue'
import UiTextarea from '../ui/UiTextarea.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'
import { getRequestErrorMessage } from '../../lib/utils'

type FeedbackTone = 'success' | 'error'

const props = defineProps<{
  mode: 'create' | 'edit'
  classroomUuid?: string
}>()

const route = useRoute()
const { openConfirmationModal } = useConfirmationModal()

const formatIsoForDatetimeLocal = (value: string | null) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const normalizeDatetimeLocalToIso = (value: string | null) => {
  const normalizedValue = value?.trim() || ''

  if (!normalizedValue) {
    return null
  }

  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

const buildEmptyClassroomForm = (): AdminClassroomInput => ({
  name: '',
  uuid: crypto.randomUUID(),
  description: '',
  registrationOpen: false,
  registrationStartsAt: null,
  registrationEndsAt: null,
  linkedCourseIds: []
})

const defaultClassroomResponse = {
  status: 'success',
  data: null
} satisfies AdminClassroomResponse

const defaultClassroomsResponse = {
  status: 'success',
  data: []
} satisfies AdminClassroomsResponse

const defaultCoursesResponse = {
  status: 'success',
  data: []
} satisfies AdminCoursesResponse

const { data: classroomsResponse } = await useAsyncData<AdminClassroomsResponse>(
  () => `admin-classroom-uuids-${props.mode}`,
  () =>
    $fetch('/api/admin/classrooms', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultClassroomsResponse
  }
)

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-classroom-courses',
  () =>
    $fetch('/api/admin/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultCoursesResponse
  }
)

const { data: classroomResponse, pending: classroomPending } = await useAsyncData<AdminClassroomResponse>(
  () => `admin-classroom-editor-${props.classroomUuid || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.classroomUuid) {
      return Promise.resolve(defaultClassroomResponse)
    }

    return $fetch(`/api/admin/classrooms/${props.classroomUuid}`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  {
    default: () => defaultClassroomResponse
  }
)

const classroomForm = ref<AdminClassroomInput>(buildEmptyClassroomForm())
const submitPending = ref(false)
const deletePending = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('success')

const isEditing = computed(() => props.mode === 'edit')
const currentClassroom = computed(() =>
  classroomResponse.value?.status === 'success' ? classroomResponse.value.data : null
)
const courses = computed(() => (coursesResponse.value?.status === 'success' ? coursesResponse.value.data : []))
const classroomErrorMessage = computed(() => {
  if (!classroomResponse.value || classroomResponse.value.status !== 'error') {
    return ''
  }

  return classroomResponse.value.messages[0] || 'Nao foi possivel carregar a turma.'
})
const coursesErrorMessage = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'error') {
    return ''
  }

  return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos do painel.'
})
const createClassroomBlockedMessage = computed(() =>
  courses.value.length === 0 ? 'Cadastre pelo menos um curso antes de criar turmas no painel.' : ''
)
const submitLabel = computed(() => (isEditing.value ? 'Salvar alteracoes' : 'Criar turma'))
const pageTitle = computed(() => (isEditing.value ? 'Editar turma' : 'Nova turma'))
const pageDescription = computed(() =>
  isEditing.value
    ? 'Atualize a turma, sua janela de cadastro e os cursos vinculados, mantendo o UUID fixo apos a criacao.'
    : 'Cadastre uma nova turma, gere o UUID automaticamente e escolha os cursos liberados para cadastro.'
)
const registrationOpenValue = computed({
  get: () => (classroomForm.value.registrationOpen ? 'true' : 'false'),
  set: (value: string) => {
    classroomForm.value.registrationOpen = value === 'true'
  }
})
const existingUuids = computed(() => {
  if (!classroomsResponse.value || classroomsResponse.value.status !== 'success') {
    return []
  }

  return classroomsResponse.value.data
    .map((classroom) => classroom.uuid)
    .filter((uuid) => uuid !== currentClassroom.value?.uuid)
})

watch(
  currentClassroom,
  (classroom) => {
    if (!classroom) {
      if (!isEditing.value) {
        classroomForm.value = buildEmptyClassroomForm()
      }
      return
    }

    classroomForm.value = {
      name: classroom.name,
      uuid: classroom.uuid,
      description: classroom.description,
      registrationOpen: classroom.registrationOpen,
      registrationStartsAt: formatIsoForDatetimeLocal(classroom.registrationStartsAt),
      registrationEndsAt: formatIsoForDatetimeLocal(classroom.registrationEndsAt),
      linkedCourseIds: [...classroom.linkedCourseIds]
    }
  },
  { immediate: true }
)

watch(
  () => route.query.status,
  (status) => {
    if (status === 'created') {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Turma criada com sucesso.'
    }
  },
  { immediate: true }
)

const toggleLinkedCourse = (courseId: string, event: Event) => {
  const input = event.target as HTMLInputElement

  if (input.checked) {
    if (!classroomForm.value.linkedCourseIds.includes(courseId)) {
      classroomForm.value.linkedCourseIds = [...classroomForm.value.linkedCourseIds, courseId]
    }

    return
  }

  classroomForm.value.linkedCourseIds = classroomForm.value.linkedCourseIds.filter((linkedCourseId) => linkedCourseId !== courseId)
}

const regenerateUuid = () => {
  if (isEditing.value) {
    return
  }

  const nextUuid = crypto.randomUUID()

  if (existingUuids.value.includes(nextUuid)) {
    regenerateUuid()
    return
  }

  classroomForm.value.uuid = nextUuid
}

const buildPayload = (): AdminClassroomInput => ({
  name: classroomForm.value.name,
  uuid: classroomForm.value.uuid,
  description: classroomForm.value.description,
  registrationOpen: classroomForm.value.registrationOpen,
  registrationStartsAt: normalizeDatetimeLocalToIso(classroomForm.value.registrationStartsAt),
  registrationEndsAt: normalizeDatetimeLocalToIso(classroomForm.value.registrationEndsAt),
  linkedCourseIds: [...classroomForm.value.linkedCourseIds]
})

const onSubmit = async () => {
  if (submitPending.value || (!isEditing.value && !!createClassroomBlockedMessage.value)) {
    return
  }

  submitPending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminClassroomResponse>(
      isEditing.value ? `/api/admin/classrooms/${props.classroomUuid}` : '/api/admin/classrooms',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        credentials: 'include',
        body: buildPayload()
      }
    )

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel salvar a turma.')
    }

    if (isEditing.value) {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Turma atualizada com sucesso.'
      classroomResponse.value = {
        status: 'success',
        data: response.data
      }
      return
    }

    await navigateTo(`/admin/turmas/${response.data.uuid}?status=created`)
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar a turma.')
  } finally {
    submitPending.value = false
  }
}

const onDeleteConfirmed = async () => {
  if (!props.classroomUuid || deletePending.value) {
    return
  }

  deletePending.value = true

  try {
    await $fetch<AdminClassroomResponse>(`/api/admin/classrooms/${props.classroomUuid}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    await navigateTo('/admin/turmas')
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover a turma.')
  } finally {
    deletePending.value = false
  }
}

const onDeleteRequest = () => {
  if (!currentClassroom.value) {
    return
  }

  openConfirmationModal({
    title: 'Excluir turma',
    message: `Deseja realmente excluir a turma ${currentClassroom.value.name}? Esta acao sera registrada no painel administrativo.`,
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel remover a turma.',
        onClick: onDeleteConfirmed
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Turmas"
      :title="pageTitle"
      :description="pageDescription"
    />

    <SurfaceCard>
      <div v-if="coursesPending || classroomPending" class="section-stack">
        <UiSpinner size="lg" label="Carregando turma do painel">
          <span class="body-copy">Carregando turma do painel...</span>
        </UiSpinner>
      </div>

      <div v-else-if="classroomErrorMessage || coursesErrorMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ classroomErrorMessage || coursesErrorMessage }}</p>
        <UiButton to="/admin/turmas" variant="secondary">Voltar para turmas</UiButton>
      </div>

      <div v-else-if="!isEditing && createClassroomBlockedMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ createClassroomBlockedMessage }}</p>
        <UiButton to="/admin/cursos/novo" variant="success">Criar primeiro curso</UiButton>
      </div>

      <form v-else class="section-stack" @submit.prevent="onSubmit">
        <div class="section-stack">
          <p class="body-copy">
            {{ isEditing ? 'O UUID permanece fixo apos a criacao. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' : 'O UUID e gerado automaticamente para a turma. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' }}
          </p>
        </div>

        <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">
          {{ feedbackMessage }}
        </p>

        <UiField label="Nome da turma" required>
          <UiInput v-model="classroomForm.name" placeholder="Ex.: Turma Principal 2026" />
        </UiField>

        <UiField label="UUID" required hint="Use este UUID para montar o link de cadastro da turma.">
          <div class="uuid-field">
            <UiInput :model-value="classroomForm.uuid" disabled />
            <UiButton
              v-if="!isEditing"
              type="button"
              variant="secondary"
              size="sm"
              :disabled="submitPending"
              @click="regenerateUuid"
            >
              Gerar novo UUID
            </UiButton>
          </div>
        </UiField>

        <UiField label="Descricao" required>
          <UiTextarea
            v-model="classroomForm.description"
            :rows="5"
            placeholder="Explique o objetivo da turma, publico esperado e observacoes de cadastro."
          />
        </UiField>

        <div class="form-grid classroom-form-grid">
          <UiField label="Cadastro aberto" required>
            <UiSelect v-model="registrationOpenValue">
              <option value="true">Sim</option>
              <option value="false">Nao</option>
            </UiSelect>
          </UiField>

          <UiField label="Inicio da janela de cadastro" hint="Opcional.">
            <UiInput v-model="classroomForm.registrationStartsAt" type="datetime-local" />
          </UiField>

          <UiField label="Fim da janela de cadastro" hint="Opcional.">
            <UiInput v-model="classroomForm.registrationEndsAt" type="datetime-local" />
          </UiField>
        </div>

        <UiField
          label="Cursos vinculados"
          required
          hint="Selecione os cursos que serao liberados para os alunos desta turma no momento do cadastro."
        >
          <div class="linked-courses-grid">
            <label v-for="course in courses" :key="course.id" class="linked-course-option">
              <input
                type="checkbox"
                :checked="classroomForm.linkedCourseIds.includes(course.id)"
                @change="toggleLinkedCourse(course.id, $event)"
              >
              <span class="body-copy">{{ course.title }}</span>
            </label>
          </div>
        </UiField>

        <div class="form-actions">
          <UiButton type="submit" variant="success" size="lg" :loading="submitPending">
            {{ submitLabel }}
          </UiButton>
          <UiButton to="/admin/turmas" type="button" variant="ghost" size="lg" :disabled="submitPending || deletePending">
            Voltar para turmas
          </UiButton>
          <UiButton
            v-if="isEditing"
            type="button"
            variant="ghost"
            textColor="accent"
            size="lg"
            :disabled="submitPending || deletePending"
            @click="onDeleteRequest"
          >
            Excluir turma
          </UiButton>
        </div>
      </form>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.classroom-form-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.uuid-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.linked-courses-grid {
  display: grid;
  gap: 0.75rem;
}

.linked-course-option {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--ds-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--ds-surface) 82%, black 18%);
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .classroom-form-grid,
  .uuid-field {
    grid-template-columns: 1fr;
  }
}
</style>
