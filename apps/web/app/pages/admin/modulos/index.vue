<script setup lang="ts">
import PageIntro from '../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Modulos'
})
</script>

<template>
  <SurfaceCard>
    <PageIntro
      eyebrow="Modulos"
      title="Gestao de modulos"
      description="Area reservada para criacao, ordenacao e vinculacao de modulos aos cursos."
    />
  </SurfaceCard>
</template>
