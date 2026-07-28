// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt(eslintConfigPrettier, {
  rules: {
    // Vuetify usa nombres de slot con punto (#item.columna="{ item }") en
    // v-data-table; eslint-plugin-vue los interpreta como modificadores
    // inválidos de v-slot. Es el idioma estándar de Vuetify, no un error real.
    'vue/valid-v-slot': 'off',
  },
})
