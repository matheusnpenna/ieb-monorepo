<script setup lang="ts">
import BrandMark from '../components/base/BrandMark.vue'

const links = [
  { label: 'Institucional', to: '/' },
  { label: 'Entrar', to: '/login' },
  { label: 'Plataforma', to: '/home' },
  { label: 'Admin', to: '/admin' }
]
</script>

<template>
  <div class="layout-root">
    <header class="page-shell topbar">
      <BrandMark />
      <nav class="nav-links">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">
          {{ link.label }}
        </NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.layout-root {
  padding: 1rem 0 3rem;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--color-muted);
}

@media (max-width: 768px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
