<script setup lang="ts">
import type { AdminUsersResponse, User } from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const formatRole = (value: User['role']) => (value === 'admin' ? 'Administrador' : 'Aluno')

const formatStatus = (value: User['status']) => {
  if (value === 'blocked') {
    return 'Bloqueado'
  }

  if (value === 'invited') {
    return 'Convidado'
  }

  return 'Ativo'
}

const formatRegion = (value: User['region']) => {
  if (value === 'feira-de-santana') return 'Feira de Santana'
  if (value === 'aluno-externo') return 'Aluno externo'
  if (value === 'panambi') return 'Panambi'

  return 'Sertao'
}

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return 'nunca acessou'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

const defaultUsersResponse = {
  status: 'success',
  data: []
} satisfies AdminUsersResponse

const searchTerm = ref('')

const { data: usersResponse, pending: usersPending } = await useAsyncData<AdminUsersResponse>(
  'admin-users-list',
  () =>
    $fetch('/api/admin/users', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultUsersResponse
  }
)

const users = computed(() => {
  if (!usersResponse.value || usersResponse.value.status !== 'success') {
    return []
  }

  return [...usersResponse.value.data].sort((left, right) => left.fullName.localeCompare(right.fullName, 'pt-BR'))
})

const filteredUsers = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  if (!normalizedSearch) {
    return users.value
  }

  return users.value.filter(
    (user) =>
      user.fullName.toLowerCase().includes(normalizedSearch) || user.email.toLowerCase().includes(normalizedSearch)
  )
})

const usersErrorMessage = computed(() => {
  if (!usersResponse.value || usersResponse.value.status !== 'error') {
    return ''
  }

  return usersResponse.value.messages[0] || 'Nao foi possivel carregar os usuarios do painel.'
})
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Usuarios"
      title="Usuarios cadastrados"
      description="Consulte alunos e administradores, filtre por nome ou e-mail e entre na edicao para revisar perfil e status."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="list-toolbar">
          <UiInput v-model="searchTerm" placeholder="Pesquisar por nome ou e-mail" />

          <UiButton to="/admin/usuarios/novo" variant="success" size="lg">
            Novo usuario
          </UiButton>
        </div>

        <UiSpinner v-if="usersPending" size="lg" label="Carregando usuarios do painel">
          <span class="body-copy">Carregando usuarios do painel...</span>
        </UiSpinner>

        <p v-else-if="usersErrorMessage" class="feedback-message" data-tone="error">
          {{ usersErrorMessage }}
        </p>

        <p v-else-if="filteredUsers.length === 0" class="body-copy">
          Nenhum usuario encontrado com este filtro.
        </p>

        <ul v-else class="list-clean user-list">
          <li v-for="user in filteredUsers" :key="user.id">
            <SurfaceCard as="article">
              <div class="section-stack user-card">
                <div class="user-card-header">
                  <div class="section-stack user-card-copy">
                    <div class="user-card-meta">
                      <span class="pill">{{ formatRole(user.role) }}</span>
                      <span class="pill">{{ formatStatus(user.status) }}</span>
                      <span class="body-copy">{{ formatRegion(user.region) }}</span>
                    </div>
                    <h2 class="section-title user-card-title">{{ user.fullName }}</h2>
                    <p class="body-copy">{{ user.email }}</p>
                  </div>

                  <UiButton :to="`/admin/usuarios/${user.id}`" variant="secondary" size="sm">
                    Editar usuario
                  </UiButton>
                </div>

                <div class="user-card-footer">
                  <span class="body-copy">CPF: {{ user.cpf }}</span>
                  <span class="body-copy">Telefone: {{ user.phone || 'nao informado' }}</span>
                  <span class="body-copy">Ultimo acesso: {{ formatTimestamp(user.lastLoginAt) }}</span>
                </div>
              </div>
            </SurfaceCard>
          </li>
        </ul>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.list-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
}

.user-list {
  display: grid;
  gap: 1rem;
}

.user-card {
  gap: 1rem;
}

.user-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.user-card-copy {
  gap: 0.75rem;
}

.user-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.user-card-title {
  font-size: 1.35rem;
}

.user-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

@media (max-width: 768px) {
  .list-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
