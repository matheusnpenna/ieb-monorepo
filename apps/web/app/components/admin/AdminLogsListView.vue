<script setup lang="ts">
import type { AdminActivityLog, AdminLogsResponse } from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiSpinner from '../ui/UiSpinner.vue'

const PAGE_SIZE = 20

const actionLabelMap: Record<AdminActivityLog['action'], string> = {
  create: 'Criacao',
  update: 'Atualizacao',
  delete: 'Exclusao',
  publish: 'Publicacao',
  unpublish: 'Despublicacao',
  login: 'Login',
  logout: 'Logout'
}

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value))

const formatCollectionName = (value: string) =>
  value
    .replace(/^v2_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()

const formatMetadata = (metadata: Record<string, unknown>) => JSON.stringify(metadata, null, 2)

const defaultLogsResponse = {
  status: 'success',
  data: {
    items: [],
    pagination: {
      nextCursor: null,
      pageSize: PAGE_SIZE
    }
  }
} satisfies AdminLogsResponse

const currentPage = ref(1)
const cursorHistory = ref<Array<string | null>>([null])
const currentCursor = computed(() => cursorHistory.value[currentPage.value - 1] || null)

const { data: logsResponse, pending: logsPending, refresh: refreshLogs } = await useAsyncData<AdminLogsResponse>(
  () => `admin-logs-list-${currentPage.value}-${currentCursor.value || 'first'}`,
  () =>
    $fetch('/api/admin/logs', {
      credentials: 'include',
      ignoreResponseError: true,
      query: {
        pageSize: PAGE_SIZE,
        cursor: currentCursor.value || undefined
      }
    }),
  {
    watch: [currentCursor],
    default: () => defaultLogsResponse
  }
)

const logsPage = computed(() => {
  if (!logsResponse.value || logsResponse.value.status !== 'success') {
    return null
  }

  return logsResponse.value.data
})

const logItems = computed(() => logsPage.value?.items || [])
const logsErrorMessage = computed(() => {
  if (!logsResponse.value || logsResponse.value.status !== 'error') {
    return ''
  }

  return logsResponse.value.messages[0] || 'Nao foi possivel carregar os logs do sistema.'
})
const hasNextPage = computed(() => Boolean(logsPage.value?.pagination.nextCursor))
const hasPreviousPage = computed(() => currentPage.value > 1)

const goToNextPage = () => {
  const nextCursor = logsPage.value?.pagination.nextCursor

  if (!nextCursor || logsPending.value) {
    return
  }

  const nextPageIndex = currentPage.value

  if (cursorHistory.value.length === nextPageIndex) {
    cursorHistory.value.push(nextCursor)
  } else {
    cursorHistory.value[nextPageIndex] = nextCursor
  }

  currentPage.value += 1
}

const goToPreviousPage = () => {
  if (!hasPreviousPage.value || logsPending.value) {
    return
  }

  currentPage.value -= 1
}
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Logs"
      title="Auditoria administrativa"
      description="Consulte as acoes registradas no painel, com usuario, entidade afetada, resumo e detalhes tecnicos da operacao."
    />

    <SurfaceCard>
      <div class="section-stack">
        <div class="logs-toolbar">
          <span class="body-copy">Pagina {{ currentPage }}</span>

          <div class="logs-toolbar-actions">
            <UiButton type="button" variant="ghost" size="sm" :disabled="logsPending" @click="refreshLogs()">
              Atualizar
            </UiButton>
            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="!hasPreviousPage || logsPending"
              @click="goToPreviousPage"
            >
              Anterior
            </UiButton>
            <UiButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="!hasNextPage || logsPending"
              @click="goToNextPage"
            >
              Proxima
            </UiButton>
          </div>
        </div>

        <UiSpinner v-if="logsPending" size="lg" label="Carregando logs do sistema">
          <span class="body-copy">Carregando logs do sistema...</span>
        </UiSpinner>

        <p v-else-if="logsErrorMessage" class="feedback-message" data-tone="error">
          {{ logsErrorMessage }}
        </p>

        <p v-else-if="logItems.length === 0" class="body-copy">
          Nenhum log encontrado nesta pagina.
        </p>

        <ul v-else class="list-clean logs-list">
          <li v-for="log in logItems" :key="log.id">
            <SurfaceCard as="article">
              <div class="section-stack log-card">
                <div class="log-card-header">
                  <div class="section-stack log-card-copy">
                    <div class="log-card-meta">
                      <span class="pill">{{ actionLabelMap[log.action] }}</span>
                      <span class="body-copy">{{ formatCollectionName(log.targetCollection) }}</span>
                      <span class="body-copy">{{ formatTimestamp(log.createdAt) }}</span>
                    </div>
                    <h2 class="section-title log-card-title">{{ log.summary }}</h2>
                    <p class="body-copy">
                      Ator: {{ log.actorEmail }}
                    </p>
                  </div>
                </div>

                <div class="log-card-footer">
                  <span class="body-copy">Alvo: {{ log.targetId }}</span>
                  <span class="body-copy">ID do log: {{ log.id }}</span>
                </div>

                <details class="log-metadata" v-if="Object.keys(log.metadata).length > 0">
                  <summary class="body-copy">Ver metadados</summary>
                  <pre>{{ formatMetadata(log.metadata) }}</pre>
                </details>
              </div>
            </SurfaceCard>
          </li>
        </ul>
      </div>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.logs-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.logs-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.logs-list {
  display: grid;
  gap: 1rem;
}

.log-card {
  gap: 1rem;
}

.log-card-copy {
  gap: 0.75rem;
}

.log-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.log-card-title {
  font-size: 1.2rem;
}

.log-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--ds-muted);
}

.log-metadata {
  border-top: 1px solid var(--ds-border);
  padding-top: 1rem;
}

.log-metadata summary {
  cursor: pointer;
  color: var(--ds-text);
}

.log-metadata pre {
  overflow-x: auto;
  margin: 0.85rem 0 0;
  padding: 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--ds-muted);
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .logs-toolbar {
    align-items: stretch;
  }

  .logs-toolbar-actions {
    width: 100%;
  }
}
</style>
