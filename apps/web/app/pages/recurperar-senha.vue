<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Recuperar senha'
})

const form = reactive({
  email: ''
})

const onSubmit = () => undefined
</script>

<template>
  <AuthShellCard
    title="Instituto Eurico Bergsten"
    subtitle="Insira seu e-mail e clique em enviar, para receber um link de recuperação de senha"
  >
    <form class="form-grid" @submit.prevent="onSubmit">
      <label class="field-label">
        E-mail
        <input v-model="form.email" type="email" class="input-field" placeholder="voce@exemplo.com" />
      </label>

      <button type="submit" class="button-primary">Enviar</button>
    </form>
  </AuthShellCard>
</template>

