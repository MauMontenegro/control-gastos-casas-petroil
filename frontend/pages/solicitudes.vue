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
  <section class="requests-page">
    <header class="requests-heading">
      <div>
        <h1>Solicitud de incrementos</h1>
        <span>
          Seguimiento de solicitudes, autorizaciones y origen de recursos.
        </span>
      </div>
      <div class="requests-actions">
        <v-btn
          class="sipp-button"
          variant="outlined"
          prepend-icon="mdi-cloud-upload-outline"
          :disabled="!selected.length"
          :loading="uploadingSipp"
          @click="uploadSelectedToSipp"
        >
          Subir a SIPP{{ selected.length ? ` (${selected.length})` : '' }}
        </v-btn>
        <v-btn class="new-request-button" prepend-icon="mdi-plus" @click="showNewRequestModal = true">{{
          t('common.newRequest')
        }}</v-btn>
      </div>
    </header>

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

    <div class="request-metrics">
      <article class="request-metric request-metric--blue">
        <span>Pendientes</span>
        <strong>{{ store.pending.length }}</strong>
        <small>{{ formatCurrency(pendingAmount) }}</small>
      </article>
      <article class="request-metric request-metric--orange">
        <span>En aprobación</span>
        <strong>{{ store.pending.length }}</strong>
        <small>Requieren decisión</small>
      </article>
      <article class="request-metric request-metric--green">
        <span>Autorizadas</span>
        <strong>{{ store.approved.length }}</strong>
        <small>{{ formatCurrency(approvedAmount) }}</small>
      </article>
      <article class="request-metric request-metric--yellow">
        <span>Corrección / rechazo</span>
        <strong>{{ store.rejected.length }}</strong>
        <small>Requieren ajustes</small>
      </article>
    </div>

    <v-card class="requests-table-card" elevation="0">
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
          <v-chip
            size="small"
            :color="statusColor[item.status]"
            variant="tonal"
            class="request-status-chip"
            :class="`request-status-chip--${item.status}`"
          >
            {{ t(`status.${item.status}`) }}
          </v-chip>
        </template>
        <template #item.sippStatus="{ item }">
          <v-chip
            size="small"
            :color="sippStatusColor[item.sippStatus ?? 'no-enviada']"
            variant="tonal"
            class="request-status-chip"
            :class="`request-status-chip--sipp-${item.sippStatus ?? 'no-enviada'}`"
          >
            {{ sippStatusLabel[item.sippStatus ?? 'no-enviada'] }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>

    <RequestFormDialog v-model="showNewRequestModal" />
    <RequestDetailDialog v-model="showDetailModal" :request="detailRequest" />
  </section>
</template>

<style scoped>
.requests-page {
  min-height: calc(100vh - 126px);
  margin: -24px;
  padding: 16px 24px 24px;
  background: #eaf5fa;
  color: #0c2f4d;
  font-family: Arial, Helvetica, sans-serif;
}

.requests-heading {
  position: relative;
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
  padding-left: 18px;
}

.requests-heading::before {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0;
  width: 5px;
  border-radius: 99px;
  background: linear-gradient(180deg, #ff963e, #ff6f1a);
  box-shadow: 0 3px 9px rgb(255 111 26 / 22%);
  content: '';
}

.requests-heading h1 {
  margin: 0;
  color: #123c56;
  font-size: clamp(1.28rem, 1.8vw, 1.6rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.requests-heading span {
  display: block;
  margin-top: 4px;
  color: #607b8d;
  font-size: 0.8rem;
}

.requests-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.sipp-button,
.new-request-button {
  min-height: 39px;
  border-radius: 8px !important;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.sipp-button {
  border-color: #8ebcd2 !important;
  color: #075f99 !important;
}

.new-request-button {
  background: linear-gradient(135deg, #ff8a2b, #f36b1b) !important;
  box-shadow: 0 5px 12px rgb(243 107 27 / 22%);
  color: #fff !important;
}

.request-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.request-metric {
  position: relative;
  display: flex;
  min-height: 96px;
  overflow: hidden;
  padding: 14px 16px;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #d5e5ed;
  border-top: 4px solid var(--metric-color);
  border-radius: 12px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 6px 16px rgb(20 67 98 / 7%);
}

.request-metric::after {
  position: absolute;
  top: -44px;
  right: -35px;
  width: 115px;
  height: 115px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--metric-color) 8%, transparent);
  content: '';
}

.request-metric--blue { --metric-color: #1685b3; }
.request-metric--orange { --metric-color: #ff791f; }
.request-metric--green { --metric-color: #2a9a76; }
.request-metric--yellow { --metric-color: #e9b224; }
.request-metric span { color: #61798a; font-size: 0.72rem; }
.request-metric strong { margin: 3px 0 1px; color: #123c56; font-size: 1.25rem; line-height: 1.1; }
.request-metric small { color: #728696; font-size: 0.65rem; }

.requests-table-card {
  overflow: hidden;
  border: 1px solid #b9d9e9;
  border-top: 4px solid #e9b224;
  border-radius: 13px !important;
  background: #eaf6fb;
  box-shadow: 0 8px 22px rgb(20 67 98 / 8%);
}

.requests-table-card :deep(.v-data-table) {
  background: #eaf6fb;
  color: #172b3a;
  font-family: Arial, Helvetica, sans-serif;
}

.requests-table-card :deep(thead th) {
  height: 48px !important;
  border-bottom: 1px solid #086995 !important;
  background: linear-gradient(135deg, #1389ba, #0872a5) !important;
  color: #fff !important;
  font-size: 0.78rem !important;
  font-weight: 500 !important;
  letter-spacing: 0;
  white-space: nowrap;
}

.requests-table-card :deep(thead .v-icon) {
  color: rgb(255 255 255 / 82%) !important;
}

.requests-table-card :deep(tbody tr) {
  background: #eaf6fb;
  transition: background-color 0.16s ease, box-shadow 0.16s ease;
}

.requests-table-card :deep(tbody td) {
  height: 58px !important;
  padding-inline: 14px !important;
  border-color: #c9e2ed !important;
  color: #172b3a;
  font-size: 0.76rem;
  font-weight: 400;
}

.requests-table-card :deep(.v-data-table-footer) {
  border-top: 1px solid #b8d9e7;
  background: #dff0f7;
  color: #29485e;
}

.clickable-rows :deep(tbody tr) {
  cursor: pointer;
  transition: background 0.15s ease;
}

.clickable-rows :deep(tbody tr:hover) {
  background: #d7eff9 !important;
  box-shadow: inset 5px 0 0 #f36a21;
}

.clickable-rows :deep(tbody tr:has(.v-selection-control--dirty)) {
  background: #d7eff9;
  box-shadow: inset 5px 0 0 #0872a5;
}

.request-status-chip {
  min-width: 86px;
  height: 27px !important;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 9px !important;
  font-size: 0.7rem !important;
  font-weight: 500;
  letter-spacing: 0;
}

.request-status-chip::before {
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
  background: currentcolor;
  content: '';
  opacity: 0.65;
}

.request-status-chip--en-revision,
.request-status-chip--sipp-en-proceso {
  border-color: #d8e5ef;
  background: #edf4f9 !important;
  color: #376b8e !important;
}

.request-status-chip--autorizada,
.request-status-chip--sipp-enviada {
  border-color: #d4e9df;
  background: #eaf5ef !important;
  color: #247556 !important;
}

.request-status-chip--correccion,
.request-status-chip--sipp-error {
  border-color: #f1d9cf;
  background: #fff0eb !important;
  color: #b75a37 !important;
}

.request-status-chip--sipp-no-enviada {
  border-color: #eadfbd;
  background: #fbf5e7 !important;
  color: #806528 !important;
}

@media (max-width: 900px) {
  .request-metrics { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .requests-heading { align-items: flex-start; flex-direction: column; }
  .requests-actions { width: 100%; }
  .requests-actions :deep(.v-btn) { flex: 1; }
  .request-metrics { grid-template-columns: 1fr; }
}
</style>
