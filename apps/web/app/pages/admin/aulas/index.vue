<script setup lang="ts">
import PageIntro from '../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Aulas'
})
</script>

<template>
  <SurfaceCard>
    <PageIntro
      eyebrow="Aulas"
      title="Gestao de aulas"
      description="Template inicial para conteudos de video, texto e audio com origem controlada pelo servidor."
    />
  </SurfaceCard>
</template>
