<script setup lang="ts">
import SurfaceCard from '../../../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const courseSlug = computed(() => String(route.params.courseSlug ?? ''))
const moduleSlug = computed(() => String(route.params.moduleSlug ?? ''))

useSeoMeta({
  title: `Modulo ${moduleSlug.value || ''}`.trim()
})

const lessons = [
  {
    id: 'lesson-1',
    title: 'Aula 01 - Introducao',
    description: 'Template para navegacao entre aulas do modulo.',
    href: `/curso/${courseSlug.value || 'fundamentos-da-videira'}/modulo/${moduleSlug.value || 'modulo-01'}/aula/aula-01`
  },
  {
    id: 'lesson-2',
    title: 'Aula 02 - Aplicacoes',
    description: 'Placeholder para progresso de video, audio ou texto.',
    href: `/curso/${courseSlug.value || 'fundamentos-da-videira'}/modulo/${moduleSlug.value || 'modulo-01'}/aula/aula-02`
  }
]

const assessmentHref = computed(
  () =>
    `/curso/${courseSlug.value || 'fundamentos-da-videira'}/modulo/${moduleSlug.value || 'modulo-01'}/avaliacao`
)
</script>

<template>
  <div class="section-stack">
    <SurfaceCard>
      <div class="section-stack">
        <span class="pill">Modulo</span>
        <h1 class="display-title">{{ moduleSlug }}</h1>
        <p class="body-copy">
          Estrutura reservada para descricao do modulo, aulas, marcacao de assistido e acesso a avaliacao.
        </p>
      </div>
    </SurfaceCard>

    <section class="grid-cards">
      <SurfaceCard v-for="lesson in lessons" :key="lesson.id" as="article">
        <div class="section-stack">
          <h2 class="section-title">{{ lesson.title }}</h2>
          <p class="body-copy">{{ lesson.description }}</p>
          <NuxtLink :to="lesson.href" class="button-secondary">Abrir aula</NuxtLink>
        </div>
      </SurfaceCard>
    </section>

    <SurfaceCard>
      <div class="section-stack">
        <h2 class="section-title">Avaliacao do modulo</h2>
        <p class="body-copy">
          Bloco inicial reservado para status de tentativas, nota minima e chamada para prova.
        </p>
        <NuxtLink :to="assessmentHref" class="button-primary">Ir para avaliacao</NuxtLink>
      </div>
    </SurfaceCard>
  </div>
</template>
