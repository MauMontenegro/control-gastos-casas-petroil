<script setup lang="ts">
import type { FundRequest, FundRequestStatus } from '~/types'

const props = defineProps<{ request: FundRequest | null }>()
const open = defineModel<boolean>({ default: false })

const config = useRuntimeConfig()
const store = useRequestsStore()

function documentHref(documentUrl: string): string {
  // apiBaseUrl ya incluye "/api" (ej. http://localhost:4000/api). El backend
  // ha mandado documentUrl con y sin el prefijo "/api/" en distintos
  // momentos — se le quita si viene duplicado, así funciona con cualquiera
  // de las dos formas y el archivo siempre se resuelve bajo apiBaseUrl.
  const apiBase = (config.public.apiBaseUrl as string).replace(/\/$/, '')
  const path = documentUrl.startsWith('/api/') ? documentUrl.slice(4) : documentUrl
  return `${apiBase}${path}`
}

const headers = [
  { title: 'Tipo de gasto', key: 'expenseType' },
  { title: 'Tipo de incremento', key: 'incrementType' },
  { title: 'Casa Petroil', key: 'casa' },
  { title: 'Proveedor', key: 'provider' },
  { title: 'Importe', key: 'amount' },
  { title: 'Motivo', key: 'comment' },
  { title: 'Documento', key: 'documentUrl', sortable: false },
]

const statusOptions: { title: string; value: FundRequestStatus }[] = [
  { title: 'En revisión', value: 'en-revision' },
  { title: 'Autorizada', value: 'autorizada' },
  { title: 'Corrección', value: 'correccion' },
]
const statusColor: Record<FundRequestStatus, string> = {
  'en-revision': 'info',
  autorizada: 'success',
  correccion: 'error',
}

const updatingStatus = ref(false)
const statusError = ref<string | null>(null)

async function changeStatus(status: FundRequestStatus) {
  if (!props.request || status === props.request.status) return
  updatingStatus.value = true
  statusError.value = null
  try {
    await store.updateStatus(props.request.id, status)
  } catch (e) {
    console.error('Error al cambiar el estatus de la solicitud:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    statusError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo cambiar el estatus.'
  } finally {
    updatingStatus.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="960" scrollable>
    <v-card v-if="props.request">
      <v-card-item class="pa-6 pb-4">
        <div class="d-flex justify-space-between align-start">
          <div>
            <p class="text-caption font-weight-bold text-primary text-uppercase mb-1">
              Folio {{ props.request.sippFolio || props.request.folio }}
            </p>
            <h2 class="text-h5 font-weight-bold text-secondary">Detalle de la solicitud</h2>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Fecha de Solicitud: {{ props.request.requiredDate }} · Tarjeta: {{ props.request.card }}
            </p>
          </div>
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="open = false" />
        </div>

        <div class="d-flex align-center ga-2 mt-4">
          <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
            Estatus:
          </span>
          <v-select
            :model-value="props.request.status"
            :items="statusOptions"
            :loading="updatingStatus"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 220px"
            @update:model-value="changeStatus"
          >
            <template #selection="{ item }">
              <v-chip size="small" :color="statusColor[item.value as FundRequestStatus]" variant="tonal">
                {{ item.title }}
              </v-chip>
            </template>
          </v-select>
        </div>
        <p v-if="statusError" class="text-caption text-error mt-1 mb-0">{{ statusError }}</p>
      </v-card-item>

      <v-divider />

      <v-card-text class="pa-6">
        <v-table density="comfortable">
          <thead>
            <tr>
              <th v-for="header in headers" :key="header.key">{{ header.title }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="concept in props.request.concepts" :key="concept.id">
              <td>{{ concept.expenseType }}</td>
              <td>{{ concept.incrementType }}</td>
              <td>{{ concept.casa }}</td>
              <td>{{ concept.provider }}</td>
              <td>{{ formatCurrency(concept.amount) }}</td>
              <td>{{ concept.comment || '—' }}</td>
              <td>
                <a :href="documentHref(concept.documentUrl)" target="_blank" rel="noopener">
                  {{ concept.documentName }}
                </a>
              </td>
            </tr>
          </tbody>
        </v-table>

        <div class="d-flex justify-end mt-4">
          <p class="text-body-1">
            <strong>Total: {{ formatCurrency(props.request.total) }}</strong>
          </p>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" color="secondary" @click="open = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
