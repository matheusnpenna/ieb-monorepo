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
    <div class="flex items-center gap-5">
      <span class="pill w-fit">Aula</span>
      <h1 class="display-title">Titulo da aula</h1>
    </div>

    <SurfaceCard>
      <div class="section-stack">
        <div class="player-placeholder">Area reservada para video, texto ou audio.</div>
      </div>
    </SurfaceCard>

    <SurfaceCard>
      <div class="section-stack">
        <h2 class="section-title">Informações</h2>
        <p class="body-copy">
          Template inicial para o player com HLS.js, resumo da aula e area de acompanhamento do progresso.
        </p>
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
