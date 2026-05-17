<script setup lang="ts">
import type { AccountAvatarUploadResponse, AccountProfileInput, AccountProfileResponse, User, UserRegion } from '@ieb/shared'
import ImageUploadField from '../components/ui/ImageUploadField.vue'
import UiButton from '../components/ui/UiButton.vue'
import UiField from '../components/ui/UiField.vue'
import UiInput from '../components/ui/UiInput.vue'
import UiPanel from '../components/ui/UiPanel.vue'
import UiSelect from '../components/ui/UiSelect.vue'
import UiSpinner from '../components/ui/UiSpinner.vue'
import { useAuthSession } from '../composables/use-auth-session'
import { getRequestErrorMessage } from '../lib/utils'

definePageMeta({
  layout: 'content'
})

useSeoMeta({
  title: 'Dados da conta'
})

const { fetchSession } = useAuthSession()

const regionOptions: Array<{ value: UserRegion; label: string }> = [
  { value: 'feira-de-santana', label: 'Feira de Santana' },
  { value: 'panambi', label: 'Panambi' },
  { value: 'sertao', label: 'Sertao' },
  { value: 'aluno-externo', label: 'Aluno externo' }
]

const formatRole = (role: User['role']) => (role === 'admin' ? 'Administrador' : 'Aluno')
const formatStatus = (status: User['status']) => {
  const labels: Record<User['status'], string> = {
    active: 'Ativo',
    invited: 'Convidado',
    blocked: 'Bloqueado'
  }

  return labels[status]
}

const form = reactive<AccountProfileInput>({
  fullName: '',
  cpf: '',
  phone: null,
  avatarUrl: null,
  region: 'aluno-externo'
})
const feedback = reactive({
  tone: 'success' as 'success' | 'error',
  message: ''
})
const saving = ref(false)
const selectedAvatarFile = ref<File | null>(null)
const avatarUploadPending = ref(false)
const defaultProfileResponse = {
  status: 'success',
  data: null
} satisfies AccountProfileResponse

const { data: profileResponse, pending, refresh } = await useAsyncData<AccountProfileResponse>(
  'account-profile',
  () =>
    $fetch('/api/account/profile', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultProfileResponse
  }
)

const profile = computed(() => profileResponse.value?.data || null)
const profileErrorMessage = computed(() =>
  profileResponse.value?.status === 'error'
    ? profileResponse.value.messages[0] || 'Nao foi possivel carregar os dados da conta.'
    : 'Nao foi possivel carregar os dados da conta.'
)

watch(
  profile,
  (nextProfile) => {
    if (!nextProfile) return

    form.fullName = nextProfile.fullName
    form.cpf = nextProfile.cpf
    form.phone = nextProfile.phone
    form.avatarUrl = nextProfile.avatarUrl
    form.region = nextProfile.region
  },
  { immediate: true }
)

const onSubmit = async () => {
  saving.value = true
  feedback.message = ''

  try {
    const response = await $fetch<AccountProfileResponse>('/api/account/profile', {
      method: 'PATCH',
      body: {
        fullName: form.fullName,
        cpf: form.cpf,
        phone: form.phone,
        avatarUrl: form.avatarUrl,
        region: form.region
      },
      credentials: 'include'
    })

    await refresh()
    await fetchSession(true)
    feedback.tone = 'success'
    feedback.message =
      response.status === 'success' ? response.message || 'Dados da conta atualizados.' : 'Dados da conta atualizados.'
  } catch (error) {
    feedback.tone = 'error'
    feedback.message = getRequestErrorMessage(error, 'Nao foi possivel atualizar os dados da conta.')
  } finally {
    saving.value = false
  }
}

const onAvatarFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedAvatarFile.value = input.files?.[0] || null
}

const uploadAvatar = async () => {
  if (!selectedAvatarFile.value || avatarUploadPending.value) {
    return
  }

  avatarUploadPending.value = true
  feedback.message = ''

  try {
    const formData = new FormData()
    formData.append('file', selectedAvatarFile.value)

    const response = await $fetch<AccountAvatarUploadResponse>('/api/account/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel enviar o avatar.')
    }

    form.avatarUrl = response.data.url
    selectedAvatarFile.value = null
    feedback.tone = 'success'
    feedback.message = 'Avatar enviado com sucesso. Clique em Salvar dados para persistir na conta.'
  } catch (error) {
    feedback.tone = 'error'
    feedback.message = getRequestErrorMessage(error, 'Nao foi possivel enviar o avatar.')
  } finally {
    avatarUploadPending.value = false
  }
}
</script>

<template>
  <div class="section-stack account-page">
    <header class="page-heading">
      <p class="eyebrow">Conta</p>
      <h1>Dados da conta</h1>
      <p class="body-copy">
        Atualize suas informacoes de contato e mantenha seus dados visiveis para a plataforma.
      </p>
    </header>

    <UiPanel v-if="pending" tone="strong" class="loading-panel">
      <UiSpinner label="Carregando dados da conta" />
    </UiPanel>

    <UiPanel v-else-if="!profile" tone="strong">
      <p class="feedback-message" data-tone="error">
        {{ profileErrorMessage }}
      </p>
      <UiButton variant="secondary" @click="refresh">Tentar novamente</UiButton>
    </UiPanel>

    <div v-else class="account-grid">
      <UiPanel tone="strong">
        <form class="form-grid" @submit.prevent="onSubmit">
          <UiField label="Nome completo" required>
            <UiInput v-model="form.fullName" :disabled="saving" />
          </UiField>

          <UiField label="CPF" required>
            <UiInput 
              v-model="form.cpf" 
              mask="###.###.###-##"
              placeholder="Somente numeros" 
              :disabled="saving"
            />
          </UiField>

          <UiField label="Telefone" hint="Opcional.">
            <UiInput 
              v-model="form.phone" 
              mask="(##) #####-####"
              placeholder="(75) 99999-9999" 
              :disabled="saving" 
            />
          </UiField>

          <UiField label="URL do avatar" hint="Opcional.">
            <UiInput v-model="form.avatarUrl" type="url" placeholder="https://..." :disabled="saving || avatarUploadPending" />
          </UiField>

          <ImageUploadField
            label="Enviar avatar"
            hint="Opcional. Envie JPG, PNG, WEBP, SVG ou GIF de ate 10 MB."
            button-label="Enviar avatar"
            :loading="avatarUploadPending"
            :input-disabled="saving || avatarUploadPending"
            :disabled="saving || avatarUploadPending || !selectedAvatarFile"
            @select="onAvatarFileSelected"
            @upload="uploadAvatar"
          />

          <UiField label="Regiao" required>
            <UiSelect v-model="form.region" :disabled="saving">
              <option v-for="option in regionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>

          <p v-if="feedback.message" class="feedback-message" :data-tone="feedback.tone">
            {{ feedback.message }}
          </p>

          <UiButton type="submit" :loading="saving" :disabled="saving">
            {{ saving ? 'Salvando...' : 'Salvar dados' }}
          </UiButton>
        </form>
      </UiPanel>

      <UiPanel tone="default">
        <div class="readonly-stack">
          <div>
            <span class="readonly-label">E-mail</span>
            <strong>{{ profile.email }}</strong>
          </div>
          <div>
            <span class="readonly-label">Perfil</span>
            <strong>{{ formatRole(profile.role) }}</strong>
          </div>
          <div>
            <span class="readonly-label">Status</span>
            <strong>{{ formatStatus(profile.status) }}</strong>
          </div>
        </div>
      </UiPanel>
    </div>
  </div>
</template>

<style scoped>
.account-page {
  max-width: 980px;
}

.page-heading {
  display: grid;
  gap: 0.5rem;
}

.page-heading h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1;
}

.account-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(18rem, 0.8fr);
  gap: 1rem;
}

.form-grid,
.readonly-stack {
  display: grid;
  gap: 1rem;
}

.readonly-stack > div {
  display: grid;
  gap: 0.35rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.readonly-stack > div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.readonly-label {
  color: var(--ds-muted);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.loading-panel {
  display: grid;
  place-items: center;
  min-height: 14rem;
}

@media (max-width: 820px) {
  .account-grid {
    grid-template-columns: 1fr;
  }
}
</style>
