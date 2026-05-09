<script setup lang="ts">
import type { HomeHighlightsResponse } from '@ieb/shared'
import FeaturedBanner from './FeaturedBanner.vue'
import UiButton from '../ui/UiButton.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const defaultHighlightsResponse = {
  status: 'success',
  data: []
} satisfies HomeHighlightsResponse

const currentIndex = ref(0)

const { data: highlightsResponse, pending: highlightsPending } = await useAsyncData<HomeHighlightsResponse>(
  'home-highlights',
  () =>
    $fetch('/api/home/highlights', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultHighlightsResponse
  }
)

const highlights = computed(() => {
  if (!highlightsResponse.value || highlightsResponse.value.status !== 'success') {
    return []
  }

  return [...highlightsResponse.value.data].sort((left, right) => left.order - right.order)
})

const highlightsErrorMessage = computed(() => {
  if (!highlightsResponse.value || highlightsResponse.value.status !== 'error') {
    return ''
  }

  return highlightsResponse.value.messages[0] || 'Nao foi possivel carregar os destaques da plataforma.'
})

const hasCarousel = computed(() => highlights.value.length > 1)
const currentHighlight = computed(() => {
  if (highlights.value.length === 0) {
    return null
  }

  return highlights.value[currentIndex.value] || highlights.value[0] || null
})

watch(
  highlights,
  (items) => {
    if (items.length === 0) {
      currentIndex.value = 0
      return
    }

    if (currentIndex.value > items.length - 1) {
      currentIndex.value = 0
    }
  },
  { immediate: true }
)

const goToPrevious = () => {
  if (!hasCarousel.value) {
    return
  }

  currentIndex.value = currentIndex.value === 0 ? highlights.value.length - 1 : currentIndex.value - 1
}

const goToNext = () => {
  if (!hasCarousel.value) {
    return
  }

  currentIndex.value = currentIndex.value === highlights.value.length - 1 ? 0 : currentIndex.value + 1
}

const goToIndex = (index: number) => {
  currentIndex.value = index
}
</script>

<template>
  <section v-if="highlightsPending || highlightsErrorMessage || currentHighlight" class="section-stack">
    <UiSpinner v-if="highlightsPending" size="lg" label="Carregando destaques">
      <span class="body-copy">Carregando destaques da plataforma...</span>
    </UiSpinner>

    <p v-else-if="highlightsErrorMessage" class="body-copy">
      {{ highlightsErrorMessage }}
    </p>

    <div v-else-if="currentHighlight" class="section-stack">
      <div v-if="hasCarousel" class="highlights-toolbar">
        <span class="pill">Destaques</span>

        <div class="highlights-toolbar-actions">
          <UiButton type="button" variant="secondary" size="sm" @click="goToPrevious">
            Anterior
          </UiButton>
          <UiButton type="button" variant="secondary" size="sm" @click="goToNext">
            Proximo
          </UiButton>
        </div>
      </div>

      <FeaturedBanner
        :badge="hasCarousel ? `Destaque ${currentIndex + 1} de ${highlights.length}` : 'Destaque'"
        :title="currentHighlight.title"
        :description="currentHighlight.description"
        :media-type="currentHighlight.mediaType"
        :media-url="currentHighlight.mediaUrl"
        :actions="currentHighlight.actions"
      />

      <div v-if="hasCarousel" class="highlights-dots" role="tablist" aria-label="Selecionar destaque">
        <button
          v-for="(highlight, index) in highlights"
          :key="highlight.id"
          type="button"
          class="highlights-dot"
          :class="{ 'highlights-dot--active': index === currentIndex }"
          :aria-label="`Ir para destaque ${index + 1}`"
          :aria-pressed="index === currentIndex ? 'true' : 'false'"
          @click="goToIndex(index)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.highlights-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.highlights-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.highlights-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.highlights-dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease;
}

.highlights-dot--active {
  background: var(--ds-accent);
  transform: scale(1.1);
}
</style>
