<script setup lang="ts">
import PageIntro from '../components/base/PageIntro.vue'
import FeaturedBanner from '../components/content/FeaturedBanner.vue'
import MetricCard from '../components/admin/MetricCard.vue'
import CourseGrid from '../components/content/CourseGrid.vue'

definePageMeta({
  layout: 'content'
})

useSeoMeta({
  title: 'Home'
})

const featuredSlides = [
  {
    id: 'slide-1',
    title: 'Novos cursos para lideranca e discipulado',
    description: 'Espaco reservado para noticias, lancamentos e avisos da plataforma.',
    badge: 'Destaques'
  }
]

const courses = [
  {
    id: 'course-1',
    title: 'Fundamentos da Videira',
    slug: 'fundamentos-da-videira',
    shortDescription: 'Curso introdutorio com trilha principal e modulos sequenciais.',
    coverImageUrl: null,
    meta: '8 modulos'
  },
  {
    id: 'course-2',
    title: 'Formacao Ministerial',
    slug: 'formacao-ministerial',
    shortDescription: 'Curso placeholder para a vitrine da home.',
    coverImageUrl: null,
    meta: 'Em breve'
  },
  {
    id: 'course-3',
    title: 'Escola de Lideranca',
    slug: 'escola-de-lideranca',
    shortDescription: 'Percurso focado em acompanhamento, cultura de servico e maturidade ministerial.',
    coverImageUrl: null,
    meta: '12 encontros'
  }
]

const metrics = [
  { label: 'Continuar assistindo', value: 'Aula 04', detail: 'Retomar o ultimo video assistido.' },
  { label: 'Cursos concluidos', value: '03', detail: 'Resumo de certificados liberados.' }
]
</script>

<template>
  <div class="section-stack">
    <FeaturedBanner
      v-for="slide in featuredSlides"
      :key="slide.id"
      :badge="slide.badge"
      :title="slide.title"
      :description="slide.description"
    />

    <section class="grid-cards">
      <MetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :detail="metric.detail"
      />
    </section>

    <section class="section-stack pt-4">
      <PageIntro
        eyebrow="Cursos"
        title="Todos os cursos que você tem acesso"
        description="Aqui estão todos os cursos que você tem acesso."
      />
      <CourseGrid :items="courses" />
    </section>
  </div>
</template>
