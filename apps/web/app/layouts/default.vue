<script setup lang="ts">
import AppFooter from '../components/base/AppFooter.vue'
import BrandMark from '../components/base/BrandMark.vue'

const links = [
  { label: 'Institucional', to: '/' },
  { label: 'Instagram', to: 'https://www.instagram.com/comunidadevideira/',          target: '_blank' },
  { label: 'Youtube',   to: "https://www.youtube.com/@VideiraTV",                    target: '_blank' },
  { label: 'Podcasts',  to: "https://www.youtube.com/@VideiraTV/podcasts",           target: '_blank' },
  { label: 'Macros e Celebrações', to: "https://www.youtube.com/@VideiraTV/streams", target: '_blank' },
  { label: 'Entrar', to: '/login' },
]
</script>

<template>
  <div class="layout-root">
    <header class="page-shell topbar">
      <BrandMark />
      <nav class="nav-links">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" :target="link.target || '_self'">
          {{ link.label }}
        </NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <AppFooter brand-to="/" />
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
