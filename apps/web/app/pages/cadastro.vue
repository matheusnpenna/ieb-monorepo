<script setup lang="ts">
import type {
  AuthSuccessResponse,
  RegistrationStatusResponse,
  UserRegion
} from '@ieb/shared'
import { useAuthSession } from '../composables/use-auth-session'
import { getRequestErrorMessage } from '../lib/utils'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Cadastro'
})

const route = useRoute()
const { setUser } = useAuthSession()
const pending = ref(false)
const feedbackMessage = ref('')
const classroomUuid = computed(() => String(route.query.turma ?? ''))

const form = reactive({
  fullName: '',
  cpf: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  region: 'feira-de-santana' as UserRegion
})

const closedRegistrationState: RegistrationStatusResponse = {
  isOpen: false,
  message: 'Periodo de cadastro encerrado. Para saber mais, entre em contato com o suporte responsável',
  classroomName: null
}

const { data: registrationStatus, pending: registrationPending } = await useFetch<RegistrationStatusResponse>(
  '/api/auth/registration-status',
  {
    query: {
      classroomUuid
    },
    default: () => closedRegistrationState,
    watch: [classroomUuid]
  }
)

const canRegister = computed(() => registrationStatus.value?.isOpen ?? false)

const onSubmit = async () => {
  if (!canRegister.value) {
    feedbackMessage.value = closedRegistrationState.message
    return
  }

  if (form.password !== form.passwordConfirmation) {
    feedbackMessage.value = 'A confirmacao de senha precisa ser igual a senha informada.'
    return
  }

  pending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AuthSuccessResponse>('/api/auth/register', {
      method: 'POST',
      body: {
        classroomUuid: classroomUuid.value,
        fullName: form.fullName,
        cpf: form.cpf,
        email: form.email,
        password: form.password,
        region: form.region
      },
      credentials: 'include'
    })

    setUser(response.user)
    await navigateTo('/home')
  } catch (error) {
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel concluir o cadastro.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AuthShellCard
    title="Instituto Eurico Bergsten"
    subtitle="Insira as informações para se cadastrar"
  >
    <p class="pill">
      Turma:
      {{ registrationStatus.classroomName || classroomUuid || 'nao informada' }}
    </p>

    <p v-if="registrationPending" class="feedback-message">Validando disponibilidade da turma...</p>
    <p v-else class="feedback-message" :data-tone="canRegister ? 'success' : 'error'">
      {{ registrationStatus.message }}
    </p>

    <form v-if="canRegister" class="form-grid" @submit.prevent="onSubmit">
      <label class="field-label">
        Nome
        <input
          v-model="form.fullName"
          type="text"
          class="input-field"
          placeholder="Seu nome completo"
          :disabled="pending"
        />
      </label>

      <label class="field-label">
        CPF
        <input
          v-model="form.cpf"
          type="text"
          class="input-field"
          placeholder="000.000.000-00"
          :disabled="pending"
        />
      </label>

      <label class="field-label">
        E-mail
        <input
          v-model="form.email"
          type="email"
          class="input-field"
          placeholder="voce@exemplo.com"
          :disabled="pending"
        />
      </label>

      <label class="field-label">
        Senha
        <input
          v-model="form.password"
          type="password"
          class="input-field"
          placeholder="Crie uma senha"
          :disabled="pending"
        />
      </label>

      <label class="field-label">
        Confirmação de senha
        <input
          v-model="form.passwordConfirmation"
          type="password"
          class="input-field"
          placeholder="Repita sua senha"
          :disabled="pending"
        />
      </label>

      <label class="field-label">
        Você é membro da Comunidade Videira em qual região?
        <select v-model="form.region" class="select-field" :disabled="pending">
          <option value="feira-de-santana">Feira de Santana</option>
          <option value="panambi">Panambi</option>
          <option value="sertao">Sertão</option>
          <option value="aluno-externo">Sou aluno externo</option>
        </select>
      </label>

      <p v-if="feedbackMessage" class="feedback-message" data-tone="error">{{ feedbackMessage }}</p>

      <button type="submit" class="button-primary" :disabled="pending">
        {{ pending ? 'Criando cadastro...' : 'Criar cadastro' }}
      </button>
    </form>
  </AuthShellCard>
</template>
