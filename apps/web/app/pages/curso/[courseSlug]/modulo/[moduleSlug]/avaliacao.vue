<script setup lang="ts">
import SurfaceCard from '../../../../../components/base/SurfaceCard.vue'

definePageMeta({
  layout: 'content'
})

const route = useRoute()
const moduleSlug = computed(() => String(route.params.moduleSlug ?? ''))

useSeoMeta({
  title: `Avaliacao ${moduleSlug.value || ''}`.trim()
})

const questions = [
  'Pergunta 01 placeholder para questoes objetivas.',
  'Pergunta 02 placeholder para feedback e explicacao.'
]

const onSubmit = () => undefined
</script>

<template>
  <SurfaceCard>
    <div class="section-stack">
      <span class="pill">Avaliacao</span>
      <h1 class="display-title">{{ moduleSlug }}</h1>
      <p class="body-copy">
        Estrutura inicial para prova do modulo com nota minima, tempo limite e submissao.
      </p>

      <form class="section-stack" @submit.prevent="onSubmit">
        <label v-for="question in questions" :key="question" class="field-label">
          {{ question }}
          <textarea class="textarea-field" rows="4" placeholder="Resposta placeholder" />
        </label>

        <button type="submit" class="button-primary">Enviar avaliacao</button>
      </form>
    </div>
  </SurfaceCard>
</template>
