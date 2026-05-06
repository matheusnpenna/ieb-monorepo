<script setup lang="ts">
import BrandMark from '../components/base/BrandMark.vue'
import UiButton from '../components/ui/UiButton.vue'
import { useAuthSession } from '../composables/use-auth-session'

const { user, clearUser } = useAuthSession()
const isLoggingOut = ref(false)

const links = [
  { label: 'Home', to: '/home' },
  { label: 'Cursos', to: '/curso/fundamentos-da-videira' },
  { label: 'Continuar assistindo', to: '/home#continuar' },
  { label: 'Perfil', to: '/home#perfil' }
]

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
</script>

<template>
  <div class="content-layout">
    <header class="page-shell content-header">
      <BrandMark />
      <div class="nav-group">
        <nav class="nav-links">
          <NuxtLink v-for="link in links" :key="link.to" :to="link.to">
            {{ link.label }}
          </NuxtLink>
          <NuxtLink v-if="user?.role === 'admin'" to="/admin">Admin</NuxtLink>
        </nav>

        <div class="nav-actions">
          <span v-if="user" class="pill">{{ user.fullName }}</span>
          <UiButton type="button" variant="secondary" size="sm" :disabled="isLoggingOut" @click="onLogout">
            {{ isLoggingOut ? 'Saindo...' : 'Sair' }}
          </UiButton>
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
