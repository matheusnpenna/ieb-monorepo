<script setup lang="ts">
const menu = [
  { label: 'Visao geral', to: '/admin' },
  { label: 'Cursos', to: '/admin/cursos' },
  { label: 'Modulos', to: '/admin/modulos' },
  { label: 'Aulas', to: '/admin/aulas' },
  { label: 'Avaliacoes', to: '/admin/avaliacoes' },
  { label: 'Turmas', to: '/admin/turmas' },
  { label: 'Usuarios', to: '/admin/usuarios' },
  { label: 'Logs', to: '/admin/logs' },
  { label: 'Destaques', to: '/admin/destaques' }
]
</script>

<template>
  <div class="admin-layout page-shell">
    <aside class="glass-panel sidebar">
      <BrandMark />
      <nav class="sidebar-nav">
        <NuxtLink v-for="item in menu" :key="item.to" :to="item.to">
          {{ item.label }}
        </NuxtLink>
      </nav>
    </aside>

    <main class="admin-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 1.25rem;
  padding: 1rem 0 2rem;
}

.sidebar {
  position: sticky;
  top: 1rem;
  display: grid;
  gap: 1.5rem;
  align-self: start;
  padding: 1.25rem;
}

.sidebar-nav {
  display: grid;
  gap: 0.75rem;
  color: var(--color-muted);
}

.admin-content {
  display: grid;
  gap: 1.25rem;
}

@media (max-width: 960px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
</style>

