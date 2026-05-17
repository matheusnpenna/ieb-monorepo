<script setup lang="ts">
import AppFooter from '../components/base/AppFooter.vue'
import BrandMark from '../components/base/BrandMark.vue'
import UiConfirmationModal from '../components/ui/UiConfirmationModal.vue'
import UiDropdownMenu from '../components/ui/UiDropdownMenu.vue'
import { useConfirmationModal } from '../composables/use-confirmation-modal'
import { useAuthSession } from '../composables/use-auth-session'

const { user, clearUser } = useAuthSession()
const { openConfirmationModal } = useConfirmationModal()
const isLoggingOut = ref(false)

const links = [
  { label: 'Home',      to: '/home', target: '_self' },
  { label: 'Instagram', to: 'https://www.instagram.com/comunidadevideira/',          target: '_blank' },
  { label: 'Youtube',   to: "https://www.youtube.com/@VideiraTV",                    target: '_blank' },
  { label: 'Podcasts',  to: "https://www.youtube.com/@VideiraTV/podcasts",           target: '_blank' },
  { label: 'Macros e Celebrações', to: "https://www.youtube.com/@VideiraTV/streams", target: '_blank' }
]

const accountMenuItems = computed(() => [
  { id: 'account', label: 'Dados da conta', to: '/conta' },
  { id: 'exams', label: 'Minhas provas', to: '/minhas-provas' },
  { id: 'password', label: 'Trocar a senha', to: '/trocar-senha' },
  {
    id: 'logout',
    label: isLoggingOut.value ? 'Saindo...' : 'Sair',
    tone: 'danger' as const,
    disabled: isLoggingOut.value
  }
])

const onLogout = async () => {
  isLoggingOut.value = true

  try {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
  } finally {
    clearUser()
    isLoggingOut.value = false
    await navigateTo('/login')
  }
}

const onAccountMenuSelect = async (itemId: string) => {
  if (itemId !== 'logout' || isLoggingOut.value) {
    return
  }

  openConfirmationModal({
    title: 'Confirmar saida',
    message: 'Deseja realmente sair da plataforma neste dispositivo?',
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'confirm',
        label: 'Sair',
        errorMessage: 'Nao foi possivel concluir a saida da plataforma.',
        onClick: onLogout
      }
    ]
  })
}
</script>

<template>
  <div class="content-layout">
    <header class="page-shell content-header">
      <BrandMark mode="icon" to="/home" />
      <div class="nav-group">
        <nav class="nav-links">
          <NuxtLink v-for="link in links" :key="link.to" :to="link.to" :target="link.target">
            {{ link.label }}
          </NuxtLink>
          <NuxtLink v-if="user?.role === 'admin'" to="/admin">Admin</NuxtLink>
        </nav>

        <div class="nav-actions">
          <UiDropdownMenu
            v-if="user"
            :user-name="user.fullName"
            :avatar-url="user.avatarUrl"
            :items="accountMenuItems"
            :busy-item-id="isLoggingOut ? 'logout' : null"
            @select="onAccountMenuSelect"
          />
        </div>
      </div>
    </header>

    <main class="page-shell">
      <slot />
    </main>

    <AppFooter brand-to="/home" />
    <UiConfirmationModal />
  </div>
</template>

<style scoped>
.content-layout {
  padding: 1rem 0 3rem;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  color: var(--color-muted);
}

.nav-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}

.nav-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .content-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .nav-group {
    justify-content: flex-start;
  }
}
</style>
