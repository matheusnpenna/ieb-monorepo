<script setup lang="ts">
import type {
  AdminCourseInput,
  AdminCourseResponse,
  AdminCoursesResponse,
  AdminUploadedImageResponse,
  Course
} from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import AdminImageUploadField from './AdminImageUploadField.vue'
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
type AssetField = 'cover' | 'hero'

const props = defineProps<{
  mode: 'create' | 'edit'
  courseSlug?: string
}>()

const route = useRoute()
const { openConfirmationModal } = useConfirmationModal()

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

const createFourDigitSlugHash = (value: string, salt = 0) => {
  const normalizedValue = `${value}:${salt}`
  let hash = 0

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) % 9000
  }

  return String(hash + 1000)
}

const resolveUniqueSlug = (title: string, existingSlugs: string[]) => {
  const baseSlug = normalizeCourseSlug(title)

  if (!baseSlug) {
    return ''
  }

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`

    if (!existingSlugs.includes(nextSlug)) {
      return nextSlug
    }
  }

  return baseSlug
}

const defaultCourseResponse = {
  status: 'success',
  data: null
} satisfies AdminCourseResponse

const defaultCoursesResponse = {
  status: 'success',
  data: []
} satisfies AdminCoursesResponse

const { data: existingCoursesResponse } = await useAsyncData<AdminCoursesResponse>(
  () => `admin-course-slugs-${props.mode}`,
  () =>
    $fetch('/api/admin/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultCoursesResponse
  }
)

const { data: courseResponse, pending: coursePending } = await useAsyncData<AdminCourseResponse>(
  () => `admin-course-editor-${props.courseSlug || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.courseSlug) {
      return Promise.resolve(defaultCourseResponse)
    }

    return $fetch(`/api/admin/courses/${props.courseSlug}`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  {
    default: () => defaultCourseResponse
  }
)

const courseForm = ref<AdminCourseInput>(buildEmptyCourseForm())
const submitPending = ref(false)
const deletePending = ref(false)
const assetUploadPending = ref<AssetField | null>(null)
const selectedFiles = reactive<Record<AssetField, File | null>>({
  cover: null,
  hero: null
})
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('success')

const isEditing = computed(() => props.mode === 'edit')
const currentCourse = computed(() =>
  courseResponse.value && courseResponse.value.status === 'success' ? courseResponse.value.data : null
)
const courseErrorMessage = computed(() => {
  if (!courseResponse.value || courseResponse.value.status !== 'error') {
    return ''
  }

  return courseResponse.value.messages[0] || 'Nao foi possivel carregar o curso.'
})
const existingSlugs = computed(() => {
  if (!existingCoursesResponse.value || existingCoursesResponse.value.status !== 'success') {
    return []
  }

  return existingCoursesResponse.value.data
    .map((course) => course.slug)
    .filter((slug) => slug !== currentCourse.value?.slug)
})
const pageTitle = computed(() => (isEditing.value ? 'Editar curso' : 'Novo curso'))
const pageDescription = computed(() =>
  isEditing.value
    ? 'Atualize os dados do curso, envie imagens para o Storage e exclua o curso somente se realmente necessario.'
    : 'Cadastre um novo curso. O slug e gerado automaticamente com base no titulo.'
)
const submitLabel = computed(() => (isEditing.value ? 'Salvar alteracoes' : 'Criar curso'))
const certificateEnabledValue = computed({
  get: () => (courseForm.value.certificateEnabled ? 'true' : 'false'),
  set: (value: string) => {
    courseForm.value.certificateEnabled = value === 'true'
  }
})

watch(
  currentCourse,
  (course) => {
    if (!course) {
      if (!isEditing.value) {
        courseForm.value = buildEmptyCourseForm()
      }
      return
    }

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
  },
  { immediate: true }
)

watch(
  () => courseForm.value.title,
  (title) => {
    if (isEditing.value) {
      return
    }

    courseForm.value.slug = resolveUniqueSlug(title, existingSlugs.value)
  }
)

watch(
  () => route.query.status,
  (status) => {
    if (status === 'created') {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Curso criado com sucesso.'
    }
  },
  { immediate: true }
)

const onFileSelected = (field: AssetField, event: Event) => {
  const input = event.target as HTMLInputElement
  selectedFiles[field] = input.files?.[0] || null
}

const uploadImageAsset = async (field: AssetField) => {
  const selectedFile = selectedFiles[field]

  if (!selectedFile || assetUploadPending.value) {
    return
  }

  assetUploadPending.value = field
  feedbackMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('field', field)
    formData.append('file', selectedFile)

    const response = await $fetch<AdminUploadedImageResponse>('/api/admin/uploads/images', {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel enviar a imagem.')
    }

    if (field === 'cover') {
      courseForm.value.coverImageUrl = response.data.url
    } else {
      courseForm.value.heroImageUrl = response.data.url
    }

    feedbackTone.value = 'success'
    feedbackMessage.value = `Imagem de ${field === 'cover' ? 'capa' : 'hero'} enviada com sucesso. Clique em Salvar alteracoes para persistir no curso.`
    selectedFiles[field] = null
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel enviar a imagem.')
  } finally {
    assetUploadPending.value = null
  }
}

const buildPayload = (): AdminCourseInput => ({
  title: courseForm.value.title,
  slug: courseForm.value.slug,
  shortDescription: courseForm.value.shortDescription,
  description: courseForm.value.description,
  visibility: courseForm.value.visibility,
  coverImageUrl: courseForm.value.coverImageUrl?.trim() || null,
  heroImageUrl: courseForm.value.heroImageUrl?.trim() || null,
  totalDurationInMinutes: Number(courseForm.value.totalDurationInMinutes || 0),
  requiredCompletionRate: Number(courseForm.value.requiredCompletionRate || 0),
  certificateEnabled: Boolean(courseForm.value.certificateEnabled)
})

const onSubmit = async () => {
  if (submitPending.value) {
    return
  }

  submitPending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminCourseResponse>(
      isEditing.value ? `/api/admin/courses/${props.courseSlug}` : '/api/admin/courses',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        credentials: 'include',
        body: buildPayload()
      }
    )

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel salvar o curso.')
    }

    if (isEditing.value) {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Curso atualizado com sucesso.'
      courseResponse.value = {
        status: 'success',
        data: response.data
      }
      return
    }

    await navigateTo(`/admin/cursos/${response.data.slug}?status=created`)
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar o curso.')
  } finally {
    submitPending.value = false
  }
}

const onDeleteConfirmed = async () => {
  if (!props.courseSlug || deletePending.value) {
    return
  }

  deletePending.value = true

  try {
    await $fetch<AdminCourseResponse>(`/api/admin/courses/${props.courseSlug}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    await navigateTo('/admin/cursos')
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover o curso.')
  } finally {
    deletePending.value = false
  }
}

const onDeleteRequest = () => {
  if (!currentCourse.value) {
    return
  }

  openConfirmationModal({
    title: 'Excluir curso',
    message: `Deseja realmente excluir o curso ${currentCourse.value.title}? Esta acao sera registrada no painel administrativo.`,
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
        onClick: onDeleteConfirmed
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Cursos"
      :title="pageTitle"
      :description="pageDescription"
    />

    <SurfaceCard>
      <div v-if="coursePending" class="section-stack">
        <UiSpinner size="lg" label="Carregando curso do painel">
          <span class="body-copy">Carregando curso do painel...</span>
        </UiSpinner>
      </div>

      <div v-else-if="courseErrorMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ courseErrorMessage }}</p>
        <UiButton to="/admin/cursos" variant="secondary">Voltar para cursos</UiButton>
      </div>

      <form v-else class="section-stack" @submit.prevent="onSubmit">
        <div class="section-stack">
          <p class="body-copy">
            {{ isEditing ? 'O slug e mantido fixo porque identifica o documento do curso no Firestore. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' : 'O slug e gerado automaticamente com base no titulo e validado antes do cadastro. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' }}
          </p>
        </div>

        <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">
          {{ feedbackMessage }}
        </p>

        <UiField label="Titulo" required>
          <UiInput v-model="courseForm.title" placeholder="Ex.: Curso de Lideranca" />
        </UiField>

        <UiField
          label="Slug"
          required
          hint="Gerado automaticamente a partir do titulo. Se ja existir, o sistema adiciona um hash de 4 digitos no inicio."
        >
          <UiInput :model-value="courseForm.slug" disabled />
        </UiField>

        <div class="form-grid course-form-grid">

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
        </div>

        <UiField label="Descricao curta" required>
          <UiTextarea v-model="courseForm.shortDescription" :rows="3" placeholder="Resumo curto do curso." />
        </UiField>

        <UiField label="Descricao completa" required>
          <UiTextarea v-model="courseForm.description" :rows="6" placeholder="Detalhes completos do curso." />
        </UiField>

        <div class="form-grid course-form-grid">
          <UiField label="URL da capa" hint="Voce pode colar uma URL ou enviar um arquivo abaixo.">
            <UiInput v-model="courseForm.coverImageUrl" placeholder="https://..." />
          </UiField>

          <AdminImageUploadField
            label="Upload da capa"
            hint="Envie uma imagem para preencher automaticamente a URL da capa."
            button-label="Enviar capa"
            :loading="assetUploadPending === 'cover'"
            :disabled="!selectedFiles.cover"
            @select="onFileSelected('cover', $event)"
            @upload="uploadImageAsset('cover')"
          />

          <UiField label="URL do hero" hint="Voce pode colar uma URL ou enviar um arquivo abaixo.">
            <UiInput v-model="courseForm.heroImageUrl" placeholder="https://..." />
          </UiField>

          <AdminImageUploadField
            label="Upload do hero"
            hint="Envie uma imagem para preencher automaticamente a URL do hero."
            button-label="Enviar hero"
            :loading="assetUploadPending === 'hero'"
            :disabled="!selectedFiles.hero"
            @select="onFileSelected('hero', $event)"
            @upload="uploadImageAsset('hero')"
          />
        </div>

        <div class="form-actions">
          <UiButton type="submit" variant="success" size="lg" :loading="submitPending">
            {{ submitLabel }}
          </UiButton>
          <UiButton to="/admin/cursos" type="button" variant="ghost" size="lg" :disabled="submitPending || deletePending">
            Voltar para cursos
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
            Excluir curso
          </UiButton>
        </div>
      </form>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.course-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .course-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
