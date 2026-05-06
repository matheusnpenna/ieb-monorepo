<script setup lang="ts">
import MetricCard from '../../components/admin/MetricCard.vue'
import PageIntro from '../../components/base/PageIntro.vue'

definePageMeta({
  layout: 'admin'
})

useSeoMeta({
  title: 'Admin'
})

const metrics = [
  { label: 'Cursos publicados', value: '12', detail: 'Resumo placeholder do painel.' },
  { label: 'Turmas abertas', value: '04', detail: 'Controle inicial para jornadas de cadastro.' },
  { label: 'Logs hoje', value: '28', detail: 'Auditoria de acoes administrativas.' }
]
</script>

<template>
  <div class="section-stack">
    <PageIntro
      eyebrow="Painel administrativo"
      title="Visao geral da operacao"
      description="Dashboard inicial com atalhos para conteudo, usuarios, turmas, destaques e logs."
    />

    <section class="grid-cards">
      <MetricCard
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
        :detail="metric.detail"
      />
    </section>
  </div>
</template>
