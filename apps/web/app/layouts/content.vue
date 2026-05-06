<script setup lang="ts">
import BrandMark from '../components/base/BrandMark.vue'
import UiDropdownMenu from '../components/ui/UiDropdownMenu.vue'
import { useAuthSession } from '../composables/use-auth-session'

const { user, clearUser } = useAuthSession()
const isLoggingOut = ref(false)

const links = [
  { label: 'Home', to: '/home' },
  { label: 'Cursos', to: '/curso/fundamentos-da-videira' },
]

const accountMenuItems = computed(() => [
  { id: 'account', label: 'Dados da conta', to: '/home#perfil' },
  { id: 'exams', label: 'Minhas provas', to: '/home#provas' },
  { id: 'password', label: 'Trocar a senha', to: '/recurperar-senha' },
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

  await onLogout()
}
</script>

<template>
  <div class="content-layout">
    <header class="page-shell content-header">
      <BrandMark mode="icon" to="/home" />
      <div class="nav-group">
        <nav class="nav-links">
          <NuxtLink v-for="link in links" :key="link.to" :to="link.to">
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
