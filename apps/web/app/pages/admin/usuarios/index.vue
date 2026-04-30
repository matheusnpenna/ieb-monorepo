<script setup lang="ts">
import PageIntro from '../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Usuarios'
})
</script>

<template>
  <SurfaceCard>
    <PageIntro
      eyebrow="Usuarios"
      title="Gestao de alunos e administradores"
      description="Tela-base para perfil, status, tipo de acesso e historico administrativo."
    />
  </SurfaceCard>
</template>
