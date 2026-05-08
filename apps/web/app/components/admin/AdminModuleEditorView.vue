<script setup lang="ts">
import type {
  AdminCoursesResponse,
  AdminModuleInput,
  AdminModuleResponse,
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
  moduleSlug?: string
}>()

const route = useRoute()
const { openConfirmationModal } = useConfirmationModal()

const buildEmptyModuleForm = (): AdminModuleInput => ({
  courseId: '',
  title: '',
  slug: '',
  description: '',
  order: 1,
  estimatedDurationInMinutes: 0
})

const normalizeModuleSlug = (value: string) =>
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
  const baseSlug = normalizeModuleSlug(title)

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

const defaultModuleResponse = {
  status: 'success',
  data: null
} satisfies AdminModuleResponse

const defaultModulesResponse = {
  status: 'success',
  data: []
} satisfies AdminModulesResponse

const defaultCoursesResponse = {
  status: 'success',
  data: []
} satisfies AdminCoursesResponse

const { data: coursesResponse, pending: coursesPending } = await useAsyncData<AdminCoursesResponse>(
  'admin-module-courses',
  () =>
    $fetch('/api/admin/courses', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultCoursesResponse
  }
)

const { data: modulesResponse } = await useAsyncData<AdminModulesResponse>(
  () => `admin-module-slugs-${props.mode}`,
  () =>
    $fetch('/api/admin/modules', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultModulesResponse
  }
)

const { data: moduleResponse, pending: modulePending } = await useAsyncData<AdminModuleResponse>(
  () => `admin-module-editor-${props.moduleSlug || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.moduleSlug) {
      return Promise.resolve(defaultModuleResponse)
    }

    return $fetch(`/api/admin/modules/${props.moduleSlug}`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  {
    default: () => defaultModuleResponse
  }
)

const moduleForm = ref<AdminModuleInput>(buildEmptyModuleForm())
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
const currentModule = computed(() =>
  moduleResponse.value && moduleResponse.value.status === 'success' ? moduleResponse.value.data : null
)
const currentCourse = computed(() => courses.value.find((course) => course.id === moduleForm.value.courseId) || null)
const moduleErrorMessage = computed(() => {
  if (!moduleResponse.value || moduleResponse.value.status !== 'error') {
    return ''
  }

  return moduleResponse.value.messages[0] || 'Nao foi possivel carregar o modulo.'
})
const coursesErrorMessage = computed(() => {
  if (!coursesResponse.value || coursesResponse.value.status !== 'error') {
    return ''
  }

  return coursesResponse.value.messages[0] || 'Nao foi possivel carregar os cursos para vincular o modulo.'
})
const existingSlugs = computed(() => {
  if (!modulesResponse.value || modulesResponse.value.status !== 'success') {
    return []
  }

  return modulesResponse.value.data
    .map((module) => module.slug)
    .filter((slug) => slug !== currentModule.value?.slug)
})
const pageTitle = computed(() => (isEditing.value ? 'Editar modulo' : 'Novo modulo'))
const pageDescription = computed(() =>
  isEditing.value
    ? 'Atualize as informacoes do modulo, mantendo o curso e o slug travados apos a criacao.'
    : 'Cadastre um novo modulo e vincule-o a um curso existente do painel.'
)
const submitLabel = computed(() => (isEditing.value ? 'Salvar alteracoes' : 'Criar modulo'))
const canCreateModule = computed(() => courses.value.length > 0)
const createModuleBlockedMessage = computed(() =>
  canCreateModule.value ? '' : 'Cadastre pelo menos um curso antes de criar modulos no painel.'
)

watch(
  currentModule,
  (module) => {
    if (!module) {
      if (!isEditing.value) {
        moduleForm.value = buildEmptyModuleForm()
      }
      return
    }

    moduleForm.value = {
      courseId: module.courseId,
      title: module.title,
      slug: module.slug,
      description: module.description,
      order: module.order,
      estimatedDurationInMinutes: module.estimatedDurationInMinutes
    }
  },
  { immediate: true }
)

watch(
  courses,
  (availableCourses) => {
    if (isEditing.value || availableCourses.length === 0 || moduleForm.value.courseId) {
      return
    }

    const [firstCourse] = availableCourses
    const requestedCourseId = typeof route.query.course === 'string' ? route.query.course : ''
    const matchingRequestedCourse = availableCourses.find((course) => course.id === requestedCourseId)

    moduleForm.value.courseId = matchingRequestedCourse?.id || firstCourse!.id
  },
  { immediate: true }
)

watch(
  () => moduleForm.value.title,
  (title) => {
    if (isEditing.value) {
      return
    }

    moduleForm.value.slug = resolveUniqueSlug(title, existingSlugs.value)
  }
)

watch(
  () => route.query.status,
  (status) => {
    if (status === 'created') {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Modulo criado com sucesso.'
    }
  },
  { immediate: true }
)

const buildPayload = (): AdminModuleInput => ({
  courseId: moduleForm.value.courseId,
  title: moduleForm.value.title,
  slug: moduleForm.value.slug,
  description: moduleForm.value.description,
  order: Number(moduleForm.value.order || 1),
  estimatedDurationInMinutes: Number(moduleForm.value.estimatedDurationInMinutes || 0)
})

const onSubmit = async () => {
  if (submitPending.value || (!isEditing.value && !canCreateModule.value)) {
    return
  }

  submitPending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminModuleResponse>(
      isEditing.value ? `/api/admin/modules/${props.moduleSlug}` : '/api/admin/modules',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        credentials: 'include',
        body: buildPayload()
      }
    )

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel salvar o modulo.')
    }

    if (isEditing.value) {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Modulo atualizado com sucesso.'
      moduleResponse.value = {
        status: 'success',
        data: response.data
      }
      return
    }

    await navigateTo(`/admin/modulos/${response.data.slug}?status=created`)
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar o modulo.')
  } finally {
    submitPending.value = false
  }
}

const onDeleteConfirmed = async () => {
  if (!props.moduleSlug || deletePending.value) {
    return
  }

  deletePending.value = true

  try {
    await $fetch<AdminModuleResponse>(`/api/admin/modules/${props.moduleSlug}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    await navigateTo('/admin/modulos')
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover o modulo.')
  } finally {
    deletePending.value = false
  }
}

const onDeleteRequest = () => {
  if (!currentModule.value) {
    return
  }

  openConfirmationModal({
    title: 'Excluir modulo',
    message: `Deseja realmente excluir o modulo ${currentModule.value.title}? Esta acao sera registrada no painel administrativo.`,
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel remover o modulo.',
        onClick: onDeleteConfirmed
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Modulos"
      :title="pageTitle"
      :description="pageDescription"
    />

    <SurfaceCard>
      <div v-if="coursesPending || modulePending" class="section-stack">
        <UiSpinner size="lg" label="Carregando modulo do painel">
          <span class="body-copy">Carregando modulo do painel...</span>
        </UiSpinner>
      </div>

      <div v-else-if="moduleErrorMessage || coursesErrorMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ moduleErrorMessage || coursesErrorMessage }}</p>
        <UiButton to="/admin/modulos" variant="secondary">Voltar para modulos</UiButton>
      </div>

      <div v-else-if="!isEditing && !canCreateModule" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ createModuleBlockedMessage }}</p>
        <UiButton to="/admin/cursos/novo" variant="success">Criar primeiro curso</UiButton>
      </div>

      <form v-else class="section-stack" @submit.prevent="onSubmit">
        <div class="section-stack">
          <p class="body-copy">
            {{ isEditing ? 'O curso e o slug do modulo permanecem fixos para preservar a organizacao do Firestore e a navegacao do conteudo. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' : 'O slug e gerado automaticamente a partir do titulo e o modulo sera listado agrupado pelo curso selecionado. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.' }}
          </p>
        </div>

        <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">
          {{ feedbackMessage }}
        </p>

        <UiField
          label="Curso"
          required
          :hint="isEditing ? 'O curso fica travado apos a criacao do modulo.' : 'Escolha o curso ao qual este modulo pertence.'"
        >
          <UiSelect v-model="moduleForm.courseId" :disabled="isEditing">
            <option value="" disabled>Selecione um curso</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </UiSelect>
        </UiField>

        <UiField label="Titulo" required>
          <UiInput v-model="moduleForm.title" placeholder="Ex.: Fundamentos da Fe" />
        </UiField>

        <UiField
          label="Slug"
          required
          hint="Gerado automaticamente a partir do titulo. Se ja existir, o sistema adiciona um hash de 4 digitos no inicio."
        >
          <UiInput :model-value="moduleForm.slug" disabled />
        </UiField>

        <div class="form-grid module-form-grid">
          <UiField label="Ordem" required hint="Controla a posicao do modulo dentro do curso.">
            <UiInput v-model="moduleForm.order" type="number" min="1" />
          </UiField>

          <UiField label="Duracao estimada em minutos" required>
            <UiInput v-model="moduleForm.estimatedDurationInMinutes" type="number" min="0" />
          </UiField>
        </div>

        <UiField label="Descricao" required>
          <UiTextarea
            v-model="moduleForm.description"
            :rows="6"
            placeholder="Explique o foco deste modulo e o que o aluno encontrara nele."
          />
        </UiField>

        <div v-if="currentCourse" class="module-course-highlight">
          <span class="pill">Curso vinculado</span>
          <span class="body-copy">{{ currentCourse.title }}</span>
        </div>

        <div class="form-actions">
          <UiButton type="submit" variant="success" size="lg" :loading="submitPending">
            {{ submitLabel }}
          </UiButton>
          <UiButton to="/admin/modulos" type="button" variant="ghost" size="lg" :disabled="submitPending || deletePending">
            Voltar para modulos
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
            Excluir modulo
          </UiButton>
        </div>
      </form>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.module-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.module-course-highlight {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .module-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
