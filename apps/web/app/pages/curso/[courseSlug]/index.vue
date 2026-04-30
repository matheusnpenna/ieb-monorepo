<script setup lang="ts">
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))

useSeoMeta({
  title: `Curso ${courseSlug.value || ''}`.trim()
})

const modules = [
  {
    id: 'module-1',
    title: 'Modulo 01 - Fundamentos',
    description: 'Lista de modulos do curso e resumo do andamento do aluno.',
    href: `/curso/${courseSlug.value || 'fundamentos-da-videira'}/modulo/modulo-01`
  },
  {
    id: 'module-2',
    title: 'Modulo 02 - Praticas',
    description: 'Placeholder para liberacao de aulas e avaliacao.',
    href: `/curso/${courseSlug.value || 'fundamentos-da-videira'}/modulo/modulo-02`
  }
]
</script>

<template>
  <div class="section-stack">
    <SurfaceCard>
      <div class="section-stack">
        <span class="pill">Curso</span>
        <h1 class="display-title">{{ courseSlug }}</h1>
        <p class="body-copy">
          Esta tela concentra informacoes do curso, progresso percentual, certificado e modulos disponiveis.
        </p>
      </div>
    </SurfaceCard>

    <section class="grid-cards">
      <SurfaceCard v-for="module in modules" :key="module.id" as="article">
        <div class="section-stack">
          <h2 class="section-title">{{ module.title }}</h2>
          <p class="body-copy">{{ module.description }}</p>
          <NuxtLink :to="module.href" class="button-secondary">Abrir modulo</NuxtLink>
        </div>
      </SurfaceCard>
    </section>
  </div>
</template>
