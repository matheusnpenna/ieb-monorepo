<script setup lang="ts">
import FeaturedBanner from '../components/content/FeaturedBanner.vue'
import MetricCard from '../components/admin/MetricCard.vue'
import MyCoursesGrid from '../components/content/MyCoursesGrid.vue'

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

    <MyCoursesGrid />
  </div>
</template>
