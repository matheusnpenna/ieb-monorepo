<script setup lang="ts">
import AuthShellCard from '../components/auth/AuthShellCard.vue'
import { getRequestErrorMessage } from '../lib/utils'
import UiButton from '../components/ui/UiButton.vue'
import UiField from '../components/ui/UiField.vue'
import UiInput from '../components/ui/UiInput.vue'

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
      <UiField label="E-mail" required>
        <UiInput
          v-model="form.email"
          type="email"
          placeholder="voce@exemplo.com"
          :disabled="pending"
        />
      </UiField>

      <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">{{ feedbackMessage }}</p>

      <UiButton type="submit" block :loading="pending" :disabled="pending">
        {{ pending ? 'Enviando...' : 'Enviar' }}
      </UiButton>
    </form>
  </AuthShellCard>
</template>
