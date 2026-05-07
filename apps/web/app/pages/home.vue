<script setup lang="ts">
import FeaturedBanner from '../components/content/FeaturedBanner.vue'
import HomeMetricsOverview from '../components/content/HomeMetricsOverview.vue'
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
    title: 'Nossos cursos para discipulado e liderança',
    description: 'Espaco reservado para noticias, lancamentos e avisos da plataforma.',
    badge: 'Destaques'
  }
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

    <HomeMetricsOverview />

    <MyCoursesGrid />
  </div>
</template>
