<script setup lang="ts">
import PageIntro from '../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Cursos'
})

const courses = [
  'Cadastro e publicacao de cursos',
  'Ordenacao de modulos',
  'Controle de certificado e progresso minimo'
]
</script>

<template>
  <SurfaceCard>
    <div class="section-stack">
      <PageIntro
        eyebrow="Cursos"
        title="Gestao de cursos"
        description="Tela-base para CRUD de cursos, status de publicacao e composicao da trilha."
      />

      <ul class="list-clean section-stack">
        <li v-for="course in courses" :key="course" class="body-copy">{{ course }}</li>
      </ul>
    </div>
  </SurfaceCard>
</template>
