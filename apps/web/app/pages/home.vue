<script setup lang="ts">
import FeaturedBanner from '../components/content/FeaturedBanner.vue'
import AdminMetricCard from '../components/admin/AdminMetricCard.vue'

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

const rails = [
  {
    title: 'Todos os cursos',
    description: 'Carrosseis em grid para listar todos os cursos liberados ao aluno.',
    items: [
      {
        id: 'course-1',
        title: 'Fundamentos da Videira',
        description: 'Curso introdutorio com trilha principal e modulos sequenciais.',
        slug: 'fundamentos-da-videira',
        meta: '8 modulos'
      },
      {
        id: 'course-2',
        title: 'Formacao Ministerial',
        description: 'Curso placeholder para a vitrine da home.',
        slug: 'formacao-ministerial',
        meta: 'Em breve'
      }
    ]
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
      <AdminMetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :detail="metric.detail"
      />
    </section>
  </div>
</template>

