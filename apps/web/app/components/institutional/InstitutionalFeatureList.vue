<script setup lang="ts">
defineProps<{
  items: Array<{
    title: string
    description: string
  }>
}>()
</script>

<template>
  <div class="grid-cards">
    <SurfaceCard v-for="item in items" :key="item.title">
      <div class="section-stack">
        <h3>{{ item.title }}</h3>
        <p class="body-copy">{{ item.description }}</p>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
h3 {
  margin: 0;
  font-size: 1.05rem;
}
</style>

