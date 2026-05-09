<script setup lang="ts">
import UiButton from '../components/ui/UiButton.vue'
import UiPanel from '../components/ui/UiPanel.vue'

const canonicalUrl = 'https://institutoeuricobergsten.com.br/'
const videiraLogoUrl = '/site/img/videira-logo.png'
const euricoBergstenUrl = '/site/img/eurico.png'

useSeoMeta({
  title: 'Curso Básico de Teologia em Feira de Santana',
  description:
    'Instituto Teológico Eurico Bergsten: formação bíblica, teologia e liderança no contexto da Comunidade Videira em Feira de Santana.',
  ogTitle: 'Instituto Eurico Bergsten | Curso Básico de Teologia',
  ogDescription:
    'Teologia humilde, feita dentro da igreja, em comunhão e na presença do Espírito Santo.',
  ogImage: videiraLogoUrl,
  ogType: 'website',
  twitterCard: 'summary_large_image'
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl
    }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: 'Instituto Teológico Eurico Bergsten',
        url: canonicalUrl,
        description:
          'Cursos de capacitação, teologia e liderança para membros da Comunidade Videira e alunos convidados.',
        parentOrganization: {
          '@type': 'Church',
          name: 'Comunidade Videira',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'R. Colatina, 826 - Queimadinha',
            addressLocality: 'Feira de Santana',
            addressRegion: 'BA',
            postalCode: '40301-110',
            addressCountry: 'BR'
          }
        },
        sameAs: [
          'https://www.instagram.com/comunidadevideira/',
          'https://www.youtube.com/@VideiraTV'
        ]
      })
    }
  ]
})

const heroActions = [
  {
    id: 'cta-login',
    label: 'Acessar plataforma',
    to: '/login',
    variant: 'secondary' as const
  }
]

const institutePillars = [
  {
    title: 'Bíblia no centro',
    description:
      'O estudo teológico nasce da Escritura, com reverência, clareza doutrinária e compromisso com a vida cristã.'
  },
  {
    title: 'Formação em comunidade',
    description:
      'Aprender no contexto da igreja ajuda o aluno a transformar conhecimento em serviço, maturidade e comunhão.'
  },
  {
    title: 'Liderança para servir',
    description:
      'As trilhas capacitam membros e alunos convidados para servir melhor a Cristo, a igreja e o Reino de Deus.'
  }
]

const courseHighlights = [
  'Fundamentos da fé cristã e panorama bíblico',
  'Doutrina, devoção e vida no Espírito',
  'Discipulado, igreja local e prática ministerial',
  'Aulas organizadas para uma jornada clara de aprendizado'
]

const instagramPosts = [
  {
    id: 'cultos',
    category: 'Comunidade Videira',
    title: 'Cultos aos domingos e quintas',
    description:
      'Acompanhe a rotina da igreja, mensagens, programação e momentos de comunhão em Feira de Santana.',
    imageUrl: videiraLogoUrl,
    href: 'https://www.instagram.com/comunidadevideira/'
  },
  {
    id: 'instituto',
    category: 'Instituto Eurico Bergsten',
    title: 'Bastidores da formação teológica',
    description:
      'Publicações sobre aulas, turmas, estudos e a visão de uma teologia humilde feita dentro da igreja.',
    imageUrl: videiraLogoUrl,
    href: 'https://www.instagram.com/comunidadevideira/'
  },
  {
    id: 'palavra',
    category: 'Palavra e discipulado',
    title: 'Conteúdos para fortalecer a fé',
    description:
      'Devocionais, cortes de mensagens e convites para responder com mansidão sobre a esperança em Cristo.',
    imageUrl: videiraLogoUrl,
    href: 'https://www.instagram.com/comunidadevideira/'
  }
]
</script>

<template>
  <div class="landing-page">
    <section class="page-shell landing-hero" aria-labelledby="hero-title">
      <UiPanel tone="hero" padding="lg" class="hero-panel">
        <div class="hero-layout">
          <div class="section-stack hero-copy">
            <span class="pill w-fit">1 Pedro 3:15</span>
            <h2 id="hero-title" class="display-title hero-title w-full">
              Teologia feita dentro da igreja, para servir melhor a Cristo e ao Reino de Deus.
            </h2>
            <p class="hero-verse hero-title">
              "Antes, santifiquem Cristo como Senhor no coração de vocês. Estejam sempre preparados para responder a qualquer pessoa que pedir a razão da esperança que há em vocês."
            </p>
            <div class="button-row hero-actions" aria-label="Ações principais">
              <UiButton
                v-for="action in heroActions"
                :key="action.id"
                :to="action.to"
                :variant="action.variant"
                target="_blank"
                size="lg"
              >
                {{ action.label }}
              </UiButton>
            </div>
          </div>

          <div class="hero-visual" aria-label="Comunidade Videira">
            <img
              :src="videiraLogoUrl"
              alt="Marca da Comunidade Videira"
              width="900"
              height="690"
              class="hero-logo"
              loading="eager"
              decoding="async"
            >
            <div class="hero-service-card">
              <span class="eyebrow">Programação</span>
              <strong>Domingo às 18:30</strong>
              <strong>Quinta-feira às 19:50</strong>
            </div>
          </div>
        </div>
      </UiPanel>
    </section>

    <section class="page-shell section-band church-section" aria-labelledby="church-title">
      <div class="section-heading">
        <span class="eyebrow">Comunidade Videira</span>
        <h2 id="church-title" class="section-title">
          Uma igreja que ama a Cristo e serve ao Reino de Deus.
        </h2>
        <p class="body-copy">
          A Comunidade Videira vive um evangelho simples, real e prático. O Instituto nasce desse ambiente de comunhão, serviço e presença do Espírito Santo.
        </p>
      </div>

      <div class="church-grid">
        <UiPanel as="article" padding="md" class="church-card">
          <span class="eyebrow">Onde estamos</span>
          <h3>Feira de Santana</h3>
          <p class="body-copy">
            R. Colatina, 826 - Queimadinha, Feira de Santana - BA, 40301-110.
          </p>
        </UiPanel>

        <UiPanel as="article" padding="md" class="church-card">
          <span class="eyebrow">Encontros</span>
          <h3>Culto e comunhão</h3>
          <p class="body-copy">
            Celebramos juntos aos domingos às 18:30 e às quintas-feiras às 19:50.
          </p>
        </UiPanel>

        <UiPanel as="article" padding="md" class="church-card">
          <span class="eyebrow">Redes</span>
          <h3>Vida além do domingo</h3>
          <p class="body-copy">
            Relacionamento real, conexões verdadeiras e cuidado mútuo
          </p>
        </UiPanel>
      </div>
    </section>

    <section class="page-shell section-band story-section" aria-labelledby="eurico-title">
      <UiPanel padding="lg" class="story-panel">
        <div class="story-layout">
          <div class="story-portrait">
            <img
              :src="euricoBergstenUrl"
              alt="Representante do Instituto Eurico Bergsten"
              width="168"
              height="300"
              loading="lazy"
              decoding="async"
            >
          </div>

          <div class="section-stack story-copy">
            <span class="eyebrow">Legado que inspira</span>
            <h2 id="eurico-title" class="section-title">
              Pr. Eurico Bergsten, um nome ligado à Palavra, missão e humildade.
            </h2>
            <p class="body-copy">
              Lars-Eric Ole Bergsten, conhecido no Brasil como Eurico Bergsten, nasceu em Helsinque em 1913 e chegou ao Brasil em 2 de setembro de 1948. Seu ministério marcou igrejas, escolas bíblicas e obras sociais em diferentes regiões do país.
            </p>
            <p class="body-copy">
              Autor de estudos teológicos e professor dedicado, Eurico Bergsten deixou um testemunho de amor pela Escritura, cuidado pastoral e serviço generoso. O instituto carrega esse nome como memória viva de uma teologia que serve a igreja.
            </p>
            <div class="timeline-list" aria-label="Marcos históricos de Eurico Bergsten">
              <span>1913 - nascimento na Finlândia</span>
              <span>1948 - chegada ao Brasil</span>
              <span>65 anos de ministério</span>
            </div>
          </div>
        </div>
      </UiPanel>
    </section>

    <section class="page-shell section-band purpose-section" aria-labelledby="purpose-title">
      <div class="section-heading">
        <span class="eyebrow">Propósito do instituto</span>
        <h2 id="purpose-title" class="section-title">
          Teologia humilde, feita dentro da igreja.
        </h2>
        <p class="body-copy">
          O Instituto Teológico Eurico Bergsten provê cursos de capacitação, teologia e liderança para membros da Comunidade Videira e alunos convidados.
        </p>
      </div>

      <div class="pillar-grid">
        <UiPanel
          v-for="pillar in institutePillars"
          :key="pillar.title"
          as="article"
          padding="md"
          class="pillar-card"
        >
          <span class="pillar-number" aria-hidden="true">{{ institutePillars.indexOf(pillar) + 1 }}</span>
          <h3>{{ pillar.title }}</h3>
          <p class="body-copy">{{ pillar.description }}</p>
        </UiPanel>
      </div>
    </section>

    <section class="page-shell section-band course-section" aria-labelledby="course-title">
      <UiPanel padding="lg" class="course-panel">
        <div class="course-layout">
          <div class="section-stack">
            <span class="eyebrow">Curso Básico de Teologia</span>
            <h2 id="course-title" class="section-title">
              Uma porta de entrada para estudar a fé com profundidade e simplicidade.
            </h2>
            <p class="body-copy">
              A jornada foi pensada para quem deseja organizar os fundamentos da fé cristã, desenvolver linguagem bíblica e crescer em discernimento para servir melhor.
            </p>
            <UiButton to="/cadastro" variant="primary" size="lg" class="course-cta">
              Quero estudar teologia
            </UiButton>
          </div>

          <ul class="course-list" aria-label="Destaques do curso">
            <li v-for="highlight in courseHighlights" :key="highlight">
              {{ highlight }}
            </li>
          </ul>
        </div>
      </UiPanel>
    </section>

    <section class="page-shell section-band instagram-section" aria-labelledby="instagram-title">
      <div class="section-heading instagram-heading">
        <div>
          <span class="eyebrow">Instagram</span>
          <h2 id="instagram-title" class="section-title">
            Publicações da Comunidade Videira
          </h2>
        </div>
        <UiButton
          href="https://www.instagram.com/comunidadevideira/"
          target="_blank"
          variant="secondary"
          rel="noreferrer"
        >
          Ver perfil
        </UiButton>
      </div>

      <div class="instagram-grid">
        <a
          v-for="post in instagramPosts"
          :key="post.id"
          :href="post.href"
          target="_blank"
          rel="noreferrer"
          class="instagram-card"
        >
          <img
            :src="post.imageUrl"
            :alt="post.title"
            width="300"
            height="300"
            loading="lazy"
            decoding="async"
          >
          <div class="instagram-card-copy">
            <span>{{ post.category }}</span>
            <h3>{{ post.title }}</h3>
            <p>{{ post.description }}</p>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  display: grid;
  gap: 4.5rem;
  padding-bottom: 1rem;
}

.landing-hero {
  padding-top: 0.5rem;
}

.hero-panel {
  overflow: hidden;
  padding: 1.3rem;
}

.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  gap: clamp(0.65rem, 2.6vw, 1.95rem);
  align-items: center;
}

.hero-title {
  font-size: clamp(1rem, 3vw, 2rem);
}

.hero-verse {
  margin: 0;
  max-width: 63ch;
  color: rgba(245, 245, 241, 0.92);
  font-size: clamp(0.95rem, 1.3vw, 1.05rem);
  line-height: 1.28;
}

.hero-description {
  max-width: 62ch;
  color: rgba(245, 245, 241, 0.76);
}

.hero-actions {
  padding-top: 0.5rem;
}

.hero-visual {
  position: relative;
  display: grid;
  min-height: 338px;
  place-items: center;
  overflow: hidden;
  border-radius: 28px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02)),
    rgba(5, 5, 5, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-logo {
  width: min(76%, 306px);
  height: auto;
  filter: drop-shadow(0 28px 60px rgba(229, 9, 20, 0.18));
}

.hero-service-card {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  display: grid;
  gap: 0.4rem;
  max-width: min(20rem, calc(100% - 2rem));
  padding: 0.65rem;
  border-radius: 20px;
  background: rgba(8, 8, 8, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
}

.hero-service-card strong {
  color: var(--ds-text);
  font-size: 0.95rem;
}

.section-band {
  display: grid;
  gap: 1.5rem;
}

.section-heading {
  display: grid;
  gap: 0.85rem;
  max-width: 760px;
}

.section-heading .section-title {
  max-width: 14ch;
}

.church-grid,
.pillar-grid,
.instagram-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.church-card,
.pillar-card {
  min-height: 100%;
}

.church-card h3,
.pillar-card h3,
.instagram-card h3 {
  margin: 0;
  color: var(--ds-text);
  font-family: 'Fraunces', serif;
  font-size: 1.25rem;
  line-height: 1.05;
}

.church-card {
  display: grid;
  gap: 0.75rem;
}

.story-panel,
.course-panel {
  overflow: hidden;
}

.story-layout,
.course-layout {
  display: grid;
  grid-template-columns: minmax(240px, 0.65fr) minmax(0, 1.35fr);
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: center;
}

.story-portrait {
  display: grid;
  min-height: 420px;
  place-items: end center;
  overflow: hidden;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(229, 9, 20, 0.2), rgba(255, 255, 255, 0.03)),
    rgba(12, 12, 12, 0.72);
  position: relative;

  img {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

.story-portrait img {
  width: min(70%, 220px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 24px 42px rgba(0, 0, 0, 0.46));
}

.story-copy {
  max-width: 720px;
}

.timeline-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  padding-top: 0.35rem;
}

.timeline-list span,
.course-list li {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(245, 245, 241, 0.86);
}

.timeline-list span {
  border-radius: 999px;
  padding: 0.55rem 0.8rem;
  font-size: 0.86rem;
  font-weight: 700;
}

.pillar-card {
  position: relative;
  display: grid;
  gap: 0.75rem;
  align-content: start;
  overflow: hidden;
}

.pillar-number {
  display: inline-grid;
  width: 2.3rem;
  height: 2.3rem;
  place-items: center;
  border-radius: 999px;
  background: rgba(229, 9, 20, 0.18);
  color: #ffffff;
  font-weight: 800;
}

.course-layout {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
}

.course-cta {
  justify-self: start;
}

.course-list {
  display: grid;
  gap: 0.8rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.course-list li {
  border-radius: 18px;
  padding: 0.9rem 1rem;
  font-weight: 700;
  line-height: 1.5;
}

.instagram-heading {
  max-width: none;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.instagram-card {
  display: grid;
  min-height: 100%;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 18, 18, 0.84);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.instagram-card:hover,
.instagram-card:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(229, 9, 20, 0.44);
  background: rgba(24, 24, 24, 0.96);
  outline: none;
}

.instagram-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  background: #080808;
}

.instagram-card-copy {
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
}

.instagram-card-copy span {
  color: var(--ds-accent-strong);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.instagram-card-copy p {
  margin: 0;
  color: var(--ds-muted);
  line-height: 1.62;
}

@media (max-width: 980px) {
  .landing-page {
    gap: 3.25rem;
  }

  .hero-layout,
  .story-layout,
  .course-layout {
    grid-template-columns: 1fr;
  }

  .hero-title {
    max-width: none;
  }

  .hero-visual {
    min-height: 247px;
  }

  .story-portrait {
    min-height: 340px;
  }

  .church-grid,
  .pillar-grid,
  .instagram-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .landing-page {
    gap: 2.6rem;
  }

  .hero-panel :deep(.button-row),
  .hero-actions {
    display: grid;
  }

  .hero-visual {
    min-height: 195px;
  }

  .hero-service-card {
    position: static;
    width: calc(100% - 2rem);
    margin-bottom: 1rem;
  }

  .instagram-heading {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .course-cta {
    width: 100%;
  }
}
</style>
