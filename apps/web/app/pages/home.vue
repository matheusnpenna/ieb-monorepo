<script setup lang="ts">
import HomeHighlightsCarousel from '../components/content/HomeHighlightsCarousel.vue'
import HomeMetricsOverview from '../components/content/HomeMetricsOverview.vue'
import MyCoursesGrid from '../components/content/MyCoursesGrid.vue'

definePageMeta({
  layout: 'content'
})

useSeoMeta({
  title: 'Home'
})
</script>

<template>
  <div class="section-stack">
    <HomeHighlightsCarousel />

    <HomeMetricsOverview />

    <MyCoursesGrid />
  </div>
</template>
