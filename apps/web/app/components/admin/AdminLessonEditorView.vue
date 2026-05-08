<script setup lang="ts">
import type {
  AdminCoursesResponse,
  AdminLessonInput,
  AdminLessonResponse,
  AdminLessonsResponse,
  AdminModulesResponse
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
  lessonSlug?: string
}>()

const route = useRoute()
const { openConfirmationModal } = useConfirmationModal()

const contentTypeOptions = [
  { value: 'video', label: 'Video' },
  { value: 'text', label: 'Texto' },
  { value: 'audio', label: 'Audio' }
] as const

const videoProviderOptions = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'upload', label: 'Upload / m3u8' },
  { value: 'embed', label: 'Embed' }
] as const

const manualCompletionOptions = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Nao' }
] as const

const buildEmptyLessonForm = (): AdminLessonInput => ({
  courseId: '',
  moduleId: '',
  title: '',
  slug: '',
  description: '',
  order: 1,
  contentType: 'video',
  videoProvider: 'youtube',
  mediaUrl: null,
  thumbnailUrl: null,
  durationInMinutes: 0,
  bodyContent: null,
  allowManualCompletion: true
})

const normalizeLessonSlug = (value: string) =>
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
  const baseSlug = normalizeLessonSlug(title)

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

const defaultLessonResponse = {
  status: 'success',
  data: null
} satisfies AdminLessonResponse

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

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-lesson-courses',
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
  'admin-lesson-modules',
  () =>
    $fetch('/api/admin/modules', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultModulesResponse
  }
)

const { data: lessonsResponse } = await useAsyncData<AdminLessonsResponse>(
  () => `admin-lesson-slugs-${props.mode}`,
  () =>
    $fetch('/api/admin/lessons', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultLessonsResponse
  }
)

const { data: lessonResponse, pending: lessonPending } = await useAsyncData<AdminLessonResponse>(
  () => `admin-lesson-editor-${props.lessonSlug || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.lessonSlug) {
      return Promise.resolve(defaultLessonResponse)
    }

    return $fetch(`/api/admin/lessons/${props.lessonSlug}`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  {
    default: () => defaultLessonResponse
  }
)

const lessonForm = ref<AdminLessonInput>(buildEmptyLessonForm())
const submitPending = ref(false)
const deletePending = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('success')

const isEditing = computed(() => props.mode === 'edit')
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
const currentLesson = computed(() =>
  lessonResponse.value && lessonResponse.value.status === 'success' ? lessonResponse.value.data : null
)
const courseOptions = computed(() => courses.value)
const moduleOptions = computed(() =>
  modules.value.filter((module) => module.courseId === lessonForm.value.courseId)
)
const currentCourse = computed(() => courses.value.find((course) => course.id === lessonForm.value.courseId) || null)
const currentModule = computed(() => modules.value.find((module) => module.id === lessonForm.value.moduleId) || null)
const lessonErrorMessage = computed(() => {
  if (!lessonResponse.value || lessonResponse.value.status !== 'error') {
    return ''
  }

  return lessonResponse.value.messages[0] || 'Nao foi possivel carregar a aula.'
})
const coursesErrorMessage = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'error') {
    return ''
  }

  return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos para vincular a aula.'
})
const modulesErrorMessage = computed(() => {
  if (!modulesResponse.value || modulesResponse.value.status !== 'error') {
    return ''
  }

  return modulesResponse.value.messages[0] || 'Nao foi possivel carregar os modulos para vincular a aula.'
})
const existingSlugs = computed(() => {
  if (!lessonsResponse.value || lessonsResponse.value.status !== 'success') {
    return []
  }

  return lessonsResponse.value.data
    .map((lesson) => lesson.slug)
    .filter((slug) => slug !== currentLesson.value?.slug)
})
const pageTitle = computed(() => (isEditing.value ? 'Editar aula' : 'Nova aula'))
const pageDescription = computed(() =>
  isEditing.value
    ? 'Atualize as informacoes da aula, mantendo curso, modulo e slug travados apos a criacao.'
    : 'Cadastre uma nova aula e vincule-a a um modulo existente do painel.'
)
const submitLabel = computed(() => (isEditing.value ? 'Salvar alteracoes' : 'Criar aula'))
const canCreateLesson = computed(() => courses.value.length > 0 && modules.value.length > 0)
const createLessonBlockedMessage = computed(() => {
  if (courses.value.length === 0) {
    return 'Cadastre pelo menos um curso antes de criar aulas no painel.'
  }

  if (modules.value.length === 0) {
    return 'Cadastre pelo menos um modulo antes de criar aulas no painel.'
  }

  return ''
})
const manualCompletionValue = computed({
  get: () => (lessonForm.value.allowManualCompletion ? 'true' : 'false'),
  set: (value: string) => {
    lessonForm.value.allowManualCompletion = value === 'true'
  }
})
const isVideoContent = computed(() => lessonForm.value.contentType === 'video')
const isTextContent = computed(() => lessonForm.value.contentType === 'text')

watch(
  currentLesson,
  (lesson) => {
    if (!lesson) {
      if (!isEditing.value) {
        lessonForm.value = buildEmptyLessonForm()
      }
      return
    }

    lessonForm.value = {
      courseId: lesson.courseId,
      moduleId: lesson.moduleId,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      order: lesson.order,
      contentType: lesson.contentType,
      videoProvider: lesson.videoProvider,
      mediaUrl: lesson.mediaUrl,
      thumbnailUrl: lesson.thumbnailUrl,
      durationInMinutes: lesson.durationInMinutes,
      bodyContent: lesson.bodyContent,
      allowManualCompletion: lesson.allowManualCompletion
    }
  },
  { immediate: true }
)

watch(
  courseOptions,
  (availableCourses) => {
    if (isEditing.value || availableCourses.length === 0 || lessonForm.value.courseId) {
      return
    }

    const requestedCourseId = typeof route.query.course === 'string' ? route.query.course : ''
    const matchingRequestedCourse = availableCourses.find((course) => course.id === requestedCourseId)

    lessonForm.value.courseId = matchingRequestedCourse?.id || availableCourses[0]!.id
  },
  { immediate: true }
)

watch(
  [moduleOptions, () => route.query.module],
  ([availableModules, requestedModule]) => {
    if (isEditing.value || availableModules.length === 0) {
      return
    }

    const normalizedRequestedModuleId = typeof requestedModule === 'string' ? requestedModule : ''

    if (lessonForm.value.moduleId && availableModules.some((module) => module.id === lessonForm.value.moduleId)) {
      return
    }

    const matchingRequestedModule = availableModules.find((module) => module.id === normalizedRequestedModuleId)
    lessonForm.value.moduleId = matchingRequestedModule?.id || availableModules[0]!.id
  },
  { immediate: true }
)

watch(
  () => lessonForm.value.courseId,
  () => {
    if (isEditing.value) {
      return
    }

    if (!moduleOptions.value.some((module) => module.id === lessonForm.value.moduleId)) {
      lessonForm.value.moduleId = moduleOptions.value[0]?.id || ''
    }
  }
)

watch(
  () => lessonForm.value.contentType,
  (contentType) => {
    if (contentType !== 'video') {
      lessonForm.value.videoProvider = null
      lessonForm.value.mediaUrl = null
      lessonForm.value.thumbnailUrl = null
    } else if (!lessonForm.value.videoProvider) {
      lessonForm.value.videoProvider = 'youtube'
    }

    if (contentType !== 'text') {
      lessonForm.value.bodyContent = null
    }
  }
)

watch(
  () => lessonForm.value.title,
  (title) => {
    if (isEditing.value) {
      return
    }

    lessonForm.value.slug = resolveUniqueSlug(title, existingSlugs.value)
  }
)

watch(
  () => route.query.status,
  (status) => {
    if (status === 'created') {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Aula criada com sucesso.'
    }
  },
  { immediate: true }
)

const buildPayload = (): AdminLessonInput => ({
  courseId: lessonForm.value.courseId,
  moduleId: lessonForm.value.moduleId,
  title: lessonForm.value.title,
  slug: lessonForm.value.slug,
  description: lessonForm.value.description,
  order: Number(lessonForm.value.order || 1),
  contentType: lessonForm.value.contentType,
  videoProvider: lessonForm.value.videoProvider,
  mediaUrl: lessonForm.value.mediaUrl?.trim() || null,
  thumbnailUrl: lessonForm.value.thumbnailUrl?.trim() || null,
  durationInMinutes: Number(lessonForm.value.durationInMinutes || 0),
  bodyContent: lessonForm.value.bodyContent?.trim() || null,
  allowManualCompletion: Boolean(lessonForm.value.allowManualCompletion)
})

const onSubmit = async () => {
  if (submitPending.value || (!isEditing.value && !canCreateLesson.value)) {
    return
  }

  submitPending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminLessonResponse>(
      isEditing.value ? `/api/admin/lessons/${props.lessonSlug}` : '/api/admin/lessons',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        credentials: 'include',
        body: buildPayload()
      }
    )

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel salvar a aula.')
    }

    if (isEditing.value) {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Aula atualizada com sucesso.'
      lessonResponse.value = {
        status: 'success',
        data: response.data
      }
      return
    }

    await navigateTo(`/admin/aulas/${response.data.slug}?status=created`)
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar a aula.')
  } finally {
    submitPending.value = false
  }
}

const onDeleteConfirmed = async () => {
  if (!props.lessonSlug || deletePending.value) {
    return
  }

  deletePending.value = true

  try {
    await $fetch<AdminLessonResponse>(`/api/admin/lessons/${props.lessonSlug}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    await navigateTo('/admin/aulas')
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover a aula.')
  } finally {
    deletePending.value = false
  }
}

const onDeleteRequest = () => {
  if (!currentLesson.value) {
    return
  }

  openConfirmationModal({
    title: 'Excluir aula',
    message: `Deseja realmente excluir a aula ${currentLesson.value.title}? Esta acao sera registrada no painel administrativo.`,
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel remover a aula.',
        onClick: onDeleteConfirmed
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Aulas"
      :title="pageTitle"
      :description="pageDescription"
    />

    <SurfaceCard>
      <div v-if="coursesPending || modulesPending || lessonPending" class="section-stack">
        <UiSpinner size="lg" label="Carregando aula do painel">
          <span class="body-copy">Carregando aula do painel...</span>
        </UiSpinner>
      </div>

      <div v-else-if="lessonErrorMessage || coursesErrorMessage || modulesErrorMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">
          {{ lessonErrorMessage || coursesErrorMessage || modulesErrorMessage }}
        </p>
        <UiButton to="/admin/aulas" variant="secondary">Voltar para aulas</UiButton>
      </div>

      <div v-else-if="!isEditing && !canCreateLesson" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ createLessonBlockedMessage }}</p>
        <UiButton :to="courses.length === 0 ? '/admin/cursos/novo' : '/admin/modulos/novo'" variant="success">
          {{ courses.length === 0 ? 'Criar primeiro curso' : 'Criar primeiro modulo' }}
        </UiButton>
      </div>

      <form v-else class="section-stack" @submit.prevent="onSubmit">
        <div class="section-stack">
          <p class="body-copy">
            {{ isEditing ? 'Curso, modulo e slug permanecem fixos para preservar a organizacao do Firestore e a navegacao do conteudo.' : 'O slug e gerado automaticamente a partir do titulo e a aula sera listada agrupada por curso e modulo.' }}
          </p>
        </div>

        <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">
          {{ feedbackMessage }}
        </p>

        <div class="form-grid lesson-form-grid">
          <UiField
            label="Curso"
            required
            :hint="isEditing ? 'O curso fica travado apos a criacao da aula.' : 'Escolha o curso ao qual esta aula pertence.'"
          >
            <UiSelect v-model="lessonForm.courseId" :disabled="isEditing">
              <option value="" disabled>Selecione um curso</option>
              <option v-for="course in courseOptions" :key="course.id" :value="course.id">
                {{ course.title }}
              </option>
            </UiSelect>
          </UiField>

          <UiField
            label="Modulo"
            required
            :hint="isEditing ? 'O modulo fica travado apos a criacao da aula.' : 'Escolha o modulo ao qual esta aula pertence.'"
          >
            <UiSelect v-model="lessonForm.moduleId" :disabled="isEditing">
              <option value="" disabled>Selecione um modulo</option>
              <option v-for="module in moduleOptions" :key="module.id" :value="module.id">
                {{ module.title }}
              </option>
            </UiSelect>
          </UiField>
        </div>

        <UiField label="Titulo" required>
          <UiInput v-model="lessonForm.title" placeholder="Ex.: Introducao a Teologia" />
        </UiField>

        <UiField
          label="Slug"
          required
          hint="Gerado automaticamente a partir do titulo. Se ja existir, o sistema adiciona um hash de 4 digitos no inicio."
        >
          <UiInput :model-value="lessonForm.slug" disabled />
        </UiField>

        <div class="form-grid lesson-form-grid">
          <UiField label="Ordem" required hint="Controla a posicao da aula dentro do modulo.">
            <UiInput v-model="lessonForm.order" type="number" min="1" />
          </UiField>

          <UiField label="Duracao em minutos" required>
            <UiInput v-model="lessonForm.durationInMinutes" type="number" min="0" />
          </UiField>

          <UiField label="Tipo de conteudo" required>
            <UiSelect v-model="lessonForm.contentType">
              <option v-for="option in contentTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>

          <UiField label="Conclusao manual" required>
            <UiSelect v-model="manualCompletionValue">
              <option v-for="option in manualCompletionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>
        </div>

        <UiField label="Descricao" required>
          <UiTextarea
            v-model="lessonForm.description"
            :rows="4"
            placeholder="Explique o objetivo da aula e o que o aluno deve aprender."
          />
        </UiField>

        <div v-if="isVideoContent" class="form-grid lesson-form-grid">
          <UiField label="Provedor de video" required>
            <UiSelect v-model="lessonForm.videoProvider">
              <option v-for="option in videoProviderOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>

          <UiField label="URL do video" required>
            <UiInput v-model="lessonForm.mediaUrl" placeholder="https://..." />
          </UiField>

          <UiField label="URL da miniatura" hint="Opcional para representacao visual da aula.">
            <UiInput v-model="lessonForm.thumbnailUrl" placeholder="https://..." />
          </UiField>
        </div>

        <UiField v-if="isTextContent" label="Conteudo em texto" required>
          <UiTextarea
            v-model="lessonForm.bodyContent"
            :rows="8"
            placeholder="Escreva o conteudo textual da aula."
          />
        </UiField>

        <div v-if="currentCourse || currentModule" class="lesson-linkage">
          <span v-if="currentCourse" class="pill">Curso: {{ currentCourse.title }}</span>
          <span v-if="currentModule" class="pill">Modulo: {{ currentModule.title }}</span>
        </div>

        <div class="form-actions">
          <UiButton type="submit" variant="success" size="lg" :loading="submitPending">
            {{ submitLabel }}
          </UiButton>
          <UiButton to="/admin/aulas" type="button" variant="ghost" size="lg" :disabled="submitPending || deletePending">
            Voltar para aulas
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
            Excluir aula
          </UiButton>
        </div>
      </form>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.lesson-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.lesson-linkage {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .lesson-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
