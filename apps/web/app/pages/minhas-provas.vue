<script setup lang="ts">
import type { AccountAssessmentAttemptItem, AccountAssessmentAttemptsResponse } from '@ieb/shared'
import UiButton from '../components/ui/UiButton.vue'
import UiPanel from '../components/ui/UiPanel.vue'
import UiSpinner from '../components/ui/UiSpinner.vue'

definePageMeta({
  layout: 'content'
})

useSeoMeta({
  title: 'Minhas provas'
})

const defaultAttemptsResponse = {
  status: 'success',
  data: []
} satisfies AccountAssessmentAttemptsResponse

const { data: attemptsResponse, pending, refresh } = await useAsyncData<AccountAssessmentAttemptsResponse>(
  'account-assessment-attempts',
  () =>
    $fetch('/api/account/assessment-attempts', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultAttemptsResponse
  }
)

const attempts = computed(() => attemptsResponse.value?.data || [])
const attemptsErrorMessage = computed(() =>
  attemptsResponse.value?.status === 'error'
    ? attemptsResponse.value.messages[0] || 'Nao foi possivel carregar suas provas.'
    : 'Nao foi possivel carregar suas provas.'
)

const statusLabel = (attempt: AccountAssessmentAttemptItem) => {
  if (attempt.status === 'pending_review') {
    return 'Aguardando correcao'
  }

  if (attempt.approved === true) {
    return 'Aprovada'
  }

  if (attempt.approved === false) {
    return 'Reprovada'
  }

  return 'Corrigida'
}

const formatScore = (attempt: AccountAssessmentAttemptItem) =>
  attempt.score === null ? 'Sem nota' : `${attempt.score}/${attempt.passingScore}`

const formatDate = (value: string | null) => {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}
</script>

<template>
  <div class="section-stack exams-page">
    <header class="page-heading">
      <p class="eyebrow">Avaliacoes</p>
      <h1>Minhas provas</h1>
      <p class="body-copy">
        Acompanhe suas tentativas enviadas, notas e situacao de correcao.
      </p>
    </header>

    <UiPanel v-if="pending" tone="strong" class="loading-panel">
      <UiSpinner label="Carregando suas provas" />
    </UiPanel>

    <UiPanel v-else-if="attemptsResponse?.status === 'error'" tone="strong">
      <p class="feedback-message" data-tone="error">
        {{ attemptsErrorMessage }}
      </p>
      <UiButton variant="secondary" @click="refresh">Tentar novamente</UiButton>
    </UiPanel>

    <UiPanel v-else-if="attempts.length === 0" tone="strong">
      <div class="empty-state">
        <h2>Nenhuma prova enviada ainda</h2>
        <p class="body-copy">
          Quando voce responder uma avaliacao de modulo, ela aparecera aqui com o andamento da correcao.
        </p>
        <UiButton to="/home">Ver meus cursos</UiButton>
      </div>
    </UiPanel>

    <div v-else class="attempt-list">
      <UiPanel v-for="attempt in attempts" :key="attempt.id" tone="default" class="attempt-card">
        <div class="attempt-main">
          <div>
            <p class="eyebrow">{{ attempt.courseTitle }}</p>
            <h2>{{ attempt.assessmentTitle }}</h2>
            <p class="body-copy">{{ attempt.moduleTitle }}</p>
          </div>

          <span class="status-pill" :data-status="attempt.status" :data-approved="attempt.approved">
            {{ statusLabel(attempt) }}
          </span>
        </div>

        <dl class="attempt-meta">
          <div>
            <dt>Tentativa</dt>
            <dd>{{ attempt.attemptNumber }}</dd>
          </div>
          <div>
            <dt>Nota</dt>
            <dd>{{ formatScore(attempt) }}</dd>
          </div>
          <div>
            <dt>Enviada em</dt>
            <dd>{{ formatDate(attempt.submittedAt) }}</dd>
          </div>
          <div>
            <dt>Corrigida em</dt>
            <dd>{{ formatDate(attempt.gradedAt) }}</dd>
          </div>
        </dl>

        <div class="attempt-actions">
          <UiButton v-if="attempt.moduleHref" :to="attempt.moduleHref" variant="secondary" size="sm">
            Abrir modulo
          </UiButton>
          <UiButton v-if="attempt.courseHref" :to="attempt.courseHref" variant="ghost" size="sm">
            Ver curso
          </UiButton>
        </div>
      </UiPanel>
    </div>
  </div>
</template>

<style scoped>
.exams-page {
  max-width: 1040px;
}

.page-heading,
.empty-state {
  display: grid;
  gap: 0.5rem;
}

.page-heading h1,
.empty-state h2,
.attempt-card h2 {
  margin: 0;
}

.page-heading h1 {
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1;
}

.attempt-list {
  display: grid;
  gap: 1rem;
}

.attempt-card {
  display: grid;
  gap: 1.25rem;
}

.attempt-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.status-pill {
  flex: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  color: white;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.82rem;
  font-weight: 700;
}

.status-pill[data-approved='true'] {
  border-color: rgba(70, 211, 105, 0.45);
  color: var(--ds-success);
}

.status-pill[data-approved='false'] {
  border-color: rgba(255, 107, 107, 0.45);
  color: var(--ds-danger);
}

.status-pill[data-status='pending_review'] {
  border-color: rgba(255, 193, 7, 0.45);
  color: #ffd166;
}

.attempt-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.attempt-meta div {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.04);
}

.attempt-meta dt {
  color: var(--ds-muted);
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.attempt-meta dd {
  margin: 0.35rem 0 0;
  font-weight: 700;
}

.attempt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.loading-panel {
  display: grid;
  place-items: center;
  min-height: 14rem;
}

@media (max-width: 820px) {
  .attempt-main {
    display: grid;
  }

  .attempt-meta {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  .attempt-meta {
    grid-template-columns: 1fr;
  }
}
</style>
