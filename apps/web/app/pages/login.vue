<script setup lang="ts">
import type { AuthSuccessResponse } from '@ieb/shared'
import { useAuthSession } from '../composables/use-auth-session'
import { getRequestErrorMessage, resolveSafeRedirect } from '../lib/utils'

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
          placeholder="Sua senha"
          :disabled="pending"
        />
      </label>

      <p v-if="feedbackMessage" class="feedback-message" data-tone="error">{{ feedbackMessage }}</p>

      <button type="submit" class="button-primary" :disabled="pending">
        {{ pending ? 'Entrando...' : 'Entrar' }}
      </button>
      <NuxtLink to="/recurperar-senha" class="body-copy">Esqueci minha senha</NuxtLink>
    </form>
  </AuthShellCard>
</template>
