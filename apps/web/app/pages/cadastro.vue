<script setup lang="ts">
import type {
  AuthSuccessResponse,
  UserRegion
} from '@ieb/shared'
import AuthShellCard from '../components/auth/AuthShellCard.vue'
import { useAuthSession } from '../composables/use-auth-session'
import { getRequestErrorMessage } from '../lib/utils'
import UiButton from '../components/ui/UiButton.vue'
import UiField from '../components/ui/UiField.vue'
import UiInput from '../components/ui/UiInput.vue'
import UiSelect from '../components/ui/UiSelect.vue'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Cadastro de aluno'
})

const { setUser } = useAuthSession()
const pending = ref(false)
const feedbackMessage = ref('')

const form = reactive({
  fullName: '',
  cpf: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
  region: 'feira-de-santana' as UserRegion
})

const onSubmit = async () => {
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
        fullName: form.fullName,
        cpf: form.cpf,
        email: form.email,
        phone: form.phone,
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
    subtitle="Crie sua conta de aluno para acessar a plataforma"
  >
    <p class="feedback-message">
      Seu cadastro cria apenas a conta de acesso. A matrícula em cursos será liberada depois por um administrador.
    </p>

    <form class="form-grid" @submit.prevent="onSubmit">
      <UiField label="Nome completo" required>
        <UiInput
          v-model="form.fullName"
          type="text"
          placeholder="Seu nome completo"
          :disabled="pending"
        />
      </UiField>

      <UiField label="CPF" required>
        <UiInput
          v-model="form.cpf"
          type="text"
          placeholder="000.000.000-00"
          :disabled="pending"
        />
      </UiField>

      <UiField label="E-mail" required>
        <UiInput
          v-model="form.email"
          type="email"
          placeholder="voce@exemplo.com"
          :disabled="pending"
        />
      </UiField>

      <UiField label="Telefone" hint="Opcional.">
        <UiInput
          v-model="form.phone"
          type="tel"
          placeholder="(75) 99999-9999"
          :disabled="pending"
        />
      </UiField>

      <UiField label="Senha" required>
        <UiInput
          v-model="form.password"
          type="password"
          placeholder="Crie uma senha"
          :disabled="pending"
        />
      </UiField>

      <UiField label="Confirmacao de senha" required>
        <UiInput
          v-model="form.passwordConfirmation"
          type="password"
          placeholder="Repita sua senha"
          :disabled="pending"
        />
      </UiField>

      <UiField label="Regiao da Comunidade Videira" required>
        <UiSelect v-model="form.region" :disabled="pending">
          <option value="feira-de-santana">Feira de Santana</option>
          <option value="panambi">Panambi</option>
          <option value="sertao">Sertão</option>
          <option value="aluno-externo">Sou aluno externo</option>
        </UiSelect>
      </UiField>

      <p v-if="feedbackMessage" class="feedback-message" data-tone="error">{{ feedbackMessage }}</p>

      <UiButton type="submit" block :loading="pending" :disabled="pending">
        {{ pending ? 'Criando cadastro...' : 'Criar cadastro' }}
      </UiButton>
      <NuxtLink to="/login" class="body-copy">Ja tenho cadastro</NuxtLink>
    </form>
  </AuthShellCard>
</template>
