<script setup lang="ts">
import SurfaceCard from '../../../../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const lessonSlug = computed(() => String(route.params.lessonSlug ?? ''))

useSeoMeta({
  title: `Aula ${lessonSlug.value || ''}`.trim()
})

const lessonActions = [
  'Registrar minuto assistido',
  'Marcar aula como assistida',
  'Mostrar materiais complementares'
]
</script>

<template>
  <div class="section-stack">
    <SurfaceCard>
      <div class="section-stack">
        <span class="pill">Aula</span>
        <h1 class="display-title">{{ lessonSlug }}</h1>
        <p class="body-copy">
          Template inicial para o player com HLS.js, resumo da aula e area de acompanhamento do progresso.
        </p>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <div class="section-stack">
        <h2 class="section-title">Player placeholder</h2>
        <div class="player-placeholder">Area reservada para video, texto ou audio.</div>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <div class="section-stack">
        <h2 class="section-title">Acoes do aluno</h2>
        <ul class="list-clean section-stack">
          <li v-for="action in lessonActions" :key="action" class="body-copy">{{ action }}</li>
        </ul>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.player-placeholder {
  min-height: 320px;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(71, 55, 36, 0.26);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.4);
  color: var(--color-muted);
}
</style>
