<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Cadastro'
})

const route = useRoute()
const classroomUuid = computed(() => String(route.query.turma ?? ''))

const form = reactive({
  fullName: '',
  cpf: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  region: 'feira-de-santana'
})

const registrationMessage = computed(() =>
  classroomUuid.value
    ? 'Validacao da turma pendente de implementacao.'
    : 'Periodo de cadastro encerrado. Para saber mais, entre em contato com o suporte responsável'
)

const onSubmit = () => undefined
</script>

<template>
  <AuthShellCard
    title="Instituto Eurico Bergsten"
    subtitle="Insira as informações para se cadastrar"
  >
    <p class="pill">Turma recebida: {{ classroomUuid || 'nao informada' }}</p>

    <p class="body-copy">{{ registrationMessage }}</p>

    <form class="form-grid" @submit.prevent="onSubmit">
      <label class="field-label">
        Nome
        <input v-model="form.fullName" type="text" class="input-field" placeholder="Seu nome completo" />
      </label>

      <label class="field-label">
        CPF
        <input v-model="form.cpf" type="text" class="input-field" placeholder="000.000.000-00" />
      </label>

      <label class="field-label">
        E-mail
        <input v-model="form.email" type="email" class="input-field" placeholder="voce@exemplo.com" />
      </label>

      <label class="field-label">
        Senha
        <input v-model="form.password" type="password" class="input-field" placeholder="Crie uma senha" />
      </label>

      <label class="field-label">
        Confirmação de senha
        <input
          v-model="form.passwordConfirmation"
          type="password"
          class="input-field"
          placeholder="Repita sua senha"
        />
      </label>

      <label class="field-label">
        Você é membro da Comunidade Videira em qual região?
        <select v-model="form.region" class="select-field">
          <option value="feira-de-santana">Feira de Santana</option>
          <option value="panambi">Panambi</option>
          <option value="sertao">Sertão</option>
          <option value="aluno-externo">Sou aluno externo</option>
        </select>
      </label>

      <button type="submit" class="button-primary">Criar cadastro</button>
    </form>
  </AuthShellCard>
</template>

