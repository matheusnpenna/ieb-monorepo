<script setup lang="ts">
import BrandMark from './BrandMark.vue'

const props = withDefaults(
  defineProps<{
    brandTo?: string
  }>(),
  {
    brandTo: '/'
  }
)

const currentYear = new Date().getFullYear()

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/comunidadevideira/'
  },
  {
    label: 'Youtube',
    href: 'https://www.youtube.com/user/VideiraTV'
  }
]

const supportLinks = [
  {
    label: 'Clique para acessar o suporte',
    href: 'https://wa.me/5575981535971?text=Ol%C3%A1%2C%20gostaria%20de%20obter%20suporte%20para%20a%20plataforma%20da%20Comunidade%20Videira.%20Poderiam%20me%20ajudar%3F',
    value: '5575981535971'
  }
]
</script>

<template>
  <footer class="app-footer">
    <section class="page-shell footer-shell">
      <div class="footer-brand">
        <BrandMark :to="props.brandTo" />
        <p class="body-copy footer-brand-copy">
          Experiencia institucional e plataforma de conteudo com suporte direto para a comunidade.
        </p>
      </div>

      <div class="footer-grid">
        <section class="footer-block">
          <span class="footer-heading">Informacoes</span>
          <p class="body-copy">CNPJ: 15.728.125/0001-00</p>
          <p class="body-copy">Ano: {{ currentYear }}</p>
        </section>

        <section class="footer-block">
          <span class="footer-heading">Redes sociais</span>
          <a
            v-for="socialLink in socialLinks"
            :key="socialLink.label"
            :href="socialLink.href"
            target="_blank"
            rel="noreferrer"
            class="footer-link"
          >
            {{ socialLink.label }}
          </a>
        </section>

        <section class="footer-block">
          <span class="footer-heading">Contato</span>
          <a
            v-for="supportLink in supportLinks"
            :key="supportLink.label"
            :href="supportLink.href"
            target="_blank"
            rel="noreferrer"
            class="footer-link"
          >
            {{ supportLink.label }}
          </a>
        </section>
      </div>
    </section>
  </footer>
</template>

<style scoped>
.app-footer {
  width: 100%;
  margin-top: 3rem;
  padding: 2.5rem 0 3rem;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.84), rgba(0, 0, 0, 0.98)),
    #000000;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-shell {
  display: grid;
  gap: 1.5rem;
}

.footer-brand {
  display: grid;
  gap: 0.9rem;
}

.footer-brand-copy {
  max-width: 34rem;
  color: rgba(245, 245, 241, 0.72);
}

.footer-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.footer-block {
  display: grid;
  gap: 0.65rem;
  align-content: start;
}

.footer-heading {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--ds-accent-strong);
}

.footer-link {
  color: rgba(245, 245, 241, 0.88);
  text-decoration: none;
  transition:
    color 180ms ease,
    transform 180ms ease;
}

.footer-link:hover,
.footer-link:focus-visible {
  color: #ffffff;
  transform: translateX(2px);
  outline: none;
}

@media (min-width: 840px) {
  .footer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
