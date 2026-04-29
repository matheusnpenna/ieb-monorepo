<script setup lang="ts">
const links = [
  { label: 'Home', to: '/home' },
  { label: 'Cursos', to: '/curso/fundamentos-da-videira' },
  { label: 'Continuar assistindo', to: '/home#continuar' },
  { label: 'Perfil', to: '/home#perfil' }
]
</script>

<template>
  <div class="content-layout">
    <header class="page-shell content-header">
      <BrandMark />
      <nav class="nav-links">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">
          {{ link.label }}
        </NuxtLink>
      </nav>
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

@media (max-width: 768px) {
  .content-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

