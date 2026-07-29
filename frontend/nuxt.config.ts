import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  ssr: false,
  // Desactivado: la versión de Nuxt DevTools disponible hoy depende de
  // @nuxt/kit@4.x, incompatible con el Nuxt 3.21.10 pinneado del proyecto
  // (causa un ENOENT al abrir el panel). Reactivar cuando haya una versión
  // de devtools compatible con Nuxt 3.
  devtools: { enabled: false },
  compatibilityDate: '2026-07-27',
  experimental: { appManifest: false },

  app: {
    head: {
      title: 'Control de Gastos | Petroil',
      htmlAttrs: { lang: 'es' },
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@vueuse/nuxt',
    '@vee-validate/nuxt',
    '@nuxtjs/i18n',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config.plugins!.push(vuetify({ autoImport: true }))
      })
    },
  ],

  css: ['~/assets/styles/main.scss'],

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    vue: {
      template: { transformAssetUrls },
    },
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },

  i18n: {
    restructureDir: false,
    bundle: { optimizeTranslationDirective: false },
    locales: [{ code: 'es', file: 'es.json', name: 'Español' }],
    defaultLocale: 'es',
    lazy: true,
    langDir: 'locales/',
    strategy: 'no_prefix',
  },

  runtimeConfig: {
    public: {
      auth0Domain: process.env.NUXT_PUBLIC_AUTH0_DOMAIN,
      auth0ClientId: process.env.NUXT_PUBLIC_AUTH0_CLIENT_ID,
      auth0Audience: process.env.NUXT_PUBLIC_AUTH0_AUDIENCE,
      auth0RedirectUri: process.env.NUXT_PUBLIC_AUTH0_REDIRECT_URI,
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
      socketUrl: process.env.NUXT_PUBLIC_SOCKET_URL,
    },
  },
})
