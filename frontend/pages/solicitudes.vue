<script setup lang="ts">
import type { FundRequest, FundRequestStatus, SippStatus } from '~/types'

const store = useRequestsStore()
const { t } = useI18n()

const showNewRequestModal = ref(false)

onMounted(() => {
  store.fetchRequests()
})

const headers = [
  { title: 'Folio', key: 'folio' },
  { title: 'Fecha de Solicitud', key: 'requiredDate' },
  { title: 'Concepto', key: 'concept', sortable: false },
  { title: 'Casa Petroil', key: 'casa', sortable: false },
  { title: 'Total', key: 'total' },
  { title: 'Estado', key: 'status' },
  { title: 'SIPP', key: 'sippStatus', sortable: false },
]

// Una solicitud puede tener varios conceptos, cada uno con su propia
// casa/tipo de gasto. La tabla es una fila por solicitud, así que
// mostramos el primer valor + un indicador "+N" si hay más de uno distinto.
function summarizeConcepts(item: FundRequest, field: 'expenseType' | 'casa'): string {
  if (!item.concepts.length) return '—'
  const values = [...new Set(item.concepts.map((c) => c[field]))]
  return values.length > 1 ? `${values[0]} +${values.length - 1}` : values[0]
}

const statusColor: Record<FundRequestStatus, string> = {
  'en-revision': 'info',
  autorizada: 'success',
  correccion: 'error',
}

const sippStatusLabel: Record<SippStatus, string> = {
  'no-enviada': 'No enviada',
  'en-proceso': 'Enviando...',
  enviada: 'Enviada',
  error: 'Error',
}
const sippStatusColor: Record<SippStatus, string> = {
  'no-enviada': 'default',
  'en-proceso': 'info',
  enviada: 'success',
  error: 'error',
}

const pendingAmount = computed(() => store.pending.reduce((sum, r) => sum + r.total, 0))
const approvedAmount = computed(() => store.approved.reduce((sum, r) => sum + r.total, 0))

const showDetailModal = ref(false)
const detailRequest = ref<FundRequest | null>(null)

function openDetail(item: FundRequest) {
  detailRequest.value = item
  showDetailModal.value = true
}

const selected = ref<string[]>([])
const uploadingSipp = ref(false)
const sippError = ref<string | null>(null)
const sippSuccessMessage = ref<string | null>(null)

async function uploadSelectedToSipp() {
  if (!selected.value.length) return
  uploadingSipp.value = true
  sippError.value = null
  sippSuccessMessage.value = null
  try {
    const results = await store.uploadToSipp(selected.value)
    const succeeded = results.filter((r) => r.status === 'enviada').length
    const failed = results.filter((r) => r.status === 'error')
    if (failed.length) {
      sippError.value = `${failed.length} solicitud(es) fallaron al subir a SIPP: ${failed
        .map((r) => r.message)
        .filter(Boolean)
        .join('; ')}`
    }
    if (succeeded) {
      sippSuccessMessage.value = `${succeeded} solicitud(es) enviadas a SIPP correctamente.`
    }
    selected.value = []
  } catch (e) {
    console.error('Error al subir solicitudes a SIPP:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    sippError.value = fetchError.data?.message || fetchError.message || 'No se pudo subir a SIPP.'
  } finally {
    uploadingSipp.value = false
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-end flex-wrap ga-4 mb-6">
      <div>
        <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">INCREMENTOS</p>
        <h1 class="text-h4 font-weight-bold mb-1">Solicitud de incrementos</h1>
        <p class="text-body-2 text-medium-emphasis">
          Seguimiento de solicitudes, autorizaciones y origen de recursos.
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-cloud-upload-outline"
          :disabled="!selected.length"
          :loading="uploadingSipp"
          @click="uploadSelectedToSipp"
        >
          Subir a SIPP{{ selected.length ? ` (${selected.length})` : '' }}
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showNewRequestModal = true">{{
          t('common.newRequest')
        }}</v-btn>
      </div>
    </div>

    <v-alert
      v-if="sippError"
      type="error"
      variant="tonal"
      density="comfortable"
      closable
      class="mb-4"
      @click:close="sippError = null"
    >
      {{ sippError }}
    </v-alert>
    <v-alert
      v-if="sippSuccessMessage"
      type="success"
      variant="tonal"
      density="comfortable"
      closable
      class="mb-4"
      @click:close="sippSuccessMessage = null"
    >
      {{ sippSuccessMessage }}
    </v-alert>

    <v-row class="mb-2">
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">Pendientes</span>
          <strong class="text-h6 d-block">{{ store.pending.length }}</strong>
          <small class="text-caption text-medium-emphasis">{{
            formatCurrency(pendingAmount)
          }}</small>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">En aprobación</span>
          <strong class="text-h6 d-block">{{ store.pending.length }}</strong>
          <small class="text-caption text-medium-emphasis">Requieren decisión</small>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">Autorizadas</span>
          <strong class="text-h6 d-block">{{ store.approved.length }}</strong>
          <small class="text-caption text-medium-emphasis">{{
            formatCurrency(approvedAmount)
          }}</small>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">Corrección / rechazo</span>
          <strong class="text-h6 d-block">{{ store.rejected.length }}</strong>
          <small class="text-caption text-medium-emphasis">Requieren ajustes</small>
        </v-card>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        v-model="selected"
        :headers="headers"
        :items="store.items"
        :loading="store.loading"
        item-value="id"
        show-select
        class="clickable-rows"
        @click:row="(_event: unknown, { item }: { item: FundRequest }) => openDetail(item)"
      >
        <template #item.folio="{ item }">
          {{ item.sippFolio || item.folio }}
        </template>
        <template #item.concept="{ item }">
          {{ summarizeConcepts(item, 'expenseType') }}
        </template>
        <template #item.casa="{ item }">
          {{ summarizeConcepts(item, 'casa') }}
        </template>
        <template #item.total="{ item }">
          <strong>{{ formatCurrency(item.total) }}</strong>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor[item.status]" variant="tonal">
            {{ t(`status.${item.status}`) }}
          </v-chip>
        </template>
        <template #item.sippStatus="{ item }">
          <v-chip size="small" :color="sippStatusColor[item.sippStatus ?? 'no-enviada']" variant="tonal">
            {{ sippStatusLabel[item.sippStatus ?? 'no-enviada'] }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>

    <RequestFormDialog v-model="showNewRequestModal" />
    <RequestDetailDialog v-model="showDetailModal" :request="detailRequest" />
  </div>
</template>

<style scoped>
.clickable-rows :deep(tbody tr) {
  cursor: pointer;
}
</style>
