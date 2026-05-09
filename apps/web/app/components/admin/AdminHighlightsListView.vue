<script setup lang="ts">
import type { AdminHighlightsResponse, PlatformHighlight } from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiInput from '../ui/UiInput.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const formatMediaType = (value: PlatformHighlight['mediaType']) => {
  if (value === 'image') {
    return 'Imagem'
  }

  if (value === 'video') {
    return 'Video'
  }

  return 'Sem midia'
}

const defaultHighlightsResponse = {
  status: 'success',
  data: []
} satisfies AdminHighlightsResponse

const searchTerm = ref('')

const { data: highlightsResponse, pending: highlightsPending } = await useAsyncData<AdminHighlightsResponse>(
  'admin-highlights-list',
  () =>
    $fetch('/api/admin/highlights', {
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

  return [...highlightsResponse.value.data].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order
    }

    return left.title.localeCompare(right.title, 'pt-BR')
  })
})

const filteredHighlights = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  if (!normalizedSearch) {
    return highlights.value
  }

  return highlights.value.filter(
    (highlight) =>
      highlight.title.toLowerCase().includes(normalizedSearch) ||
      highlight.description.toLowerCase().includes(normalizedSearch)
  )
})

const highlightsErrorMessage = computed(() => {
  if (!highlightsResponse.value || highlightsResponse.value.status !== 'error') {
    return ''
  }

  return highlightsResponse.value.messages[0] || 'Nao foi possivel carregar os destaques do painel.'
})
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Destaques"
      title="Destaques cadastrados"
      description="Gerencie os avisos que aparecem para os alunos na home, escolha quais estao ativos e entre na edicao para revisar conteudo, midia e botoes."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="list-toolbar">
          <UiInput v-model="searchTerm" placeholder="Pesquisar por titulo ou descricao" />

          <UiButton to="/admin/destaques/novo" variant="success" size="lg">
            Novo destaque
          </UiButton>
        </div>

        <UiSpinner v-if="highlightsPending" size="lg" label="Carregando destaques do painel">
          <span class="body-copy">Carregando destaques do painel...</span>
        </UiSpinner>

        <p v-else-if="highlightsErrorMessage" class="feedback-message" data-tone="error">
          {{ highlightsErrorMessage }}
        </p>

        <p v-else-if="filteredHighlights.length === 0" class="body-copy">
          Nenhum destaque encontrado com este filtro.
        </p>

        <ul v-else class="list-clean highlight-list">
          <li v-for="highlight in filteredHighlights" :key="highlight.id">
            <SurfaceCard as="article">
              <div class="section-stack highlight-card">
                <div class="highlight-card-header">
                  <div class="section-stack highlight-card-copy">
                    <div class="highlight-card-meta">
                      <span class="pill">{{ highlight.isActive ? 'Ativo' : 'Inativo' }}</span>
                      <span class="body-copy">Ordem {{ highlight.order }}</span>
                      <span class="body-copy">{{ formatMediaType(highlight.mediaType) }}</span>
                    </div>
                    <h2 class="section-title highlight-card-title">{{ highlight.title }}</h2>
                    <p class="body-copy">{{ highlight.description }}</p>
                  </div>

                  <UiButton :to="`/admin/destaques/${highlight.id}`" variant="secondary" size="sm">
                    Editar destaque
                  </UiButton>
                </div>

                <div class="highlight-card-footer">
                  <span class="body-copy">Botoes: {{ highlight.actions.length }}</span>
                  <span class="body-copy">Midia: {{ highlight.mediaUrl ? 'configurada' : 'nao configurada' }}</span>
                </div>
              </div>
            </SurfaceCard>
          </li>
        </ul>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.list-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
}

.highlight-list {
  display: grid;
  gap: 1rem;
}

.highlight-card {
  gap: 1rem;
}

.highlight-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.highlight-card-copy {
  gap: 0.75rem;
}

.highlight-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.highlight-card-title {
  font-size: 1.35rem;
}

.highlight-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

@media (max-width: 768px) {
  .list-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
