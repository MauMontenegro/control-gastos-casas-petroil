<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'
import { useAuth0 } from '@auth0/auth0-vue'

const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0()
const preferences = usePreferencesStore()
const { t } = useI18n()
const socket = useSocket()

const { handleSubmit, defineField, errors } = useForm({
  validationSchema: {
    folio: (value: string) =>
      (value && value.length >= 4) || 'Folio inválido (mínimo 4 caracteres)',
  },
})
const [folio, folioAttrs] = defineField('folio')
const submittedFolio = ref('')

const onSubmit = handleSubmit((values) => {
  submittedFolio.value = values.folio
})

function handleLogout() {
  logout({ logoutParams: { returnTo: window.location.origin } })
}

function handleExport() {
  exportSimplePdf('Reporte de ejemplo', [
    ['Usuario', user.value?.name ?? 'Invitado'],
    ['Fecha', new Date().toLocaleDateString('es-MX')],
  ])
}

const demoChart = {
  series: [{ name: 'Demo', data: [30, 55, 40, 70, 62] }],
  options: {
    chart: { toolbar: { show: false } },
    xaxis: { categories: ['L', 'M', 'X', 'J', 'V'] },
    colors: ['#1261a6'],
  },
}

onMounted(() => {
  socket.connect()
})
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">SCAFFOLD</p>
      <h1 class="text-h4 font-weight-bold mb-1">Página de ejemplo del stack</h1>
      <p class="text-body-2 text-medium-emphasis">
        Verifica en un solo lugar que Vuetify, Pinia, Auth0, i18n, vee-validate, ApexCharts,
        socket.io-client, QR y export a PDF funcionan juntos.
      </p>
    </div>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="pa-4 mb-4">
          <h2 class="text-h6 mb-2">Auth0</h2>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Autenticado: <strong>{{ isAuthenticated ? 'Sí' : 'No' }}</strong>
            <span v-if="user"> · {{ user.name }}</span>
          </p>
          <v-btn v-if="!isAuthenticated" color="primary" @click="loginWithRedirect()"
            >Iniciar sesión</v-btn
          >
          <v-btn v-else color="secondary" variant="outlined" @click="handleLogout">
            Cerrar sesión
          </v-btn>
        </v-card>

        <v-card class="pa-4 mb-4">
          <h2 class="text-h6 mb-2">Pinia + persistedstate</h2>
          <v-switch
            v-model="preferences.sidebarCollapsed"
            label="Sidebar en modo rail (persistido, recarga la página)"
            color="primary"
            hide-details
          />
        </v-card>

        <v-card class="pa-4 mb-4">
          <h2 class="text-h6 mb-2">Vue I18n</h2>
          <p class="text-body-2">
            {{ t('nav.inicio') }} · {{ t('nav.pagos') }} · {{ t('nav.sucursales') }}
          </p>
        </v-card>

        <v-card class="pa-4">
          <h2 class="text-h6 mb-2">socket.io-client</h2>
          <v-chip :color="socket.isConnected.value ? 'success' : 'error'" variant="tonal">
            {{ socket.isConnected.value ? 'Conectado' : 'Desconectado (sin backend aún)' }}
          </v-chip>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-4 mb-4">
          <h2 class="text-h6 mb-2">vee-validate</h2>
          <form class="d-flex flex-column ga-2" @submit="onSubmit">
            <v-text-field
              v-model="folio"
              v-bind="folioAttrs"
              label="Folio de solicitud"
              placeholder="SF-2026-0185"
              :error-messages="errors.folio ? [errors.folio] : []"
            />
            <v-btn type="submit" color="primary">Validar</v-btn>
          </form>
          <p v-if="submittedFolio" class="text-body-2 text-success mt-2">
            Folio validado: {{ submittedFolio }}
          </p>
        </v-card>

        <v-card class="pa-4 mb-4 text-center">
          <h2 class="text-h6 mb-3">qrcode.vue</h2>
          <QrcodeVue value="SF-2026-0185" :size="140" />
        </v-card>

        <v-card class="pa-4 mb-4">
          <h2 class="text-h6 mb-2">jsPDF + file-saver</h2>
          <v-btn
            color="secondary"
            variant="outlined"
            prepend-icon="mdi-file-pdf-box"
            @click="handleExport"
          >
            Exportar PDF de ejemplo
          </v-btn>
        </v-card>

        <v-card class="pa-4">
          <h2 class="text-h6 mb-2">vue3-apexcharts</h2>
          <ClientOnly>
            <apexchart
              type="line"
              height="180"
              :options="demoChart.options"
              :series="demoChart.series"
            />
          </ClientOnly>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
