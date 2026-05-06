<script setup lang="ts">
import FeaturedBanner from '../components/content/FeaturedBanner.vue'
import PageIntro from '../components/base/PageIntro.vue'
import InstitutionalFeatureList from '../components/institutional/InstitutionalFeatureList.vue'
import SurfaceCard from '../components/base/SurfaceCard.vue'

useSeoMeta({
  title: 'Institucional'
})

const featureItems = [
  {
    title: 'Formacao com trilhas organizadas',
    description:
      'Cursos, modulos, aulas e avaliacoes estruturados para acompanhar a jornada completa do aluno.'
  },
  {
    title: 'Comunidade com linguagem acolhedora',
    description:
      'A plataforma nasce para refletir o contexto do Instituto Eurico Bergsten e da Comunidade Videira.'
  },
  {
    title: 'Operacao profissional',
    description:
      'Painel administrativo, auditoria de acoes, progresso do aluno e arquitetura pronta para crescer.'
  }
]
</script>

<template>
  <div class="page-shell section-stack">
    <FeaturedBanner
      badge="Ambiente de Aprendizagem"
      title="Aprendizado com cara de streaming, estrutura pastoral e operacao real."
      description="Setup inicial do Instituto Eurico Bergsten com base para site institucional, area do aluno e painel administrativo."
    />

    <section class="section-stack">
      <PageIntro
        eyebrow="Sobre o instituto"
        title="Uma base institucional para apresentar missao, cursos e comunidade."
        description="A pagina inicial funciona como vitrine do projeto, com espaco para apresentacao institucional, chamadas para cadastro e direcionamento para login."
      />
      <InstitutionalFeatureList :items="featureItems" />
    </section>

    <section class="grid-cards">
      <SurfaceCard>
        <div class="section-stack">
          <span class="eyebrow">Comunidade Videira</span>
          <h2 class="section-title">Presenca em regioes e trilhas de acompanhamento.</h2>
          <p class="body-copy">
            O cadastro ja considera a relacao do aluno com a comunidade e a origem da turma.
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div class="section-stack">
          <span class="eyebrow">Produção real</span>
          <h2 class="section-title">Preparado para Firebase, cookies seguros e Docker.</h2>
          <p class="body-copy">
            A arquitetura inicial prioriza servidor Nuxt intermediando autenticacao e acesso ao Firestore.
          </p>
        </div>
      </SurfaceCard>
    </section>
  </div>
</template>
