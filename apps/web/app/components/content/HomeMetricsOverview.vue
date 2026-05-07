<script setup lang="ts">
import type { HomeMetricsResponse } from '@ieb/shared'
import MetricCard from '../admin/MetricCard.vue'
import UiSpinner from '../ui/UiSpinner.vue'

interface HomeMetricViewItem {
  label: string
  value: string
  detail: string
  href: string | null
}

const defaultMetricsResponse = {
  status: 'success',
  data: null
} satisfies HomeMetricsResponse

const { data: metricsResponse, pending: metricsPending } = await useAsyncData<HomeMetricsResponse>(
  'home-metrics',
  () =>
    $fetch('/api/home/metrics', {
      credentials: 'include',
      ignoreResponseError: true
    }),
  {
    default: () => defaultMetricsResponse
  }
)

const metrics = computed<HomeMetricViewItem[]>(() => {
  if (!metricsResponse.value || metricsResponse.value.status !== 'success' || !metricsResponse.value.data) {
    return []
  }

  const continueWatching = metricsResponse.value.data.continueWatching
  const completedCourses = metricsResponse.value.data.completedCourses

  return [
    {
      label: 'Continuar assistindo',
      value: continueWatching.lessonTitle || 'Nenhuma aula',
      detail: continueWatching.courseTitle
        ? `Retome seu progresso em ${continueWatching.courseTitle}.`
        : 'Voce ainda nao iniciou nenhuma aula.',
      href: continueWatching.href
    },
    {
      label: 'Cursos concluidos',
      value: String(completedCourses.count).padStart(2, '0'),
      detail:
        completedCourses.count === 1
          ? 'Voce concluiu 1 curso ate agora.'
          : `Voce concluiu ${completedCourses.count} cursos ate agora.`,
      href: null
    }
  ]
})

const metricsErrorMessage = computed(() => {
  if (!metricsResponse.value || metricsResponse.value.status !== 'error') {
    return ''
  }

  return metricsResponse.value.messages[0] || 'Nao foi possivel carregar as metricas da home.'
})
</script>

<template>
  <section class="section-stack">
    <UiSpinner v-if="metricsPending" size="lg" label="Carregando metricas">
      <span class="body-copy">Carregando metricas da sua jornada...</span>
    </UiSpinner>

    <p v-else-if="metricsErrorMessage" class="body-copy">
      {{ metricsErrorMessage }}
    </p>

    <div v-else class="grid-cards">
      <template v-for="metric in metrics" :key="metric.label">
        <NuxtLink
          v-if="metric.href"
          :to="metric.href"
          class="metric-card-link"
        >
          <MetricCard
            :label="metric.label"
            :value="metric.value"
            :detail="metric.detail"
          />
        </NuxtLink>

        <div v-else class="metric-card-link">
          <MetricCard
            :label="metric.label"
            :value="metric.value"
            :detail="metric.detail"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.metric-card-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.metric-card-link:focus-visible {
  outline: none;
}

.metric-card-link :deep(.glass-panel),
.metric-card-link :deep(.surface-card),
.metric-card-link :deep(article) {
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.metric-card-link[href]:hover :deep(.glass-panel),
.metric-card-link[href]:focus-visible :deep(.glass-panel),
.metric-card-link[href]:hover :deep(.surface-card),
.metric-card-link[href]:focus-visible :deep(.surface-card),
.metric-card-link[href]:hover :deep(article),
.metric-card-link[href]:focus-visible :deep(article) {
  transform: translateY(-2px);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.52);
}
</style>
