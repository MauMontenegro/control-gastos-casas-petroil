<script setup lang="ts">
import type { SaveSippConfiguration, SippEnvironment } from '~/types'

const store = useSippStore()
const environment = ref<SippEnvironment>('stage')
const username = ref('')
const password = ref('')
const companyId = ref<string | null>(null)
const branchId = ref<string | null>(null)
const cardId = ref<string | null>(null)
const headless = ref(true)
const showPassword = ref(false)
const saving = ref(false)
const successMessage = ref('')
const progressMessage = ref('')

const environmentOptions = [
  { title: 'Pruebas (stage)', value: 'stage' },
  { title: 'Producción', value: 'production' },
]

function selectedName(items: { id: string; name: string }[], id: string | null) {
  return items.find((item) => item.id === id)?.name ?? null
}

function payload(): SaveSippConfiguration {
  return {
    environment: environment.value,
    username: username.value,
    password: password.value || undefined,
    companyId: companyId.value,
    companyName: selectedName(store.companies, companyId.value),
    branchId: branchId.value,
    branchName: selectedName(store.branches, branchId.value),
    cardId: cardId.value,
    cardName: selectedName(store.cards, cardId.value),
    headless: headless.value,
  }
}

onMounted(async () => {
  try {
    await store.fetchConfiguration()
    if (store.configuration) {
      environment.value = store.configuration.environment
      username.value = store.configuration.username
      companyId.value = store.configuration.companyId ?? null
      branchId.value = store.configuration.branchId ?? null
      cardId.value = store.configuration.cardId ?? null
      headless.value = store.configuration.headless
      progressMessage.value = 'Recuperando empresas, sucursales y tarjetas de SIPP...'
      await store.connect(companyId.value || undefined)
      progressMessage.value = ''
    }
  } catch {
    progressMessage.value = ''
    // El store muestra el error y permite reintentar sin romper la página.
  }
})

async function saveCredentialsAndConnect() {
  saving.value = true
  successMessage.value = ''
  progressMessage.value = 'Guardando credenciales cifradas...'
  try {
    await store.saveConfiguration({
      environment: environment.value,
      username: username.value,
      password: password.value || undefined,
      headless: headless.value,
    })
    password.value = ''
    progressMessage.value = 'Iniciando navegador y conectando con SIPP. Puede tardar hasta 45 segundos...'
    await store.connect()
    successMessage.value = 'Conexión correcta. Selecciona la empresa para cargar sus sucursales.'
  } catch {
    // El detalle sanitizado se presenta mediante store.error.
  } finally {
    progressMessage.value = ''
    saving.value = false
  }
}

async function loadBranches() {
  branchId.value = null
  cardId.value = null
  await store.saveConfiguration(payload())
  await store.connect(companyId.value || undefined)
}

async function loadCards() {
  cardId.value = null
  await store.saveConfiguration(payload())
  await store.connect(companyId.value || undefined)
}

async function saveAll() {
  saving.value = true
  successMessage.value = ''
  try {
    await store.saveConfiguration(payload())
    successMessage.value = 'Configuración de SIPP guardada y lista para ejecutar el RPA.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="petroil-page-heading mb-6">
      <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">AUTOMATIZACIÓN</p>
      <h1 class="text-h4 font-weight-bold mb-1">Configuración de sesión SIPP</h1>
      <p class="text-body-2 text-medium-emphasis">
        Las credenciales se cifran en el backend y nunca se devuelven al navegador.
      </p>
    </div>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>
    <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4">
      {{ successMessage }}
    </v-alert>
    <v-alert v-if="progressMessage" type="info" variant="tonal" class="mb-4">
      <v-progress-circular indeterminate size="20" width="2" class="mr-3" />
      {{ progressMessage }}
    </v-alert>

    <v-card max-width="850">
      <v-card-title class="pa-6 pb-2">Acceso y ambiente</v-card-title>
      <v-card-text class="pa-6 pt-3">
        <v-row>
          <v-col cols="12" md="4">
            <v-select v-model="environment" :items="environmentOptions" label="Ambiente" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="username" label="Usuario SIPP" autocomplete="username" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="password"
              label="Contraseña SIPP"
              :placeholder="store.configuration?.hasPassword ? 'Conservar contraseña guardada' : ''"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              autocomplete="current-password"
              @click:append-inner="showPassword = !showPassword"
            />
          </v-col>
        </v-row>
        <v-btn
          color="primary"
          prepend-icon="mdi-lan-connect"
          :loading="saving || store.connecting"
          :disabled="!username || (!password && !store.configuration?.hasPassword)"
          @click="saveCredentialsAndConnect"
        >
          Guardar y probar conexión
        </v-btn>

        <v-switch
          v-model="headless"
          color="primary"
          class="mt-5"
          hide-details
          label="Ejecutar en segundo plano (headless)"
        />
        <p class="text-caption text-medium-emphasis mt-1">
          Desactívalo para abrir Edge y observar el RPA. La ventana aparecerá en la computadora
          donde se está ejecutando el backend.
        </p>
      </v-card-text>

      <v-divider />

      <v-card-title class="pa-6 pb-2">Empresa, sucursal y tarjeta</v-card-title>
      <v-card-text class="pa-6 pt-3">
        <v-row>
          <v-col cols="12">
            <v-select
              v-model="companyId"
              :items="store.companies"
              item-title="name"
              item-value="id"
              label="Empresa"
              :loading="store.connecting"
              :disabled="store.companies.length === 0"
              @update:model-value="loadBranches"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="branchId"
              :items="store.branches"
              item-title="name"
              item-value="id"
              label="Plaza (Sucursal)"
              :disabled="store.branches.length === 0"
              @update:model-value="loadCards"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="cardId"
              :items="store.cards"
              item-title="name"
              item-value="id"
              label="Tarjeta predeterminada"
              :disabled="store.cards.length === 0"
            />
          </v-col>
        </v-row>
        <v-btn
          color="primary"
          prepend-icon="mdi-content-save"
          :loading="saving"
          :disabled="!companyId || !branchId || !cardId"
          @click="saveAll"
        >
          Guardar configuración
        </v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>
