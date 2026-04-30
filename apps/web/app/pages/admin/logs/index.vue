<script setup lang="ts">
import PageIntro from '../../../components/base/PageIntro.vue'
import SurfaceCard from '../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin Logs'
})

const logColumns = ['ator', 'acao', 'colecao', 'alvo', 'data']
</script>

<template>
  <SurfaceCard>
    <div class="section-stack">
      <PageIntro
        eyebrow="Logs"
        title="Auditoria administrativa"
        description="Estrutura inicial para rastrear todas as acoes feitas no painel com contexto de usuario e entidade."
      />

      <div class="grid-cards">
        <SurfaceCard v-for="column in logColumns" :key="column">
          <span class="eyebrow">{{ column }}</span>
        </SurfaceCard>
      </div>
    </div>
  </SurfaceCard>
</template>
