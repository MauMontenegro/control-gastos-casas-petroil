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

const filters = reactive({
  folio: '',
  dateFrom: '',
  dateTo: '',
  status: 'Todos',
  casa: 'Todas',
  sippStatus: 'Todos',
})
const quickStatusOptions = [
  { label: 'Todos', value: 'Todos' },
  { label: 'En aprobación', value: 'en-revision' },
  { label: 'Autorizadas', value: 'autorizada' },
  { label: 'Corrección', value: 'correccion' },
]

function clearFilters() {
  filters.folio = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.status = 'Todos'
  filters.casa = 'Todas'
  filters.sippStatus = 'Todos'
}

const hasActiveFilters = computed(
  () =>
    !!filters.folio ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    filters.status !== 'Todos' ||
    filters.casa !== 'Todas' ||
    filters.sippStatus !== 'Todos',
)

const sippStatusOptions = computed(() => [
  { title: 'Todos', value: 'Todos' },
  ...(Object.keys(sippStatusLabel) as SippStatus[]).map((value) => ({
    title: sippStatusLabel[value],
    value,
  })),
])

const casaFilterOptions = computed(() => [
  'Todas',
  ...new Set(store.items.flatMap((item) => item.concepts.map((c) => c.casa))),
])

const filteredItems = computed(() => {
  const folioTerm = filters.folio.trim().toLocaleLowerCase('es')
  return store.items.filter((item) => {
    const folio = (item.sippFolio || item.folio).toLocaleLowerCase('es')
    if (folioTerm && !folio.includes(folioTerm)) return false
    if (filters.dateFrom && item.requiredDate < filters.dateFrom) return false
    if (filters.dateTo && item.requiredDate > filters.dateTo) return false
    if (filters.status !== 'Todos' && item.status !== filters.status) return false
    if (filters.casa !== 'Todas' && !item.concepts.some((c) => c.casa === filters.casa))
      return false
    if (
      filters.sippStatus !== 'Todos' &&
      (item.sippStatus ?? 'no-enviada') !== filters.sippStatus
    )
      return false
    return true
  })
})

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
        <div><span>Pendientes</span><strong>{{ store.pending.length }}</strong><small>{{ formatCurrency(pendingAmount) }}</small></div>
      </article>
      <article class="request-metric request-metric--orange">
        <div><span>En aprobación</span><strong>{{ store.pending.length }}</strong><small>Requieren decisión</small></div>
      </article>
      <article class="request-metric request-metric--green">
        <div><span>Autorizadas</span><strong>{{ store.approved.length }}</strong><small>{{ formatCurrency(approvedAmount) }}</small></div>
      </article>
      <article class="request-metric request-metric--yellow">
        <div><span>Corrección / rechazo</span><strong>{{ store.rejected.length }}</strong><small>Requieren ajustes</small></div>
      </article>
    </div>

    <v-card class="requests-data-panel" elevation="0">
      <div class="requests-filter-bar">
        <div class="requests-filter-line">
          <label class="requests-search">
            <v-icon icon="mdi-magnify" size="23" />
            <input v-model="filters.folio" type="search" placeholder="Buscar folio..." />
            <span>{{ filteredItems.length }} resultados</span>
          </label>

          <label class="filter-field filter-field--status">
            <span>Estado</span>
            <v-select v-model="filters.status" :items="quickStatusOptions" :menu-props="{ contentClass: 'requests-filter-menu' }" item-title="label" item-value="value" aria-label="Estado" density="compact" hide-details />
          </label>

          <label class="filter-field filter-field--date"><span>Desde</span><v-text-field v-model="filters.dateFrom" type="date" aria-label="Desde" density="compact" clearable hide-details /></label>
          <label class="filter-field filter-field--date"><span>Hasta</span><v-text-field v-model="filters.dateTo" type="date" aria-label="Hasta" density="compact" clearable hide-details /></label>
          <label class="filter-field filter-field--select"><span>Casa Petroil</span><v-select v-model="filters.casa" :items="casaFilterOptions" :menu-props="{ contentClass: 'requests-filter-menu' }" aria-label="Casa Petroil" density="compact" hide-details /></label>
          <label class="filter-field filter-field--select"><span>Estado SIPP</span><v-select v-model="filters.sippStatus" :items="sippStatusOptions" :menu-props="{ contentClass: 'requests-filter-menu' }" aria-label="Estado SIPP" density="compact" hide-details /></label>
          <v-btn v-if="hasActiveFilters" class="clear-filter-button" variant="text" size="small" @click="clearFilters">
            Limpiar
          </v-btn>
        </div>
      </div>

    <div class="requests-table-card">
      <v-data-table
        v-model="selected"
        :headers="headers"
        :items="filteredItems"
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
    </div>
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
  min-height: 82px;
  overflow: hidden;
  padding: 13px 15px;
  align-items: center;
  border: 1px solid #d5e5ed;
  border-top: 4px solid var(--metric-color);
  border-radius: 12px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 6px 16px rgb(20 67 98 / 7%);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.request-metric:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgb(20 67 98 / 13%);
}

.request-metric > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
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

.requests-data-panel {
  overflow: hidden;
  border: 1px solid #b9d9e9;
  border-top: 4px solid #e9b224;
  border-radius: 14px !important;
  background: #fff;
  box-shadow: 0 8px 24px rgb(28 52 68 / 7%) !important;
}

.requests-filter-bar {
  padding: 10px 12px;
  background: #f7fbfc;
}

.requests-filter-bar {
  overflow-x: auto;
}

.requests-filter-line {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 9px;
}

.requests-search {
  display: grid;
  width: min(360px, 31%);
  min-width: 245px;
  min-height: 42px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid #b6d2df;
  border-radius: 10px;
  background: #fff;
  color: #0877a8;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.requests-search:focus-within {
  border-color: #0872a5;
  box-shadow: 0 0 0 3px rgb(8 111 165 / 9%);
}

.requests-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  color: #183e5c;
  font: inherit;
  font-size: 0.75rem;
}

.requests-search input::placeholder {
  color: #7891a3;
}

.requests-search > span {
  color: #68869c;
  font-size: 0.65rem;
  white-space: nowrap;
}

.filter-field {
  position: relative;
  display: block;
  padding-top: 9px;
}

.filter-field > span {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 10px;
  padding: 0 5px;
  background: #f7fbfc;
  color: #315c75;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
}

.filter-field > :deep(.v-input) {
  width: 100%;
}

.filter-field--date {
  width: 145px;
}

.filter-field--status {
  width: 155px;
}

.filter-field--select {
  width: 160px;
}

.clear-filter-button {
  min-width: 66px !important;
  color: #d76518 !important;
  font-size: 0.68rem !important;
  font-weight: 700;
}

.requests-filter-bar :deep(.v-field) {
  min-height: 39px;
  border-radius: 9px;
  border: 1px solid #9fc7d9;
  background: rgb(255 255 255 / 88%);
  color: #183e5c;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.75rem;
}

.requests-filter-bar :deep(.v-field:hover) {
  border-color: #4d9fc1;
  background: #fff;
}

.requests-filter-bar :deep(.v-field__prepend-inner),
.requests-filter-bar :deep(.v-field__append-inner) {
  color: #0877a8;
}

.requests-filter-bar :deep(.v-field__input) {
  min-height: 39px;
  padding-top: 4px;
  padding-bottom: 4px;
}

.requests-filter-bar :deep(.v-label) {
  color: #397a9d;
  font-size: 0.7rem;
}

.requests-filter-bar :deep(.v-field--focused) {
  border-color: #0872a5;
  box-shadow: 0 0 0 3px rgb(8 111 165 / 9%);
}

.requests-filter-footer {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 3px 0;
  color: #617a8d;
  font-size: 0.68rem;
}

.requests-filter-footer :deep(.v-btn) {
  color: #d66518;
  font-size: 0.68rem;
  text-transform: none;
}

.requests-table-card {
  overflow: hidden;
  border: 0;
  border-top: 1px solid #8ec5dd;
  border-radius: 0;
  background: #eaf6fb;
  box-shadow: none;
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
  .requests-search { width: 100%; }
}

@media (max-width: 640px) {
  .requests-heading { align-items: flex-start; flex-direction: column; }
  .requests-actions { width: 100%; }
  .requests-actions :deep(.v-btn) { flex: 1; }
  .request-metrics { grid-template-columns: 1fr; }
}

:global(.requests-filter-menu) {
  overflow: hidden;
  border: 1px solid #69a9c4;
  border-radius: 14px !important;
  background: #c7e4ef !important;
  box-shadow: 0 14px 28px rgb(7 70 112 / 18%) !important;
}

:global(.requests-filter-menu .v-list) {
  padding: 7px;
  background: #c7e4ef !important;
}

:global(.requests-filter-menu .v-list-item) {
  min-height: 40px;
  margin: 3px 0;
  border-radius: 9px;
  color: #17445f;
  font-size: 0.76rem;
}

:global(.requests-filter-menu .v-list-item:hover) {
  background: #a9d5e6 !important;
}

:global(.requests-filter-menu .v-list-item--active) {
  background: #82bfd8 !important;
  color: #075f99 !important;
  font-weight: 700;
}

:global(.requests-filter-menu .v-list-item__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}
</style>
