<script setup lang="ts">
import type { AdminCourseInput, AdminCourseResponse, AdminCoursesResponse, Course } from '@ieb/shared'
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

const visibilityOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Arquivado' }
] as const

const buildEmptyCourseForm = (): AdminCourseInput => ({
  title: '',
  slug: '',
  shortDescription: '',
  description: '',
  visibility: 'draft',
  coverImageUrl: null,
  heroImageUrl: null,
  totalDurationInMinutes: 0,
  requiredCompletionRate: 80,
  certificateEnabled: true
})

const normalizeCourseSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

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

const { openConfirmationModal } = useConfirmationModal()
const { data: coursesResponse, pending: coursesPending, refresh: refreshCourses } = await useAsyncData<AdminCoursesResponse>(
  'admin-courses-management',
  () =>
    $fetch('/api/admin/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultCoursesResponse
  }
)

const courseForm = ref<AdminCourseInput>(buildEmptyCourseForm())
const formFeedbackMessage = ref('')
const formFeedbackTone = ref<FeedbackTone>('success')
const formSubmitPending = ref(false)
const busyCourseSlug = ref<string | null>(null)
const editingCourseSlug = ref<string | null>(null)
const hasManualSlugEdit = ref(false)

const courses = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'success') {
    return []
  }

  return [...coursesResponse.value.data].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  )
})

const coursesErrorMessage = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'error') {
    return ''
  }

  return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos do painel.'
})

const isEditing = computed(() => Boolean(editingCourseSlug.value))
const submitLabel = computed(() => (isEditing.value ? 'Salvar alteracoes' : 'Criar curso'))
const submitFeedbackLabel = computed(() =>
  isEditing.value ? 'Curso atualizado com sucesso.' : 'Curso criado com sucesso.'
)
const certificateEnabledValue = computed({
  get: () => (courseForm.value.certificateEnabled ? 'true' : 'false'),
  set: (value: string) => {
    courseForm.value.certificateEnabled = value === 'true'
  }
})

const resetForm = () => {
  courseForm.value = buildEmptyCourseForm()
  editingCourseSlug.value = null
  hasManualSlugEdit.value = false
}

const applyCourseToForm = (course: Course) => {
  courseForm.value = {
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription,
    description: course.description,
    visibility: course.visibility,
    coverImageUrl: course.coverImageUrl,
    heroImageUrl: course.heroImageUrl,
    totalDurationInMinutes: course.totalDurationInMinutes,
    requiredCompletionRate: course.requiredCompletionRate,
    certificateEnabled: course.certificateEnabled
  }
  editingCourseSlug.value = course.slug
  hasManualSlugEdit.value = true
  formFeedbackMessage.value = ''
}

const onTitleInput = (value: string) => {
  courseForm.value.title = value

  if (!hasManualSlugEdit.value && !isEditing.value) {
    courseForm.value.slug = normalizeCourseSlug(value)
  }
}

const onSlugInput = (value: string) => {
  hasManualSlugEdit.value = true
  courseForm.value.slug = normalizeCourseSlug(value)
}

const normalizeOptionalUrl = (value: string | null) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

const buildPayload = (): AdminCourseInput => ({
  title: courseForm.value.title,
  slug: courseForm.value.slug,
  shortDescription: courseForm.value.shortDescription,
  description: courseForm.value.description,
  visibility: courseForm.value.visibility,
  coverImageUrl: normalizeOptionalUrl(courseForm.value.coverImageUrl),
  heroImageUrl: normalizeOptionalUrl(courseForm.value.heroImageUrl),
  totalDurationInMinutes: Number(courseForm.value.totalDurationInMinutes || 0),
  requiredCompletionRate: Number(courseForm.value.requiredCompletionRate || 0),
  certificateEnabled: Boolean(courseForm.value.certificateEnabled)
})

const persistCourse = async () => {
  const payload = buildPayload()
  const response = await $fetch<AdminCourseResponse>(
    isEditing.value ? `/api/admin/courses/${editingCourseSlug.value}` : '/api/admin/courses',
    {
      method: isEditing.value ? 'PATCH' : 'POST',
      credentials: 'include',
      body: payload
    }
  )

  if (response.status !== 'success') {
    throw new Error('Nao foi possivel salvar o curso.')
  }
}

const onSubmit = async () => {
  if (formSubmitPending.value) {
    return
  }

  formSubmitPending.value = true
  formFeedbackMessage.value = ''

  try {
    await persistCourse()
    formFeedbackTone.value = 'success'
    formFeedbackMessage.value = submitFeedbackLabel.value
    await refreshCourses()
    resetForm()
  } catch (error) {
    formFeedbackTone.value = 'error'
    formFeedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar o curso.')
  } finally {
    formSubmitPending.value = false
  }
}

const deleteCourse = async (course: Course) => {
  busyCourseSlug.value = course.slug

  try {
    await $fetch<AdminCourseResponse>(`/api/admin/courses/${course.slug}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    formFeedbackTone.value = 'success'
    formFeedbackMessage.value = 'Curso removido com sucesso.'

    if (editingCourseSlug.value === course.slug) {
      resetForm()
    }

    await refreshCourses()
  } catch (error) {
    formFeedbackTone.value = 'error'
    formFeedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover o curso.')
  } finally {
    busyCourseSlug.value = null
  }
}

const onDeleteRequest = (course: Course) => {
  openConfirmationModal({
    title: 'Excluir curso',
    message: `Deseja realmente excluir o curso ${course.title}? Esta acao sera registrada no painel administrativo.`,
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel remover o curso.',
        onClick: () => deleteCourse(course)
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Cursos"
      title="Gestao de cursos"
      description="Cadastre, edite e arquive cursos da plataforma com rastreabilidade de autoria, data e hora."
    />

    <div class="admin-course-layout">
      <SurfaceCard>
        <form class="section-stack" @submit.prevent="onSubmit">
          <div class="section-stack">
            <h2 class="section-title">{{ isEditing ? 'Editar curso' : 'Novo curso' }}</h2>
            <p class="body-copy">
              {{ isEditing ? 'O slug fica bloqueado apos a criacao porque ele identifica o documento no Firestore.' : 'Preencha os dados principais para criar um curso novo.' }}
            </p>
          </div>

          <p v-if="formFeedbackMessage" class="feedback-message" :data-tone="formFeedbackTone">
            {{ formFeedbackMessage }}
          </p>

          <div class="form-grid course-form-grid">
            <UiField label="Titulo" required>
              <UiInput
                :model-value="courseForm.title"
                placeholder="Ex.: Curso de Lideranca"
                @update:model-value="onTitleInput"
              />
            </UiField>

            <UiField
              label="Slug"
              required
              :hint="isEditing ? 'O slug permanece fixo apos a criacao do curso.' : 'Use letras minusculas, numeros e hifens.'"
            >
              <UiInput
                :model-value="courseForm.slug"
                :disabled="isEditing"
                placeholder="curso-de-lideranca"
                @update:model-value="onSlugInput"
              />
            </UiField>

            <UiField label="Visibilidade" required>
              <UiSelect v-model="courseForm.visibility">
                <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </UiSelect>
            </UiField>

            <UiField label="Certificado habilitado" required>
              <UiSelect v-model="certificateEnabledValue">
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </UiSelect>
            </UiField>

            <UiField label="Duracao total em minutos" required>
              <UiInput v-model="courseForm.totalDurationInMinutes" type="number" min="0" />
            </UiField>

            <UiField label="Progresso minimo para conclusao (%)" required>
              <UiInput v-model="courseForm.requiredCompletionRate" type="number" min="0" max="100" />
            </UiField>

            <UiField label="URL da capa">
              <UiInput v-model="courseForm.coverImageUrl" placeholder="https://..." />
            </UiField>

            <UiField label="URL do hero">
              <UiInput v-model="courseForm.heroImageUrl" placeholder="https://..." />
            </UiField>
          </div>

          <UiField label="Descricao curta" required>
            <UiTextarea v-model="courseForm.shortDescription" :rows="3" placeholder="Resumo curto do curso." />
          </UiField>

          <UiField label="Descricao completa" required>
            <UiTextarea v-model="courseForm.description" :rows="6" placeholder="Detalhes completos do curso." />
          </UiField>

          <div class="form-actions">
            <UiButton type="submit" variant="success" size="lg" :loading="formSubmitPending">
              {{ submitLabel }}
            </UiButton>
            <UiButton
              v-if="isEditing"
              type="button"
              variant="ghost"
              size="lg"
              :disabled="formSubmitPending"
              @click="resetForm"
            >
              Cancelar edicao
            </UiButton>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard>
        <div class="section-stack">
          <div class="section-stack">
            <h2 class="section-title">Cursos cadastrados</h2>
            <p class="body-copy">Todos os cursos ativos do painel, com status de publicacao e ultima atualizacao.</p>
          </div>

          <UiSpinner v-if="coursesPending" size="lg" label="Carregando cursos do painel">
            <span class="body-copy">Carregando cursos do painel...</span>
          </UiSpinner>

          <p v-else-if="coursesErrorMessage" class="feedback-message" data-tone="error">
            {{ coursesErrorMessage }}
          </p>

          <ul v-else-if="courses.length > 0" class="list-clean course-list">
            <li v-for="course in courses" :key="course.id">
              <SurfaceCard as="article">
                <div class="section-stack course-card">
                  <div class="course-card-header">
                    <div class="section-stack course-card-copy">
                      <div class="course-card-meta">
                        <span class="pill">{{ formatVisibility(course.visibility) }}</span>
                        <span class="body-copy">Slug: {{ course.slug }}</span>
                      </div>
                      <h3 class="section-title course-card-title">{{ course.title }}</h3>
                      <p class="body-copy">{{ course.shortDescription }}</p>
                    </div>

                    <div class="course-card-actions">
                      <UiButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        :disabled="busyCourseSlug === course.slug"
                        @click="applyCourseToForm(course)"
                      >
                        Editar
                      </UiButton>
                      <UiButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        :disabled="busyCourseSlug === course.slug"
                        @click="onDeleteRequest(course)"
                      >
                        Excluir
                      </UiButton>
                    </div>
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

          <p v-else class="body-copy">Nenhum curso cadastrado no painel ate o momento.</p>
        </div>
      </SurfaceCard>
    </div>
  </div>
</template>

<style scoped>
.admin-course-layout {
  display: grid;
  gap: 1.25rem;
}

.course-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
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

.course-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
}

.course-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

@media (max-width: 960px) {
  .course-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
