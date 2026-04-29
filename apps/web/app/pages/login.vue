<script setup lang="ts">
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

const onSubmit = () => undefined
</script>

<template>
  <AuthShellCard
    title="Instituto Eurico Bergsten"
    subtitle="Bem vindo(a) de volta"
  >
    <form class="form-grid" @submit.prevent="onSubmit">
      <label class="field-label">
        E-mail
        <input v-model="form.email" type="email" class="input-field" placeholder="voce@exemplo.com" />
      </label>

      <label class="field-label">
        Senha
        <input v-model="form.password" type="password" class="input-field" placeholder="Sua senha" />
      </label>

      <button type="submit" class="button-primary">Entrar</button>
      <NuxtLink to="/recurperar-senha" class="body-copy">Esqueci minha senha</NuxtLink>
    </form>
  </AuthShellCard>
</template>

