<script setup lang="ts">
import type {
  AdminUploadedImageResponse,
  AdminUserEnrollmentsResponse,
  AdminUserInput,
  AdminUserResponse,
  CourseEnrollment,
  UserRegion,
  UserStatus
} from '@ieb/shared'
import ImageUploadField from '../ui/ImageUploadField.vue'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiCheckbox from '../ui/UiCheckbox.vue'
import UiField from '../ui/UiField.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSpinner from '../ui/UiSpinner.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'
import { getRequestErrorMessage } from '../../lib/utils'

type FeedbackTone = 'success' | 'error'
type AssetField = 'avatar'

const props = defineProps<{
  mode: 'create' | 'edit'
  userId?: string
}>()

const route = useRoute()
const { openConfirmationModal } = useConfirmationModal()

const statusOptions: Array<{ value: UserStatus; label: string }> = [
  { value: 'active', label: 'Ativo' },
  { value: 'invited', label: 'Convidado' },
  { value: 'blocked', label: 'Bloqueado' }
]

const regionOptions: Array<{ value: UserRegion; label: string }> = [
  { value: 'feira-de-santana', label: 'Feira de Santana' },
  { value: 'panambi', label: 'Panambi' },
  { value: 'sertao', label: 'Sertao' },
  { value: 'aluno-externo', label: 'Aluno externo' }
]

const buildEmptyUserForm = (): AdminUserInput => ({
  fullName: '',
  cpf: '',
  email: '',
  password: '',
  role: 'student',
  status: 'active',
  phone: null,
  avatarUrl: null,
  region: 'aluno-externo'
})

const defaultUserResponse = {
  status: 'success',
  data: null
} satisfies AdminUserResponse

const defaultEnrollmentsResponse = {
  status: 'success',
  data: null
} satisfies AdminUserEnrollmentsResponse

const { data: userResponse, pending: userPending } = await useAsyncData<AdminUserResponse>(
  () => `admin-user-editor-${props.userId || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.userId) {
      return Promise.resolve(defaultUserResponse)
    }

    return $fetch(`/api/admin/users/${props.userId}`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  {
    default: () => defaultUserResponse
  }
)

const { data: enrollmentsResponse, pending: enrollmentsPending } = await useAsyncData<AdminUserEnrollmentsResponse>(
  () => `admin-user-enrollments-${props.userId || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.userId) {
      return Promise.resolve(defaultEnrollmentsResponse)
    }

    return $fetch(`/api/admin/users/${props.userId}/enrollments`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  {
    default: () => defaultEnrollmentsResponse
  }
)

const userForm = ref<AdminUserInput>(buildEmptyUserForm())
const enrollmentFormCourseIds = ref<string[]>([])
const submitPending = ref(false)
const enrollmentsSubmitPending = ref(false)
const deletePending = ref(false)
const assetUploadPending = ref<AssetField | null>(null)
const selectedFiles = reactive<Record<AssetField, File | null>>({
  avatar: null
})
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('success')

const isEditing = computed(() => props.mode === 'edit')
const currentUser = computed(() => (userResponse.value?.status === 'success' ? userResponse.value.data : null))
const currentEnrollmentsData = computed(() =>
  enrollmentsResponse.value?.status === 'success' ? enrollmentsResponse.value.data : null
)
const submitLabel = computed(() => (isEditing.value ? 'Salvar alteracoes' : 'Criar usuario'))
const isAdminRole = computed<boolean>({
  get: () => userForm.value.role === 'admin',
  set: (value) => {
    userForm.value.role = value ? 'admin' : 'student'
  }
})
const pageTitle = computed(() => (isEditing.value ? 'Editar usuario' : 'Novo usuario'))
const pageDescription = computed(() =>
  isEditing.value
    ? 'Atualize o perfil, o papel e o status do usuario. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.'
    : 'Cadastre um novo usuario no Firestore e no Firebase Authentication. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.'
)
const userErrorMessage = computed(() => {
  if (!userResponse.value || userResponse.value.status !== 'error') {
    return ''
  }

  return userResponse.value.messages[0] || 'Nao foi possivel carregar o usuario.'
})
const enrollmentsErrorMessage = computed(() => {
  if (!enrollmentsResponse.value || enrollmentsResponse.value.status !== 'error') {
    return ''
  }

  return enrollmentsResponse.value.messages[0] || 'Nao foi possivel carregar as matriculas.'
})
const isCurrentEnrollment = (enrollment: CourseEnrollment) =>
  !enrollment.deletedAt && (enrollment.status === 'active' || enrollment.status === 'completed')
const enrollmentOptions = computed(() => currentEnrollmentsData.value?.courses || [])

watch(
  currentUser,
  (user) => {
    if (!user) {
      if (!isEditing.value) {
        userForm.value = buildEmptyUserForm()
      }
      return
    }

    userForm.value = {
      fullName: user.fullName,
      cpf: user.cpf,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      region: user.region
    }
  },
  { immediate: true }
)

watch(
  currentEnrollmentsData,
  (data) => {
    enrollmentFormCourseIds.value = data?.enrollments.filter(isCurrentEnrollment).map((enrollment) => enrollment.courseId) || []
  },
  { immediate: true }
)

watch(
  () => route.query.status,
  (status) => {
    if (status === 'created') {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Usuario criado com sucesso.'
    }
  },
  { immediate: true }
)

const buildPayload = (): AdminUserInput => ({
  fullName: userForm.value.fullName,
  cpf: userForm.value.cpf,
  email: userForm.value.email,
  password: userForm.value.password?.trim() || null,
  role: userForm.value.role,
  status: userForm.value.status,
  phone: userForm.value.phone?.trim() || null,
  avatarUrl: userForm.value.avatarUrl?.trim() || null,
  region: userForm.value.region
})

const persistUser = async () => {
  const response = await $fetch<AdminUserResponse>(
    isEditing.value ? `/api/admin/users/${props.userId}` : '/api/admin/users',
    {
      method: isEditing.value ? 'PATCH' : 'POST',
      credentials: 'include',
      body: buildPayload()
    }
  )

  if (response.status !== 'success' || !response.data) {
    throw new Error('Nao foi possivel salvar o usuario.')
  }

  if (isEditing.value) {
    feedbackTone.value = 'success'
    feedbackMessage.value = 'Usuario atualizado com sucesso.'
    userResponse.value = {
      status: 'success',
      data: response.data
    }
    userForm.value.password = ''
    return
  }

  await navigateTo(`/admin/usuarios/${response.data.id}?status=created`)
}

const submitUser = async () => {
  if (submitPending.value) {
    return
  }

  submitPending.value = true
  feedbackMessage.value = ''

  try {
    await persistUser()
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar o usuario.')
    throw error
  } finally {
    submitPending.value = false
  }
}

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

    userForm.value.avatarUrl = response.data.url
    feedbackTone.value = 'success'
    feedbackMessage.value = 'Avatar enviado com sucesso. Clique em Salvar alteracoes para persistir no usuario.'
    selectedFiles[field] = null
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel enviar a imagem.')
  } finally {
    assetUploadPending.value = null
  }
}

const isCourseSelected = (courseId: string) => enrollmentFormCourseIds.value.includes(courseId)

const setCourseEnrollment = (courseId: string, isSelected: boolean) => {
  if (isSelected && !isCourseSelected(courseId)) {
    enrollmentFormCourseIds.value = [...enrollmentFormCourseIds.value, courseId]
    return
  }

  if (!isSelected) {
    enrollmentFormCourseIds.value = enrollmentFormCourseIds.value.filter((selectedCourseId) => selectedCourseId !== courseId)
  }
}

const saveEnrollments = async () => {
  if (!props.userId || enrollmentsSubmitPending.value) {
    return
  }

  enrollmentsSubmitPending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminUserEnrollmentsResponse>(`/api/admin/users/${props.userId}/enrollments`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        courseIds: enrollmentFormCourseIds.value
      }
    })

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel atualizar as matriculas.')
    }

    enrollmentsResponse.value = response
    feedbackTone.value = 'success'
    feedbackMessage.value = response.message || 'Matriculas atualizadas com sucesso.'
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel atualizar as matriculas.')
  } finally {
    enrollmentsSubmitPending.value = false
  }
}

const onSubmit = async () => {
  if (submitPending.value) {
    return
  }

  const isPromotingToAdmin = userForm.value.role === 'admin' && currentUser.value?.role !== 'admin'

  if (isPromotingToAdmin) {
    openConfirmationModal({
      title: 'Conceder acesso administrativo',
      message:
        'Este usuario passara a acessar o painel administrativo e podera gerenciar os dados da plataforma. Deseja continuar?',
      actions: [
        {
          id: 'cancel',
          label: 'Cancelar',
          variant: 'secondary'
        },
        {
          id: 'confirm',
          label: 'Tornar administrador',
          variant: 'primary',
          errorMessage: 'Nao foi possivel salvar o usuario.',
          onClick: submitUser
        }
      ]
    })
    return
  }

  try {
    await submitUser()
  } catch {}
}

const onDeleteConfirmed = async () => {
  if (!props.userId || deletePending.value) {
    return
  }

  deletePending.value = true

  try {
    await $fetch<AdminUserResponse>(`/api/admin/users/${props.userId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    await navigateTo('/admin/usuarios')
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover o usuario.')
  } finally {
    deletePending.value = false
  }
}

const onDeleteRequest = () => {
  if (!currentUser.value) {
    return
  }

  openConfirmationModal({
    title: 'Excluir usuario',
    message: `Deseja realmente excluir o usuario ${currentUser.value.fullName}? Esta acao sera registrada no painel administrativo.`,
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel remover o usuario.',
        onClick: onDeleteConfirmed
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro eyebrow="Usuarios" :title="pageTitle" :description="pageDescription" />

    <SurfaceCard>
      <div v-if="userPending" class="section-stack">
        <UiSpinner size="lg" label="Carregando usuario do painel">
          <span class="body-copy">Carregando usuario do painel...</span>
        </UiSpinner>
      </div>

      <div v-else-if="userErrorMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ userErrorMessage }}</p>
        <UiButton to="/admin/usuarios" variant="secondary">Voltar para usuarios</UiButton>
      </div>

      <form v-else class="section-stack" @submit.prevent="onSubmit">
        <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">
          {{ feedbackMessage }}
        </p>

        <UiField v-if="isEditing && currentUser" label="UID" required hint="Identificador do usuario no Firebase Authentication e no Firestore.">
          <UiInput :model-value="currentUser.id" disabled />
        </UiField>

        <div class="form-grid user-form-grid">
          <UiField label="Nome completo" required>
            <UiInput v-model="userForm.fullName" placeholder="Ex.: Maria Silva" />
          </UiField>

          <UiField label="CPF" required>
            <UiInput v-model="userForm.cpf" placeholder="Somente numeros" />
          </UiField>

          <UiField label="E-mail" required>
            <UiInput v-model="userForm.email" type="email" placeholder="email@exemplo.com" />
          </UiField>

          <UiField :label="isEditing ? 'Nova senha' : 'Senha'" :required="!isEditing" :hint="isEditing ? 'Deixe em branco para manter a senha atual.' : 'Minimo de 6 caracteres.'">
            <UiInput v-model="userForm.password" type="password" placeholder="******" />
          </UiField>

          <UiField
            label="Acesso administrativo"
            required
            hint="Ative esta opcao para permitir que o usuario acesse e gerencie o painel administrativo."
          >
            <UiCheckbox v-model="isAdminRole">
              <span class="admin-role-toggle-copy">
                <strong>{{ isAdminRole ? 'Administrador da plataforma' : 'Aluno da plataforma' }}</strong>
                <span class="body-copy">
                  {{
                    isAdminRole
                      ? 'Este usuario tera acesso ao painel administrativo.'
                      : 'Este usuario acessara apenas a plataforma de conteudo.'
                  }}
                </span>
              </span>
            </UiCheckbox>
          </UiField>

          <UiField label="Status" required>
            <UiSelect v-model="userForm.status">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>

          <UiField label="Regiao" required>
            <UiSelect v-model="userForm.region">
              <option v-for="option in regionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>

          <UiField label="Telefone" hint="Opcional.">
            <UiInput v-model="userForm.phone" placeholder="Ex.: 75999999999" />
          </UiField>
        </div>

        <div class="form-grid user-form-grid user-avatar-grid">
          <UiField label="URL do avatar" hint="Opcional.">
            <UiInput v-model="userForm.avatarUrl" placeholder="https://..." />
          </UiField>

          <ImageUploadField
            label="Enviar avatar"
            hint="Envie uma imagem para preencher automaticamente a URL do avatar."
            button-label="Enviar avatar"
            :loading="assetUploadPending === 'avatar'"
            :disabled="submitPending || deletePending || !selectedFiles.avatar"
            @select="onFileSelected('avatar', $event)"
            @upload="uploadImageAsset('avatar')"
          />
        </div>

        <div class="form-actions">
          <UiButton type="submit" variant="success" size="lg" :loading="submitPending">
            {{ submitLabel }}
          </UiButton>
          <UiButton to="/admin/usuarios" type="button" variant="ghost" size="lg" :disabled="submitPending || deletePending">
            Voltar para usuarios
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
            Excluir usuario
          </UiButton>
        </div>
      </form>
    </SurfaceCard>

    <SurfaceCard v-if="isEditing" class="section-stack">
      <div class="section-stack">
        <span class="eyebrow">Matriculas</span>
        <h2 class="section-title enrollment-title">Cursos do aluno</h2>
        <p class="body-copy">
          O cadastro publico nao matricula alunos automaticamente. Marque aqui os cursos que este usuario pode acessar.
        </p>
      </div>

      <UiSpinner v-if="enrollmentsPending" size="lg" label="Carregando matriculas">
        <span class="body-copy">Carregando matriculas...</span>
      </UiSpinner>

      <p v-else-if="enrollmentsErrorMessage" class="feedback-message" data-tone="error">
        {{ enrollmentsErrorMessage }}
      </p>

      <div v-else class="section-stack">
        <p v-if="enrollmentOptions.length === 0" class="body-copy">
          Nenhum curso disponivel para matricula no momento.
        </p>

        <div v-else class="enrollment-grid">
          <UiCheckbox
            v-for="course in enrollmentOptions"
            :key="course.id"
            :model-value="isCourseSelected(course.id)"
            :disabled="enrollmentsSubmitPending"
            @update:model-value="setCourseEnrollment(course.id, $event)"
          >
            <span class="enrollment-option-copy">
              <strong>{{ course.title }}</strong>
              <span class="body-copy">{{ course.shortDescription || course.description }}</span>
            </span>
          </UiCheckbox>
        </div>

        <div class="form-actions">
          <UiButton
            type="button"
            variant="primary"
            size="lg"
            :loading="enrollmentsSubmitPending"
            :disabled="enrollmentsSubmitPending || enrollmentOptions.length === 0"
            @click="saveEnrollments"
          >
            Salvar matriculas
          </UiButton>
        </div>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.user-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-role-toggle-copy {
  display: grid;
  gap: 0.35rem;
}

.enrollment-title {
  font-size: clamp(1.2rem, 1.8vw, 1.7rem);
}

.enrollment-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.enrollment-option-copy {
  display: grid;
  gap: 0.35rem;
}

.enrollment-option-copy strong {
  line-height: 1.35;
}

.admin-role-toggle-copy strong {
  font-size: 1rem;
  line-height: 1.35;
}

@media (max-width: 960px) {
  .user-form-grid,
  .enrollment-grid {
    grid-template-columns: 1fr;
  }
}
</style>
