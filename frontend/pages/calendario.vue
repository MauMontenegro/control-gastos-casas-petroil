<script setup lang="ts">
import type { Payment, PaymentStatus } from '~/types'

interface CalendarDay {
  date: Date
  key: string
  isCurrentMonth: boolean
  isToday: boolean
  isFriday: boolean
  payments: Payment[]
  paymentBatch: Payment[]
}

const store = usePaymentsStore()

const monthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const serviceCatalog = ['CFE', 'Agua', 'Internet', 'Cable', 'Limpieza']
const monthMap: Record<string, number> = {
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

const focusDate = ref(new Date())
const selectedDate = ref(new Date())
const serviceFilter = ref('Todos')
const branchFilter = ref('Todas')

onMounted(async () => {
  await store.fetchPayments()

  const firstPending = store.items
    .filter((payment) => payment.status !== 'pagado')
    .map((payment) => parseDueDate(payment.dueDate))
    .sort((a, b) => a.getTime() - b.getTime())[0]

  if (firstPending) {
    focusDate.value = new Date(firstPending.getFullYear(), firstPending.getMonth(), 1)
    selectedDate.value = firstPending
  }
})

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseDueDate(dueDate: string): Date {
  const isoMatch = dueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
  }

  const [day, rawMonth, year] = normalizeText(dueDate).split(/\s+/)
  const month = monthMap[rawMonth.slice(0, 3)] ?? 0
  return new Date(Number(year), month, Number(day))
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sameDate(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

function previousOrSameFriday(date: Date): Date {
  const paymentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceFriday = (paymentDay.getDay() - 5 + 7) % 7
  paymentDay.setDate(paymentDay.getDate() - daysSinceFriday)
  return paymentDay
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace('.', '')
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const serviceOptions = computed(() => [
  'Todos',
  ...new Set([...serviceCatalog, ...store.items.map((payment) => payment.service)]),
])
const branchOptions = computed(() => [
  'Todas',
  ...new Set(store.items.map((payment) => payment.branch)),
])

const filteredPayments = computed(() =>
  store.items.filter(
    (payment) =>
      (serviceFilter.value === 'Todos' || payment.service === serviceFilter.value) &&
      (branchFilter.value === 'Todas' || payment.branch === branchFilter.value),
  ),
)

const paymentsByDueDate = computed(() => {
  const grouped = new Map<string, Payment[]>()
  for (const payment of filteredPayments.value) {
    const key = dateKey(parseDueDate(payment.dueDate))
    grouped.set(key, [...(grouped.get(key) ?? []), payment])
  }
  return grouped
})

const batchesByFriday = computed(() => {
  const grouped = new Map<string, Payment[]>()
  for (const payment of filteredPayments.value.filter((item) => item.status !== 'pagado')) {
    const key = dateKey(previousOrSameFriday(parseDueDate(payment.dueDate)))
    grouped.set(key, [...(grouped.get(key) ?? []), payment])
  }
  return grouped
})

const calendarDays = computed<CalendarDay[]>(() => {
  const year = focusDate.value.getFullYear()
  const month = focusDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - mondayOffset)

  const lastDay = new Date(year, month + 1, 0)
  const visibleDayCount = mondayOffset + lastDay.getDate()
  const cellCount = visibleDayCount > 35 ? 42 : 35

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const key = dateKey(date)

    return {
      date,
      key,
      isCurrentMonth: date.getMonth() === month,
      isToday: sameDate(date, new Date()),
      isFriday: date.getDay() === 5,
      payments: paymentsByDueDate.value.get(key) ?? [],
      paymentBatch: batchesByFriday.value.get(key) ?? [],
    }
  })
})

const weekCount = computed(() => calendarDays.value.length / 7)

const selectedDay = computed(
  () =>
    calendarDays.value.find((day) => day.key === dateKey(selectedDate.value)) ?? {
      date: selectedDate.value,
      key: dateKey(selectedDate.value),
      isCurrentMonth: true,
      isToday: sameDate(selectedDate.value, new Date()),
      isFriday: selectedDate.value.getDay() === 5,
      payments: paymentsByDueDate.value.get(dateKey(selectedDate.value)) ?? [],
      paymentBatch: batchesByFriday.value.get(dateKey(selectedDate.value)) ?? [],
    },
)

function hasConfirmedAmount(payment: Payment): boolean {
  return Boolean(payment.requestFolio) || payment.isFixed === true || payment.status === 'pagado'
}

function confirmedBatchTotal(payments: Payment[]): number {
  return payments
    .filter(hasConfirmedAmount)
    .reduce((total, payment) => total + payment.amount, 0)
}

const selectedBatchTotal = computed(() =>
  confirmedBatchTotal(selectedDay.value.paymentBatch),
)
const selectedPendingCaptureCount = computed(
  () => selectedDay.value.paymentBatch.filter((payment) => !hasConfirmedAmount(payment)).length,
)

const statusColor: Record<PaymentStatus, string> = {
  listo: 'success',
  variacion: 'warning',
  'falta-recibo': 'error',
  pagado: 'secondary',
}
const statusLabel: Record<PaymentStatus, string> = {
  listo: 'Listo para pagar',
  variacion: 'Revisar variación',
  'falta-recibo': 'Falta recibo',
  pagado: 'Pagado',
}

function moveMonth(offset: number) {
  focusDate.value = new Date(
    focusDate.value.getFullYear(),
    focusDate.value.getMonth() + offset,
    1,
  )
}

function goToToday() {
  const today = new Date()
  focusDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = today
}

function serviceIcon(service: string): string {
  const normalized = normalizeText(service)
  if (normalized.includes('cfe') || normalized.includes('luz')) return 'mdi-lightning-bolt'
  if (normalized.includes('agua')) return 'mdi-water'
  if (normalized.includes('internet') || normalized.includes('telmex')) return 'mdi-wifi'
  if (normalized.includes('cable') || normalized.includes('izzi')) return 'mdi-television-classic'
  if (normalized.includes('limpieza')) return 'mdi-broom'
  return 'mdi-receipt-text-outline'
}

function daySummary(day: CalendarDay): string {
  const parts = [formatFullDate(day.date)]
  if (day.isFriday) parts.push('día de pago')
  if (day.payments.length) parts.push(`${day.payments.length} vencimientos`)
  if (day.paymentBatch.length) parts.push(`${day.paymentBatch.length} pagos programados`)
  return parts.join(', ')
}

function clearFilters() {
  serviceFilter.value = 'Todos'
  branchFilter.value = 'Todas'
}

function selectDay(day: CalendarDay) {
  selectedDate.value = day.date
  if (!day.isCurrentMonth) {
    focusDate.value = new Date(day.date.getFullYear(), day.date.getMonth(), 1)
  }
}
</script>

<template>
  <div class="calendar-page">
    <header class="calendar-heading">
      <div>
        <h1>Calendario de pagos y vencimientos</h1>
        <span>Anticipa vencimientos y organiza los pagos del periodo.</span>
      </div>
      <v-btn class="today-button" prepend-icon="mdi-calendar-today" variant="flat" @click="goToToday">
        Ir a hoy
      </v-btn>
    </header>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>

    <v-card class="calendar-shell" elevation="0">
      <div class="calendar-toolbar">
        <div class="d-flex align-center ga-2">
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            density="comfortable"
            aria-label="Mes anterior"
            @click="moveMonth(-1)"
          />
          <div class="month-title">
            {{ monthNames[focusDate.getMonth()] }}
            <span>{{ focusDate.getFullYear() }}</span>
          </div>
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            density="comfortable"
            aria-label="Mes siguiente"
            @click="moveMonth(1)"
          />
          <v-chip class="month-count" color="primary" size="small" variant="tonal">
            <v-icon start icon="mdi-calendar-check-outline" />
            {{ filteredPayments.length }} compromisos
          </v-chip>
        </div>

        <div class="calendar-filters">
          <v-select
            v-model="serviceFilter"
            :items="serviceOptions"
            label="Servicio"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-select
            v-model="branchFilter"
            :items="branchOptions"
            label="Sucursal"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-tooltip text="Limpiar filtros" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-filter-off-outline"
                variant="tonal"
                color="secondary"
                density="comfortable"
                :disabled="serviceFilter === 'Todos' && branchFilter === 'Todas'"
                aria-label="Limpiar filtros"
                @click="clearFilters"
              />
            </template>
          </v-tooltip>
        </div>
      </div>

      <div class="calendar-legend">
        <span><i class="legend-dot due" /> Fecha límite</span>
        <span><i class="legend-dot payday" /> Viernes de pago</span>
        <span><i class="legend-dot attention" /> Requiere atención</span>
      </div>

      <div v-if="store.loading" class="pa-10 text-center">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else class="calendar-layout">
        <section class="calendar-grid-wrap">
          <div class="calendar-weekdays">
            <div v-for="weekDay in weekDays" :key="weekDay">{{ weekDay }}</div>
          </div>

          <div
            class="calendar-grid"
            :style="{ gridTemplateRows: `repeat(${weekCount}, minmax(68px, 1fr))` }"
          >
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              class="calendar-day"
              :aria-label="daySummary(day)"
              :title="daySummary(day)"
              :class="{
                'is-outside': !day.isCurrentMonth,
                'is-today': day.isToday,
                'is-selected': sameDate(day.date, selectedDate),
                'is-friday': day.isFriday,
              }"
              @click="selectDay(day)"
            >
              <div class="day-heading">
                <span class="day-number">{{ day.date.getDate() }}</span>
                <span v-if="day.isToday" class="today-label">HOY</span>
              </div>

              <div v-if="day.isFriday" class="payday-banner">
                <v-icon icon="mdi-wallet-outline" size="14" />
                <span>Día de pago</span>
              </div>

              <div v-if="day.paymentBatch.length" class="batch-summary">
                <strong v-if="confirmedBatchTotal(day.paymentBatch)">
                  {{ formatCurrency(confirmedBatchTotal(day.paymentBatch)) }}
                </strong>
                <strong v-else>Por capturar</strong>
                <span>{{ day.paymentBatch.length }} por pagar</span>
              </div>

              <div class="day-events">
                <div
                  v-for="payment in day.payments.slice(0, 2)"
                  :key="payment.id"
                  class="due-event"
                  :class="`status-${payment.status}`"
                >
                  <span class="event-main">
                    <v-icon :icon="serviceIcon(payment.service)" size="12" />
                    <span class="event-service">{{ payment.service }}</span>
                  </span>
                  <span class="event-branch">{{ payment.branch }}</span>
                </div>
                <span v-if="day.payments.length > 2" class="more-events">
                  +{{ day.payments.length - 2 }} más
                </span>
              </div>
            </button>
          </div>
        </section>
        <aside class="day-panel">
          <v-card class="detail-dialog" elevation="0">
        <v-card-item class="detail-dialog-header">
          <template #prepend>
            <div class="detail-date-icon">
              <span>{{ selectedDay.date.getDate() }}</span>
              <small>{{ monthNames[selectedDay.date.getMonth()].slice(0, 3) }}</small>
            </div>
          </template>
          <v-card-title class="text-capitalize">{{ formatFullDate(selectedDay.date) }}</v-card-title>
          <v-card-subtitle>Detalle operativo del calendario</v-card-subtitle>
        </v-card-item>

        <v-divider />

        <v-card-text class="detail-dialog-content">
          <div v-if="selectedDay.isFriday" class="selected-payday">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon icon="mdi-wallet-outline" color="primary" />
              <strong>Jornada de pagos</strong>
            </div>
            <div class="d-flex justify-space-between align-end">
              <span class="text-caption text-medium-emphasis">
                {{ selectedDay.paymentBatch.length }} compromisos
              </span>
              <strong v-if="selectedBatchTotal" class="text-h6 text-primary">
                {{ formatCurrency(selectedBatchTotal) }}
              </strong>
              <strong v-else class="text-body-2 text-primary">Monto por capturar</strong>
            </div>
            <div v-if="selectedPendingCaptureCount" class="capture-note">
              {{ selectedPendingCaptureCount }} importe{{
                selectedPendingCaptureCount === 1 ? '' : 's'
              }}
              pendiente{{ selectedPendingCaptureCount === 1 ? '' : 's' }} de solicitud.
            </div>
          </div>

          <div v-if="selectedDay.paymentBatch.length" class="panel-section">
            <p class="panel-section-title">Preparar para este viernes</p>
            <div
              v-for="payment in selectedDay.paymentBatch"
              :key="`batch-${payment.id}`"
              class="payment-row"
            >
              <div class="payment-icon">
                <v-icon :icon="serviceIcon(payment.service)" size="18" />
              </div>
              <div class="payment-info">
                <strong>{{ payment.service }}</strong>
                <span>
                  {{ payment.branch }} · vence {{ formatShortDate(parseDueDate(payment.dueDate)) }}
                </span>
              </div>
              <div class="payment-amount">
                <strong v-if="hasConfirmedAmount(payment)">
                  {{ formatCurrency(payment.amount) }}
                </strong>
                <strong v-else class="pending-amount">Por capturar</strong>
                <v-chip :color="statusColor[payment.status]" size="x-small" variant="tonal">
                  {{ statusLabel[payment.status] }}
                </v-chip>
              </div>
            </div>
          </div>

          <div v-if="selectedDay.payments.length" class="panel-section">
            <p class="panel-section-title">Vencen este día</p>
            <div
              v-for="payment in selectedDay.payments"
              :key="`due-${payment.id}`"
              class="payment-row"
            >
              <div class="payment-icon due-icon">
                <v-icon :icon="serviceIcon(payment.service)" size="18" />
              </div>
              <div class="payment-info">
                <strong>{{ payment.service }}</strong>
                <span>{{ payment.branch }}</span>
              </div>
              <div class="payment-amount">
                <strong v-if="hasConfirmedAmount(payment)">
                  {{ formatCurrency(payment.amount) }}
                </strong>
                <strong v-else class="pending-amount">Por capturar</strong>
                <v-chip :color="statusColor[payment.status]" size="x-small" variant="tonal">
                  {{ statusLabel[payment.status] }}
                </v-chip>
              </div>
            </div>
          </div>

          <div
            v-if="!selectedDay.paymentBatch.length && !selectedDay.payments.length"
            class="empty-day"
          >
            <v-icon icon="mdi-calendar-blank-outline" size="42" color="primary" />
            <strong>Sin compromisos registrados</strong>
            <span>
              {{
                selectedDay.isFriday
                  ? 'Viernes disponible para revisión y cierre semanal.'
                  : 'No existen vencimientos ni pagos programados para esta fecha.'
              }}
            </span>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-5 py-3">
          <v-icon icon="mdi-information-outline" color="info" size="18" />
          <span class="dialog-rule">
            Los vencimientos se preparan el viernes anterior para evitar pagos fuera de fecha.
          </span>
        </v-card-actions>
      </v-card>
        </aside>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.calendar-page {
  --calendar-border: rgba(var(--v-border-color), 0.14);
  --petroil-blue: #075f99;
  --petroil-blue-dark: #123c56;
  --petroil-cyan: #1594bf;
  --petroil-orange: #ff791f;
  --petroil-yellow: #f5ba24;

  min-height: calc(100vh - 126px);
  margin: -24px;
  padding: 16px 24px 24px;
  background: #eaf5fa;
  color: #0c2f4d;
  font-family: Arial, Helvetica, sans-serif;
}

.calendar-heading {
  position: relative;
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 10px;
  padding-left: 18px;
}

.calendar-heading::before {
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

.calendar-heading h1 {
  margin: 0;
  color: #123c56;
  font-size: clamp(1.28rem, 1.8vw, 1.6rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.calendar-heading span {
  display: block;
  margin-top: 3px;
  color: #607b8d;
  font-size: 0.8rem;
}

.today-button {
  min-height: 36px;
  border-radius: 8px !important;
  background: linear-gradient(135deg, #ff8a2b, #f36b1b) !important;
  box-shadow: 0 5px 12px rgb(243 107 27 / 22%);
  color: #fff !important;
  font-size: 0.75rem;
  font-weight: 700;
}

.calendar-shell {
  border: 1px solid #d5e6ee;
  border-top: 4px solid #1685b3;
  border-radius: 14px !important;
  overflow: hidden;
  background: rgb(255 255 255 / 94%);
  box-shadow:
    0 12px 32px rgba(var(--v-theme-secondary), 0.07),
    0 2px 8px rgba(var(--v-theme-on-surface), 0.04);
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 14px;
  background: linear-gradient(110deg, #dceef6, #f4f9fb 68%);
  border-bottom: 1px solid var(--calendar-border);
}

.calendar-toolbar :deep(.v-btn) {
  color: var(--petroil-blue);
}

.calendar-filters :deep(.v-field) {
  border-radius: 8px;
  background: rgb(255 255 255 / 88%);
  color: var(--petroil-blue-dark);
}

.calendar-filters :deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgb(7 95 153 / 12%);
}

.month-title {
  min-width: 160px;
  color: #123c56;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  text-transform: capitalize;
}

.month-title span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-weight: 500;
}

.calendar-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(145px, 180px)) auto;
  gap: 12px;
  align-items: center;
}

.month-count {
  margin-left: 6px;
  font-weight: 700;
}

.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 7px 18px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.75rem;
  background: #f8fbfc;
  border-bottom: 1px solid var(--calendar-border);
}

.calendar-legend span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.legend-dot.due {
  background: var(--petroil-orange);
}

.legend-dot.payday {
  background: var(--petroil-blue);
}

.legend-dot.attention {
  background: var(--petroil-yellow);
}

.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  background:
    radial-gradient(circle at 82% 8%, rgba(var(--v-theme-primary), 0.055), transparent 26%),
    rgb(var(--v-theme-surface));
}

.calendar-grid-wrap {
  min-width: 0;
  border-right: 1px solid var(--calendar-border);
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-grid {
  height: clamp(410px, calc(100vh - 365px), 650px);
}

.calendar-weekdays {
  min-height: 32px;
  background:
    linear-gradient(90deg, #d8edf6, #eef6fa 65%, #fff7e7),
    #fff;
  border-bottom: 1px solid var(--calendar-border);
}

.calendar-weekdays div {
  padding: 7px 8px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.7rem;
  font-weight: 800;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.calendar-weekdays div:nth-child(5) {
  color: #d65d10;
  background: #fff0e5;
}

.calendar-weekdays div:nth-child(6),
.calendar-weekdays div:nth-child(7) {
  color: rgba(var(--v-theme-on-surface), 0.42);
}

.calendar-day {
  position: relative;
  min-height: 0;
  padding: 4px 6px;
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  background: rgb(var(--v-theme-surface));
  border: 0;
  border-right: 1px solid var(--calendar-border);
  border-bottom: 1px solid var(--calendar-border);
  cursor: pointer;
  transition:
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.calendar-day:nth-child(7n) {
  border-right: 0;
}

.calendar-day:hover {
  z-index: 1;
  background: #eef8fc;
  box-shadow: inset 0 0 0 1px rgb(21 148 191 / 35%);
  transform: translateY(-1px);
}

.calendar-day.is-outside {
  color: rgba(var(--v-theme-on-surface), 0.32);
  background: rgba(var(--v-theme-on-surface), 0.018);
}

.calendar-day.is-friday {
  background:
    linear-gradient(180deg, #fff4e9, transparent 72%),
    #fff;
  border-top: 2px solid var(--petroil-orange);
}

.calendar-day.is-selected {
  z-index: 2;
  background:
    linear-gradient(145deg, #e1f2f9, #fff 68%);
  box-shadow:
    inset 0 0 0 2px var(--petroil-blue),
    0 7px 18px rgb(7 95 153 / 13%);
}

.day-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.day-number {
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 50%;
}

.is-today .day-number {
  color: #fff;
  background: var(--petroil-blue);
}

.today-label {
  color: var(--petroil-orange);
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.payday-banner {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
  color: #d65d10;
  font-size: 0.65rem;
  font-weight: 800;
}

.is-selected .payday-banner {
  transform: translateX(2px);
}

.batch-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
  padding: 3px 5px;
  margin-bottom: 3px;
  color: var(--petroil-blue-dark);
  background: #e2f2f8;
  border-radius: 6px;
}

.batch-summary strong {
  overflow: hidden;
  font-size: 0.68rem;
  text-overflow: ellipsis;
}

.batch-summary span {
  flex-shrink: 0;
  font-size: 0.56rem;
}

.day-events {
  display: grid;
  gap: 4px;
}

.due-event {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 3px 5px;
  font-size: 0.61rem;
  line-height: 1.2;
  background: #fff1e7;
  border-left: 3px solid var(--petroil-orange);
  border-radius: 4px;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.calendar-day:hover .due-event {
  box-shadow: 0 3px 8px rgba(var(--v-theme-on-surface), 0.07);
  transform: translateX(2px);
}

.due-event.status-variacion {
  background: rgba(var(--v-theme-warning), 0.12);
  border-left-color: rgb(var(--v-theme-warning));
}

.due-event.status-falta-recibo {
  background: rgba(var(--v-theme-error), 0.1);
  border-left-color: rgb(var(--v-theme-error));
}

.due-event.status-pagado {
  opacity: 0.58;
}

.event-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 3px;
}

.event-service {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-branch {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-events {
  padding-left: 7px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.62rem;
  font-weight: 800;
}

.selected-payday {
  padding: 14px;
  background: linear-gradient(135deg, #e6f4f9, #fff8e8);
  border: 1px solid #bcdce9;
  border-radius: 10px;
}

.capture-note {
  padding-top: 8px;
  margin-top: 9px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.68rem;
  border-top: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.panel-section {
  margin-top: 22px;
}

.panel-section-title {
  margin-bottom: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.payment-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--calendar-border);
}

.payment-icon {
  display: grid;
  width: 32px;
  height: 32px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
  place-items: center;
}

.payment-icon.due-icon {
  color: rgb(var(--v-theme-secondary));
  background: rgba(var(--v-theme-secondary), 0.1);
}

.payment-info,
.payment-amount {
  display: flex;
  flex-direction: column;
}

.payment-info {
  min-width: 0;
}

.payment-info strong,
.payment-info span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-info strong,
.payment-amount strong {
  font-size: 0.78rem;
}

.payment-info span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.66rem;
}

.payment-amount {
  align-items: flex-end;
  gap: 3px;
}

.pending-amount {
  color: rgb(var(--v-theme-warning));
  font-size: 0.7rem !important;
}

.empty-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 44px 12px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-align: center;
}

.empty-day strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
}

.empty-day span {
  max-width: 240px;
  font-size: 0.75rem;
}

.detail-dialog {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: rgba(var(--v-theme-surface), 0.96);
  border-radius: 0;
}

.detail-dialog-header {
  flex: 0 0 auto;
  padding: 10px 12px;
  background:
    linear-gradient(120deg, #dceef6, #fff 60%);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.detail-date-icon {
  display: grid;
  width: 42px;
  height: 44px;
  color: rgb(var(--v-theme-on-primary));
  text-align: center;
  background: linear-gradient(145deg, var(--petroil-blue), #087eb2);
  border-radius: 10px;
  box-shadow: 0 7px 18px rgba(var(--v-theme-primary), 0.24);
  place-content: center;
}

.detail-date-icon span {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1;
}

.detail-date-icon small {
  margin-top: 3px;
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
}

.detail-dialog-content {
  flex: 1 1 auto;
  min-height: 0;
  padding: 11px 12px;
  overflow-y: auto;
}

.dialog-rule {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.66rem;
}

.day-panel {
  height: calc(clamp(410px, calc(100vh - 365px), 650px) + 32px);
  min-width: 0;
}

@media (max-width: 760px) {
  .calendar-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .calendar-filters {
    grid-template-columns: 1fr 1fr auto;
  }

  .month-count {
    display: none;
  }

  .calendar-grid-wrap {
    overflow-x: auto;
    border-right: 0;
  }

  .calendar-weekdays,
  .calendar-grid {
    min-width: 760px;
  }

  .calendar-day {
    min-height: 104px;
  }

  .calendar-grid {
    height: auto;
  }

  .calendar-layout {
    grid-template-columns: 1fr;
  }

  .day-panel {
    height: auto;
    max-height: 420px;
    border-top: 1px solid var(--calendar-border);
  }
}
</style>
