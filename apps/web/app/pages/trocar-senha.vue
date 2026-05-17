<script setup lang="ts">
import type { AccountPasswordResponse } from '@ieb/shared'
import UiButton from '../components/ui/UiButton.vue'
import UiField from '../components/ui/UiField.vue'
import UiInput from '../components/ui/UiInput.vue'
import UiPanel from '../components/ui/UiPanel.vue'
import { getRequestErrorMessage } from '../lib/utils'

definePageMeta({
  layout: 'content'
})

useSeoMeta({
  title: 'Trocar senha'
})

const form = reactive({
  currentPassword: '',
  newPassword: '',
  newPasswordConfirmation: ''
})
const pending = ref(false)
const feedback = reactive({
  tone: 'success' as 'success' | 'error',
  message: ''
})

const resetForm = () => {
  form.currentPassword = ''
  form.newPassword = ''
  form.newPasswordConfirmation = ''
}

const onSubmit = async () => {
  if (form.newPassword !== form.newPasswordConfirmation) {
    feedback.tone = 'error'
    feedback.message = 'A confirmacao da nova senha precisa ser igual a senha informada.'
    return
  }

  pending.value = true
  feedback.message = ''

  try {
    const response = await $fetch<AccountPasswordResponse>('/api/account/password', {
      method: 'POST',
      body: {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        newPasswordConfirmation: form.newPasswordConfirmation
      },
      credentials: 'include'
    })

    resetForm()
    feedback.tone = 'success'
    feedback.message =
      response.status === 'success' ? response.message || 'Senha atualizada com sucesso.' : 'Senha atualizada com sucesso.'
  } catch (error) {
    feedback.tone = 'error'
    feedback.message = getRequestErrorMessage(error, 'Nao foi possivel atualizar a senha.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="section-stack password-page">
    <header class="page-heading">
      <p class="eyebrow">Conta</p>
      <h1>Trocar senha</h1>
      <p class="body-copy">
        Confirme sua senha atual para criar uma nova senha de acesso.
      </p>
    </header>

    <UiPanel tone="strong">
      <form class="form-grid" @submit.prevent="onSubmit">
        <UiField label="Senha atual" required>
          <UiInput
            v-model="form.currentPassword"
            type="password"
            autocomplete="current-password"
            :disabled="pending"
          />
        </UiField>

        <UiField label="Nova senha" hint="Use pelo menos 6 caracteres." required>
          <UiInput
            v-model="form.newPassword"
            type="password"
            autocomplete="new-password"
            :disabled="pending"
          />
        </UiField>

        <UiField label="Confirmacao da nova senha" required>
          <UiInput
            v-model="form.newPasswordConfirmation"
            type="password"
            autocomplete="new-password"
            :disabled="pending"
          />
        </UiField>

        <p v-if="feedback.message" class="feedback-message" :data-tone="feedback.tone">
          {{ feedback.message }}
        </p>

        <UiButton type="submit" :loading="pending" :disabled="pending">
          {{ pending ? 'Atualizando...' : 'Atualizar senha' }}
        </UiButton>
      </form>
    </UiPanel>
  </div>
</template>

<style scoped>
.password-page {
  max-width: 720px;
}

.page-heading,
.form-grid {
  display: grid;
  gap: 1rem;
}

.page-heading {
  gap: 0.5rem;
}

.page-heading h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1;
}
</style>
