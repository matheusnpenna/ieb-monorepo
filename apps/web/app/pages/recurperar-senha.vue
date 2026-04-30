<script setup lang="ts">
import { getRequestErrorMessage } from '../lib/utils'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Recuperar senha'
})

const form = reactive({
  email: ''
})

const pending = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<'success' | 'error'>('success')

const onSubmit = async () => {
  pending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<{ message: string }>('/api/auth/password-recovery', {
      method: 'POST',
      body: {
        email: form.email
      }
    })

    feedbackTone.value = 'success'
    feedbackMessage.value = response.message
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(
      error,
      'Nao foi possivel enviar a recuperacao de senha.'
    )
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AuthShellCard
    title="Instituto Eurico Bergsten"
    subtitle="Insira seu e-mail e clique em enviar, para receber um link de recuperação de senha"
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

      <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">{{ feedbackMessage }}</p>

      <button type="submit" class="button-primary" :disabled="pending">
        {{ pending ? 'Enviando...' : 'Enviar' }}
      </button>
    </form>
  </AuthShellCard>
</template>
