import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import 'dotenv/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  alias: {
    '@ieb/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url))
  },
  app: {
    head: {
      titleTemplate: '%s | Instituto Eurico Bergsten',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#090909' },
        {
          name: 'description',
          content:
            'Plataforma de aprendizagem do Instituto Eurico Bergsten com area de membros e painel administrativo.'
        }
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: ''
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap'
        },
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg'
        }
      ],
      script: [
        {
          src: '/integrations/newrelic-browser-agent.js',
          defer: true
        }
      ]
    }
  },
  runtimeConfig: {
    firebase: {
      clientEmail: '',
      privateKey: '',
      databaseUrl: '',
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    },
    session: {
      cookieName: process.env.NUXT_SESSION_COOKIE_NAME || 'ieb_session',
      cookieMaxAge: Number(process.env.NUXT_SESSION_COOKIE_MAX_AGE || 60 * 60 * 24 * 7)
    },
    public: {
      appName: 'Instituto Eurico Bergsten',
      appUrl: 'http://localhost:3000',
      newRelicEnabled: false
    }
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
