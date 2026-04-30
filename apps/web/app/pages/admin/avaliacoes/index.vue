<script setup lang="ts">
import PageIntro from '../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Avaliacoes'
})
</script>

<template>
  <SurfaceCard>
    <PageIntro
      eyebrow="Avaliacoes"
      title="Gestao de provas"
      description="Base para montar questoes, nota de corte, tentativas e politica de aprovacao."
    />
  </SurfaceCard>
</template>
