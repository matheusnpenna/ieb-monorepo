<script setup lang="ts">
interface CourseRailItem {
  id: string
  title: string
  description: string
  slug: string
  meta: string
}

defineProps<{
  title: string
  description: string
  items: CourseRailItem[]
}>()
</script>

<template>
  <section class="section-stack">
    <PageIntro :eyebrow="title" :title="title" :description="description" />
    <div class="grid-cards">
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/curso/${item.slug}`"
        class="course-card glass-panel"
      >
        <span class="pill">{{ item.meta }}</span>
        <h3>{{ item.title }}</h3>
        <p class="body-copy">{{ item.description }}</p>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.course-card {
  display: grid;
  gap: 0.85rem;
  padding: 1.25rem;
}

h3 {
  margin: 0;
  font-size: 1.08rem;
}
</style>

