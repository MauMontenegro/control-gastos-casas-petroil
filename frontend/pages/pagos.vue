<script setup lang="ts">
import type { Payment, PaymentProofStatus } from '~/types'

const store = usePaymentsStore()
const selectedPayment = ref<Payment | null>(null)
const registerDialogOpen = ref(false)
const detailsDialogOpen = ref(false)
const search = ref('')
const activeFilter = ref<'all' | 'unpaid' | 'paid'>('all')

onMounted(() => {
  store.fetchPayments()
})

const headers = [
  { title: 'Solicitud', key: 'requestFolio', width: '13%', sortable: false },
  { title: 'Servicio / sucursal', key: 'service', width: '16%', sortable: false },
  { title: 'Vence', key: 'dueDate', width: '11%', sortable: false },
  { title: 'Importe', key: 'amount', width: '10%', sortable: false },
  { title: 'Variación', key: 'variationPct', width: '9%', sortable: false },
  { title: 'Pago', key: 'status', width: '12%', sortable: false },
  { title: 'Comprobante', key: 'proofStatus', width: '13%', sortable: false },
  { title: 'Acción', key: 'actions', width: '16%', sortable: false },
]

const proofStatusLabel: Record<PaymentProofStatus, string> = {
  'sin-cargar': 'Sin cargar',
  cargada: 'Cargada',
}

function getProofAction(payment: Payment) {
  if (payment.proofStatus === 'sin-cargar') {
    return {
    label: 'Adjuntar',
    icon: 'mdi-paperclip',
    className: 'proof-action-btn--attach',
    }
  }

  return {
    label: 'Ver comprobante',
    icon: 'mdi-eye-outline',
    className: 'proof-action-btn--view',
  }
}

const filters = [
  { label: 'Todos', value: 'all' as const },
  { label: 'No pagados', value: 'unpaid' as const },
  { label: 'Pagados', value: 'paid' as const },
]

function getDueDateTimestamp(value: string) {
  const months: Record<string, number> = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dic: 11,
  }
  const match = value.toLocaleLowerCase('es-MX').match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/)

  if (match) {
    return new Date(Number(match[3]), months[match[2]!] ?? 0, Number(match[1])).getTime()
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

const filteredPayments = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('es-MX')

  return store.items
    .filter((payment) => {
      const matchesFilter =
        activeFilter.value === 'all' ||
        (activeFilter.value === 'paid' && payment.status === 'pagado') ||
        (activeFilter.value === 'unpaid' && payment.status !== 'pagado')

      if (!matchesFilter) return false
      if (!query) return true

      return [
        payment.id,
        payment.requestFolio,
        payment.service,
        payment.branch,
        payment.dueDate,
        payment.amount.toString(),
      ].some((value) => value?.toLocaleLowerCase('es-MX').includes(query))
    })
    .sort((a, b) => getDueDateTimestamp(a.dueDate) - getDueDateTimestamp(b.dueDate))
})

const paidCount = computed(() => store.items.filter((payment) => payment.status === 'pagado').length)
const pendingCount = computed(() => store.items.length - paidCount.value)

function downloadExcel() {
  const escapeCell = (value: string | number | null | undefined) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = filteredPayments.value.map((payment) => [
    payment.requestFolio,
    payment.service,
    payment.branch,
    payment.dueDate,
    payment.amount,
    `${payment.variationPct}%`,
    payment.status === 'pagado' ? 'Pagado' : 'No pagado',
    proofStatusLabel[payment.proofStatus],
  ])
  const csv = [
    ['Solicitud', 'Servicio', 'Sucursal', 'Vencimiento', 'Importe', 'Variación', 'Pago', 'Comprobante'],
    ...rows,
  ]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')

  link.href = url
  link.download = `pagos-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function openProofAction(payment: Payment) {
  selectedPayment.value = payment
  if (payment.proofStatus === 'sin-cargar') {
    registerDialogOpen.value = true
  } else {
    detailsDialogOpen.value = true
  }
}

function markProofAsUploaded() {
  if (!selectedPayment.value) return
  selectedPayment.value.status = 'pagado'
  selectedPayment.value.proofStatus = 'cargada'
  registerDialogOpen.value = false
}
</script>

<template>
  <div class="payments-page">
    <header class="payments-page-header">
      <div class="payments-page-header__copy">
        <h1>Pagos autorizados</h1>
        <span>Gestiona pagos respaldados por solicitudes aprobadas.</span>
      </div>
      <div class="payments-page-header__summary">
        <div class="payments-page-header__pending">
          <v-icon icon="mdi-clock-outline" size="18" />
          <strong>{{ pendingCount }}</strong>
          <span>pagos pendientes</span>
        </div>
      </div>
    </header>

    <v-card class="payments-panel" elevation="0">
      <div class="payments-toolbar">
        <div class="payments-toolbar__main">
          <div class="payments-search">
            <v-icon class="payments-search__icon" icon="mdi-magnify" />
            <input v-model="search" aria-label="Buscar pago" placeholder="Buscar pago..." type="search" />
            <span>{{ filteredPayments.length }} resultados</span>
          </div>

          <div class="payments-filters" role="group" aria-label="Filtros de pagos">
            <button
              v-for="filter in filters"
              :key="filter.value"
              class="payments-filter"
              :class="{ 'payments-filter--active': activeFilter === filter.value }"
              type="button"
              @click="activeFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <v-btn
          class="import-excel-btn"
          prepend-icon="mdi-download"
          variant="flat"
          @click="downloadExcel"
        >
          Descargar Excel
        </v-btn>
      </div>

      <v-data-table
        class="payments-table"
        :headers="headers"
        :items="filteredPayments"
        :loading="store.loading"
        :items-per-page="-1"
        hide-default-footer
        item-value="id"
        hover
      >
        <template #item.requestFolio="{ item }">
          <span class="payment-folio">{{ item.requestFolio }}</span>
        </template>
        <template #item.service="{ item }">
          <strong class="payment-service">{{ item.service }}</strong>
          <div class="payment-branch">{{ item.branch }}</div>
        </template>
        <template #item.dueDate="{ item }">
          <span class="payment-date">{{ item.dueDate }}</span>
        </template>
        <template #item.amount="{ item }">
          <strong class="payment-amount">{{ formatCurrency(item.amount) }}</strong>
        </template>
        <template #item.variationPct="{ item }">
          <span
            class="payment-variation"
            :class="{
              'payment-variation--high': item.variationPct >= 10,
              'payment-variation--positive': item.variationPct >= 0 && item.variationPct < 10,
            }"
          >
            {{ item.variationPct >= 0 ? '+' : '' }}{{ item.variationPct }}%
          </span>
        </template>
        <template #item.status="{ item }">
          <v-chip
            class="status-chip"
            :class="
              item.status === 'pagado' ? 'status-chip--success' : 'status-chip--neutral'
            "
            size="small"
            variant="flat"
          >
            {{ item.status === 'pagado' ? 'Pagado' : 'No pagado' }}
          </v-chip>
        </template>
        <template #item.proofStatus="{ item }">
          <v-chip
            class="status-chip"
            :class="`status-chip--proof-${item.proofStatus}`"
            size="small"
            variant="flat"
          >
            {{ proofStatusLabel[item.proofStatus] }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <div class="proof-action-cell">
            <v-btn
              class="proof-action-btn"
              :class="getProofAction(item).className"
              :prepend-icon="getProofAction(item).icon"
              variant="flat"
              @click="openProofAction(item)"
            >
              {{ getProofAction(item).label }}
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <PaymentProofDialog
      v-model="registerDialogOpen"
      :payment="selectedPayment"
      @registered="markProofAsUploaded"
    />
    <PaymentProofDetailsDialog v-model="detailsDialogOpen" :payment="selectedPayment" />
  </div>
</template>

<style scoped>
.payments-page-header {
  position: relative;
  display: flex;
  min-height: 74px;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;
  padding: 8px 4px 14px 18px;
  animation: payments-content-in 480ms ease-out both;
}

.payments-page-header::before {
  position: absolute;
  top: 12px;
  bottom: 16px;
  left: 2px;
  width: 5px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ff963e, #ff6f1a);
  box-shadow: 0 3px 9px rgb(255 111 26 / 22%);
  content: '';
}

.payments-page-header::after {
  position: absolute;
  right: 4px;
  bottom: 0;
  left: 4px;
  height: 1px;
  background: linear-gradient(90deg, #8ec7df, #dde5ea 48%, transparent);
  content: '';
}

.payments-page {
  --payments-text-size: 0.82rem;

  position: relative;
  min-height: calc(100vh - 126px);
  margin: -24px;
  padding: 18px 24px 24px;
  background: #eaf5fa;
  color: #172b3a;
  font-family: Arial, Helvetica, sans-serif;
  isolation: isolate;
}

.payments-page::before,
.payments-page::after {
  display: none;
}

.payments-page::before {
  top: -90px;
  right: -60px;
  width: 330px;
  height: 250px;
  background: rgb(32 169 196 / 15%);
  animation: payments-glow-float 9s ease-in-out infinite alternate;
}

.payments-page::after {
  top: 180px;
  left: -110px;
  width: 280px;
  height: 280px;
  background: rgb(255 116 28 / 9%);
  animation: payments-glow-float 11s ease-in-out 800ms infinite alternate-reverse;
}

.payments-page-header__copy {
  min-width: 0;
}

.payments-page-header__copy h1 {
  color: #123c56;
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(1.28rem, 1.8vw, 1.6rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.payments-page-header__copy span {
  display: block;
  margin-top: 5px;
  color: #506f82;
  font-size: 0.8rem;
}

.payments-page-header__summary {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.payments-page-header__summary > div {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 7px 11px;
  border: 1px solid #efcbb7;
  border-radius: 999px;
  background: linear-gradient(135deg, #fffaf7, #fff2e9);
  box-shadow: 0 4px 12px rgb(210 91 32 / 8%);
}

.payments-page-header__summary :deep(.v-icon) {
  color: #e26327;
}

.payments-page-header__summary strong {
  color: #c95620;
  font-size: 0.9rem;
  line-height: 1;
}

.payments-page-header__summary span {
  color: #697985;
  font-size: 0.72rem;
  font-weight: 400;
}

.payments-page-header__pending strong {
  color: #d66024;
}

@keyframes payments-content-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes payments-glow-float {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }

  to {
    transform: translate3d(18px, 22px, 0) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .payments-page-header,
  .payments-page::before,
  .payments-page::after {
    animation: none;
  }
}

.payments-panel {
  overflow: hidden;
  border: 1px solid #b9d9e9;
  border-radius: 14px !important;
  background: #fff;
  border-top: 4px solid #e9b224;
  box-shadow:
    0 8px 24px rgb(28 52 68 / 6%),
    0 0 0 3px rgb(8 126 184 / 4%) !important;
}

.payments-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e4eaee;
  background: #fff;
}

.payments-toolbar__main {
  display: flex;
  min-width: 0;
  flex: 1;
  gap: 14px;
  align-items: center;
}

.payments-search {
  display: grid;
  width: 290px;
  min-width: 240px;
  height: 42px;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 0 13px;
  border: 1px solid #d5dfe5;
  border-radius: 10px;
  background: white;
  box-shadow: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.payments-search:focus-within {
  border-color: #086fa5;
  box-shadow: 0 0 0 3px rgb(8 111 165 / 10%);
}

.payments-search__icon {
  color: #0780b8;
}

.payments-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  color: #183e5c;
  font: inherit;
  font-size: var(--payments-text-size);
  font-weight: 400;
}

.payments-search input::placeholder {
  color: #7791a5;
}

.payments-search span {
  color: #68869c;
  font-size: 0.76rem;
  font-weight: 500;
  white-space: nowrap;
}

.payments-filters {
  display: flex;
  gap: 8px;
}

.payments-filter {
  position: relative;
  display: inline-flex;
  min-width: 92px;
  height: 40px;
  gap: 7px;
  align-items: center;
  justify-content: center;
  padding-inline: 13px;
  border: 1px solid #d5dfe5;
  border-radius: 10px;
  background: #fff;
  color: #3c5363;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: none;
  transition:
    color 160ms ease,
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.payments-filter:hover {
  border-color: #8ab7ce;
  background: #f7fafc;
  color: #086fa5;
}

.payments-filter--active {
  border-color: #086fa5;
  background: linear-gradient(135deg, #1095ce, #086fa5);
  color: white;
  box-shadow:
    0 4px 10px rgb(8 111 165 / 20%),
    inset 0 1px 0 rgb(255 255 255 / 24%);
}

.import-excel-btn {
  height: 42px;
  padding-inline: 16px !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #ff8a35, #f36a21) !important;
  color: white !important;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-transform: none;
  box-shadow:
    0 5px 12px rgb(243 106 33 / 24%),
    inset 0 1px 0 rgb(255 255 255 / 28%);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.import-excel-btn:hover {
  background: linear-gradient(135deg, #ff9a4e, #f15d12) !important;
  filter: saturate(1.08);
  transform: translateY(-2px);
  box-shadow:
    0 9px 20px rgb(243 106 33 / 32%),
    0 0 0 3px rgb(243 106 33 / 8%);
}

.payments-table {
  margin: 0;
  border-top: 1px solid #9bc9df;
  border-radius: 0;
  background: #eaf6fb;
  color: #171d22;
  font-family: Arial, Helvetica, sans-serif;
  font-size: var(--payments-text-size);
}

.payments-table :deep(.v-table__wrapper) {
  border-radius: 0;
}

.payments-table :deep(table) {
  width: 100%;
  table-layout: fixed;
}

.payments-table :deep(th),
.payments-table :deep(td) {
  overflow: hidden;
}

.payments-table :deep(thead th) {
  height: 50px !important;
  border-bottom: 1px solid #086995 !important;
  background: linear-gradient(135deg, #1389ba, #0872a5) !important;
  color: #fff !important;
  font-size: 0.8rem !important;
  font-weight: 500 !important;
  letter-spacing: 0;
  line-height: 1.2;
  text-transform: none;
  white-space: nowrap;
}

.payments-table :deep(tbody tr) {
  background: #eaf6fb;
  transition:
    background-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.payments-table :deep(tbody tr:hover) {
  position: relative;
  z-index: 1;
  background: #d7eff9 !important;
  box-shadow:
    inset 5px 0 0 #f36a21,
    inset 0 1px 0 rgb(21 149 200 / 8%),
    inset 0 -1px 0 rgb(21 149 200 / 8%);
}

.payments-table :deep(tbody td) {
  height: 60px !important;
  padding-inline: 14px !important;
  border-color: #c9e2ed !important;
  color: #172b3a;
  font-weight: 400;
  vertical-align: middle;
}

.payments-table :deep(.v-data-table-footer) {
  border-top: 1px solid #b8d9e7;
  background: #dff0f7;
}

.payment-folio {
  color: #171d22;
  font-size: var(--payments-text-size);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.payment-service {
  display: block;
  color: #111;
  font-size: var(--payments-text-size);
  font-weight: 600;
  line-height: 1.25;
}

.payment-branch {
  margin-top: 3px;
  color: #68737c;
  font-size: 0.78rem;
  line-height: 1.2;
}

.payment-date {
  color: #242c32;
  font-size: var(--payments-text-size);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.payment-amount {
  color: #111;
  font-size: var(--payments-text-size);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.payment-variation {
  color: #505b63;
  font-size: var(--payments-text-size);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.payment-variation--positive {
  color: #7b6b4d;
}

.payment-variation--high {
  color: #b5632c;
}

.status-chip {
  min-width: 88px;
  height: 28px !important;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 9px !important;
  font-size: 0.78rem !important;
  font-weight: 400;
  letter-spacing: 0;
}

.status-chip::before {
  width: 6px;
  height: 6px;
  margin-right: 7px;
  border-radius: 50%;
  background: currentcolor;
  content: '';
  opacity: 0.65;
}

.status-chip--neutral {
  border-color: #eadfbd;
  background: #fbf5e7 !important;
  color: #806528 !important;
}

.status-chip--proof-sin-cargar {
  border-color: #dde5ea;
  background: #f1f4f6 !important;
  color: #5b6e7c !important;
}

.status-chip--success {
  border-color: #d4e9df;
  background: #eaf5ef !important;
  color: #247556 !important;
}

.status-chip--proof-cargada {
  border-color: #d8e5ef;
  background: #edf4f9 !important;
  color: #376b8e !important;
}

.proof-action-cell {
  display: flex;
  min-width: 0;
  justify-content: flex-start;
  align-items: center;
  padding: 4px 0;
}

.proof-action-btn {
  width: 116px;
  min-width: 0;
  height: 38px;
  padding-inline: 14px;
  background: linear-gradient(135deg, #1095ce, #086fa5);
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 500;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  border: 1px solid #086fa5;
  border-radius: 10px !important;
  text-transform: none;
  box-shadow:
    0 5px 12px rgb(8 111 165 / 22%),
    inset 0 1px 0 rgb(255 255 255 / 24%);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

.proof-action-btn--attach {
  width: 116px;
}

.proof-action-btn--view {
  width: 146px;
  background: linear-gradient(135deg, #1095ce, #086fa5);
  color: #fff;
  box-shadow:
    0 5px 12px rgb(8 111 165 / 22%),
    inset 0 1px 0 rgb(255 255 255 / 24%);
}

.proof-action-btn:hover {
  background: linear-gradient(135deg, #18a9df, #0878b2);
  filter: saturate(1.08);
  transform: translateY(-2px);
  box-shadow:
    0 9px 18px rgb(8 111 165 / 30%),
    0 0 0 3px rgb(16 149 206 / 8%);
}

.proof-action-btn--view:hover {
  background: linear-gradient(135deg, #18a9df, #0878b2);
  box-shadow:
    0 9px 18px rgb(8 111 165 / 30%),
    0 0 0 3px rgb(16 149 206 / 8%);
}

@media (max-width: 1200px) {
  .payments-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .payments-toolbar__main {
    flex-wrap: wrap;
  }

  .import-excel-btn {
    align-self: flex-start;
  }
}

@media (max-width: 960px) {
  .payments-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .import-excel-btn {
    align-self: flex-start;
  }

  .proof-action-cell {
    min-width: 0;
  }

  .proof-action-btn {
    width: 110px;
    padding-inline: 10px;
    font-size: 0.76rem;
  }

  .proof-action-btn--view {
    width: 140px;
  }

}

@media (max-width: 600px) {
  .payments-page-header {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 14px 16px;
  }

  .payments-page-header__summary {
    width: 100%;
    margin-left: 0;
  }

  .payments-page-header__summary > div {
    height: auto;
  }

  .payments-toolbar {
    padding: 20px 16px;
  }

  .payments-search {
    width: 100%;
    min-width: 0;
  }

  .payments-search span {
    display: none;
  }

  .payments-filter {
    min-width: calc(50% - 6px);
  }

  .import-excel-btn {
    width: 100%;
  }

  .payments-table {
    margin-inline: 8px;
  }
}
</style>
