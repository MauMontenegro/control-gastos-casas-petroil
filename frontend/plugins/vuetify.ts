import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { es } from 'vuetify/locale'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

/**
 * Paleta portada 1:1 de legacy-prototype/styles.css (:root) para que el
 * theming de Vuetify reproduzca el look del prototipo en vez del Material
 * Design por defecto.
 */
const petroilTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#ff7a21', // --orange: color de las acciones principales (primary-btn)
    secondary: '#1261a6', // --blue: marca / navegación
    success: '#1fa56b', // --green
    warning: '#ff7a21', // --orange
    error: '#d94f4f', // --red
    info: '#1261a6', // --blue
    background: '#f4f7fb', // --bg
    surface: '#ffffff',
    'brand-blue-dark': '#0a3f73', // --blue-dark: gradiente del sidebar
    'brand-blue-light': '#eaf4fb', // --blue-light
    'brand-orange-light': '#fff1e8', // --orange-light
    'brand-border': '#e3e9f1', // --border
    'brand-muted': '#6e7788', // --muted
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'petroilTheme',
      themes: { petroilTheme },
    },
    locale: {
      locale: 'es',
      messages: { es },
    },
    defaults: {
      VCard: { rounded: 'lg', elevation: 0, border: true },
      VBtn: { rounded: 'lg' },
      VTextField: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
      VSelect: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
      VAutocomplete: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
      VTextarea: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
      VDataTable: { density: 'comfortable' },
      VChip: { rounded: 'pill' },
      VNavigationDrawer: { elevation: 0 },
      VAppBar: { elevation: 0, border: true },
    },
  })
  nuxtApp.vueApp.use(vuetify)
})
