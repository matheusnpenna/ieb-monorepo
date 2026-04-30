<script setup lang="ts">
import PageIntro from '../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Destaques'
})
</script>

<template>
  <SurfaceCard>
    <PageIntro
      eyebrow="Destaques"
      title="Gestao de banners e novidades"
      description="Tela-base para controlar o carrossel de noticias, novos cursos e comunicados da home."
    />
  </SurfaceCard>
</template>
