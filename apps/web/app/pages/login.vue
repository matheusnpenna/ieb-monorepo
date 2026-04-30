<script setup lang="ts">
import type { AuthSuccessResponse } from '@ieb/shared'
import AuthShellCard from '../components/auth/AuthShellCard.vue'
import { useAuthSession } from '../composables/use-auth-session'
import { getRequestErrorMessage, resolveSafeRedirect } from '../lib/utils'
import UiButton from '../components/ui/UiButton.vue'
import UiField from '../components/ui/UiField.vue'
import UiInput from '../components/ui/UiInput.vue'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Login'
})

const form = reactive({
  email: '',
  password: ''
})

const route = useRoute()
const { setUser } = useAuthSession()
const pending = ref(false)
const feedbackMessage = ref('')

const redirectTo = computed(() => resolveSafeRedirect(route.query.redirect))

const onSubmit = async () => {
  pending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AuthSuccessResponse>('/api/auth/login', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password
      },
      credentials: 'include'
    })

    setUser(response.user)
    await navigateTo(redirectTo.value)
  } catch (error) {
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel concluir o login.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AuthShellCard
    title="Instituto Eurico Bergsten"
    subtitle="Bem vindo(a) de volta"
  >
    <form class="form-grid" @submit.prevent="onSubmit">
      <UiField label="E-mail" required>
        <UiInput
          v-model="form.email"
          type="email"
          placeholder="voce@exemplo.com"
          :disabled="pending"
        />
      </UiField>

      <UiField label="Senha" required>
        <UiInput
          v-model="form.password"
          type="password"
          placeholder="Sua senha"
          :disabled="pending"
        />
      </UiField>

      <p v-if="feedbackMessage" class="feedback-message" data-tone="error">{{ feedbackMessage }}</p>

      <UiButton type="submit" block :loading="pending" :disabled="pending">
        {{ pending ? 'Entrando...' : 'Entrar' }}
      </UiButton>
      <NuxtLink to="/recurperar-senha" class="body-copy">Esqueci minha senha</NuxtLink>
    </form>
  </AuthShellCard>
</template>
