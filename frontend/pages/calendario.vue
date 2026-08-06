<script setup lang="ts">
import type { CalendarEvent, Payment, PaymentStatus } from '~/types'
import {
  calendarDateKey,
  calendarEventOccursOn,
  eventOccurrenceForPaymentFriday,
  parseCalendarDate,
  previousOrSameFriday,
} from '~/utils/calendarEventDates'

interface CalendarDay {
  date: Date
  key: string
  isCurrentMonth: boolean
  isToday: boolean
  isFriday: boolean
  payments: Payment[]
  paymentBatch: Payment[]
  events: CalendarEvent[]
  eventBatch: Array<{ event: CalendarEvent; dueDate: Date }>
}

const store = usePaymentsStore()
const eventsStore = useCalendarEventsStore()
const route = useRoute()

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

function applyRouteSelection(): boolean {
  const requestedDate =
    typeof route.query.fecha === 'string' ? parseCalendarDate(route.query.fecha) : null
  if (!requestedDate) return false

  focusDate.value = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), 1)
  selectedDate.value = requestedDate
  return true
}

onMounted(async () => {
  await Promise.all([store.fetchPayments(), eventsStore.fetchEvents()])

  if (applyRouteSelection()) return

  const firstPending = store.items
    .filter((payment) => payment.status !== 'pagado')
    .map((payment) => parseDueDate(payment.dueDate))
    .sort((a, b) => a.getTime() - b.getTime())[0]

  if (firstPending) {
    focusDate.value = new Date(firstPending.getFullYear(), firstPending.getMonth(), 1)
    selectedDate.value = firstPending
  }
})

watch(
  () => [route.query.fecha, route.query.recordatorio],
  () => applyRouteSelection(),
)

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
  return calendarDateKey(date)
}

function sameDate(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

// Los recordatorios "mensual" no guardan una fecha fija, sino un día del mes
// (ajustado a meses cortos, ej. día 31 -> 28/29 en febrero); los "unico" sí
// tienen una fecha exacta. Se evalúan por celda del calendario, no por mes
// enfocado, porque la grilla incluye días de meses vecinos.
function eventsForDay(date: Date): CalendarEvent[] {
  return eventsStore.items.filter((event) => calendarEventOccursOn(event, date))
}

function eventBatchForFriday(friday: Date): Array<{ event: CalendarEvent; dueDate: Date }> {
  if (friday.getDay() !== 5) return []
  return eventsStore.items.flatMap((event) => {
    const dueDate = eventOccurrenceForPaymentFriday(event, friday)
    return dueDate ? [{ event, dueDate }] : []
  })
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

function formatPanelDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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
      events: eventsForDay(date),
      eventBatch: eventBatchForFriday(date),
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
      events: eventsForDay(selectedDate.value),
      eventBatch: eventBatchForFriday(selectedDate.value),
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
const highlightedEventId = computed(() =>
  typeof route.query.recordatorio === 'string' ? route.query.recordatorio : null,
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
  if (day.events.length) parts.push(`${day.events.length} recordatorios`)
  if (day.eventBatch.length) parts.push(`${day.eventBatch.length} recordatorios por preparar`)
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

const showEventDialog = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const deletingEventId = ref<string | null>(null)
const eventActionError = ref<string | null>(null)

function openNewEvent() {
  editingEvent.value = null
  showEventDialog.value = true
}

function openEditEvent(event: CalendarEvent) {
  editingEvent.value = event
  showEventDialog.value = true
}

async function removeEvent(event: CalendarEvent) {
  deletingEventId.value = event.id
  eventActionError.value = null
  try {
    await eventsStore.deleteEvent(event.id)
  } catch (e) {
    console.error('Error al eliminar el recordatorio:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    eventActionError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo eliminar el recordatorio.'
  } finally {
    deletingEventId.value = null
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
      <div class="d-flex ga-2">
        <v-btn
          class="new-reminder-button"
          variant="flat"
          prepend-icon="mdi-bell-plus-outline"
          @click="openNewEvent"
        >
          Nuevo recordatorio
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-calendar-today" variant="flat" @click="goToToday">
          Ir a hoy
        </v-btn>
      </div>
      </header>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>
    <v-alert v-if="eventsStore.error" type="error" variant="tonal" class="mb-4">
      {{ eventsStore.error }}
    </v-alert>
    <v-alert
      v-if="eventActionError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="eventActionError = null"
    >
      {{ eventActionError }}
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
            :menu-props="{ contentClass: 'calendar-filter-menu' }"
            label="Servicio"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-select
            v-model="branchFilter"
            :items="branchOptions"
            :menu-props="{ contentClass: 'calendar-filter-menu' }"
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
            :style="{ gridTemplateRows: `repeat(${weekCount}, minmax(54px, 1fr))` }"
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
                <span v-if="day.events.length" class="reminder-badge">
                  <v-icon icon="mdi-bell-outline" size="11" />
                  {{ day.events.length }}
                </span>
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
          <v-card-title class="text-capitalize">{{ formatPanelDate(selectedDay.date) }}</v-card-title>
          <v-card-subtitle>Detalle operativo del calendario</v-card-subtitle>
        </v-card-item>

        <v-divider />

        <v-card-text class="detail-dialog-content">
          <div v-if="selectedDay.isFriday" class="selected-payday">
            <div class="selected-payday__heading">
              <span class="selected-payday__icon">
                <v-icon icon="mdi-wallet-outline" size="18" />
              </span>
              <div>
                <strong>Jornada de pagos</strong>
                <small>Preparación semanal</small>
              </div>
            </div>
            <div class="selected-payday__summary">
              <div>
                <span>Compromisos</span>
                <strong>{{ selectedDay.paymentBatch.length + selectedDay.eventBatch.length }}</strong>
              </div>
              <div class="selected-payday__amount">
                <span>Monto programado</span>
                <strong v-if="selectedBatchTotal">{{ formatCurrency(selectedBatchTotal) }}</strong>
                <strong v-else>Por capturar</strong>
              </div>
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

          <div v-if="selectedDay.eventBatch.length" class="panel-section reminder-preparation">
            <p class="panel-section-title">Recordatorios por preparar este viernes</p>
            <div
              v-for="item in selectedDay.eventBatch"
              :key="`event-batch-${item.event.id}`"
              class="payment-row"
            >
              <div class="payment-icon reminder-icon">
                <v-icon icon="mdi-bell-check-outline" size="18" />
              </div>
              <div class="payment-info">
                <strong>{{ item.event.tipoPago }} · {{ item.event.casaNombre }}</strong>
                <span>Fecha del recordatorio: {{ formatShortDate(item.dueDate) }}</span>
                <small v-if="item.event.nota">{{ item.event.nota }}</small>
              </div>
              <v-chip color="secondary" size="x-small" variant="tonal">Preparar</v-chip>
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

          <div v-if="selectedDay.events.length" class="panel-section">
            <p class="panel-section-title">Recordatorios</p>
            <div
              v-for="event in selectedDay.events"
              :key="`event-${event.id}`"
              class="payment-row reminder-row"
              :class="{ 'reminder-row--highlighted': highlightedEventId === event.id }"
            >
              <div class="payment-icon">
                <v-icon icon="mdi-bell-outline" size="18" />
              </div>
              <div class="payment-info">
                <strong>{{ event.tipoPago }} · {{ event.casaNombre }}</strong>
                <span>
                  {{ event.recurrencia === 'mensual' ? 'Cada mes' : 'Único' }}
                  <template v-if="event.nota"> · {{ event.nota }}</template>
                </span>
                <small>Fecha: {{ formatShortDate(selectedDay.date) }}</small>
              </div>
              <div class="d-flex ga-1">
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="x-small"
                  density="comfortable"
                  @click="openEditEvent(event)"
                />
                <v-btn
                  icon="mdi-trash-can-outline"
                  variant="text"
                  size="x-small"
                  density="comfortable"
                  :loading="deletingEventId === event.id"
                  @click="removeEvent(event)"
                />
              </div>
            </div>
          </div>

          <div
            v-if="
              !selectedDay.paymentBatch.length &&
              !selectedDay.payments.length &&
              !selectedDay.events.length &&
              !selectedDay.eventBatch.length
            "
            class="empty-day"
          >
            <span class="empty-day__icon">
              <v-icon icon="mdi-calendar-blank-outline" size="28" />
            </span>
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
        <v-card-actions class="detail-dialog-footer">
          <span class="detail-dialog-footer__icon">
            <v-icon icon="mdi-information-outline" size="16" />
          </span>
          <span class="dialog-rule">
            Los vencimientos se preparan el viernes anterior para evitar pagos fuera de fecha.
          </span>
        </v-card-actions>
      </v-card>
        </aside>
      </div>
    </v-card>

    <CalendarEventFormDialog v-model="showEventDialog" :editing-event="editingEvent" />

    
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

.calendar-page :deep(.v-btn),
.calendar-page :deep(.v-field),
.calendar-page :deep(.v-chip),
.calendar-page :deep(.v-card),
.calendar-page :deep(.v-card-title),
.calendar-page :deep(.v-card-subtitle) {
  font-family: Arial, Helvetica, sans-serif !important;
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
  padding-inline: 17px !important;
  border-radius: 8px !important;
  background: linear-gradient(135deg, #ff8a2b, #f36b1b) !important;
  box-shadow: 0 5px 12px rgb(243 107 27 / 22%);
  color: #fff !important;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-transform: none;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.today-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 17px rgb(243 107 27 / 28%);
}

.calendar-shell {
  border: 1px solid #d5e6ee;
  border-top: 4px solid #1685b3;
  border-radius: 18px !important;
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
  gap: 9px;
  padding: 6px 11px;
  background: #d5eaf3;
  border-bottom: 1px solid var(--calendar-border);
}

.calendar-toolbar :deep(.v-btn) {
  color: var(--petroil-blue);
}

.calendar-toolbar > div:first-child :deep(.v-btn--icon) {
  width: 30px;
  height: 30px;
  border: 1px solid #c5dce7;
  border-radius: 9px;
  background: rgb(255 255 255 / 72%);
  box-shadow: none;
}

.calendar-toolbar > div:first-child :deep(.v-btn--icon:hover) {
  border-color: #82b5cc;
  background: #fff;
}

.calendar-filters :deep(.v-field) {
  min-height: 34px;
  border: 1px solid #c8dce7;
  border-radius: 8px;
  background: rgb(255 255 255 / 88%);
  color: var(--petroil-blue-dark);
}

.calendar-filters :deep(.v-field__input) {
  min-height: 34px;
  padding-top: 3px;
  padding-bottom: 3px;
  font-size: 0.74rem;
  font-weight: 500;
}

.calendar-filters :deep(.v-label) {
  color: #668296;
  font-size: 0.68rem;
}

.calendar-filters > :deep(.v-btn) {
  width: 34px;
  height: 34px;
  border: 1px solid #c8dce7;
  border-radius: 9px;
  background: #edf6fa;
  box-shadow: none;
}

.calendar-filters :deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgb(7 95 153 / 12%);
}

.month-title {
  min-width: 132px;
  color: #123c56;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  text-transform: capitalize;
}

.month-title span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-weight: 400;
}

.calendar-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 154px)) auto;
  gap: 7px;
  align-items: center;
}

.month-count {
  margin-left: 3px;
  border: 1px solid #f1ddc8;
  background: #fff4e9 !important;
  color: #d86618 !important;
  font-size: 0.68rem;
  font-weight: 600;
}

.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 5px 15px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.7rem;
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
  grid-template-columns: minmax(0, 1fr) minmax(238px, 270px);
  background: #d5eaf3;
}

.calendar-grid-wrap {
  min-width: 0;
  border-right: 1px solid #c9dfe9;
  background: #d5eaf3;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-grid {
  height: clamp(390px, calc(100vh - 350px), 625px);
  gap: 3px;
  padding: 4px;
  background: #d5eaf3;
}

.calendar-weekdays {
  min-height: 32px;
  gap: 3px;
  padding: 4px;
  background: #d5eaf3;
  border-bottom: 1px solid var(--calendar-border);
}

.calendar-weekdays div {
  padding: 6px 8px;
  border-radius: 8px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.7rem;
  font-weight: 700;
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
  padding: 5px 7px;
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  background: rgb(255 255 255 / 92%);
  border: 1px solid #d4e3ea;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.calendar-day:nth-child(7n) {
  border-right: 1px solid #d4e3ea;
}

.calendar-day:hover {
  z-index: 3;
  border-color: #72b4d0;
  background: #fff;
  box-shadow: 0 8px 18px rgb(7 95 153 / 15%);
  transform: translateY(-3px);
}

.calendar-day.is-outside {
  color: rgba(var(--v-theme-on-surface), 0.32);
  border-color: rgb(210 227 235 / 58%);
  background: rgb(244 249 251 / 62%);
  box-shadow: none;
}

.calendar-day.is-friday {
  background:
    linear-gradient(155deg, #fff3e8, #fff 72%);
  border-color: #f3c39f;
  box-shadow: inset 0 3px 0 var(--petroil-orange);
}

.calendar-day.is-selected {
  z-index: 2;
  overflow: hidden;
  border-color: #0872a5;
  background: linear-gradient(145deg, #cfeaf6, #eaf6fb 58%, #fff 100%);
  box-shadow:
    0 0 0 2px rgb(7 95 153 / 13%),
    0 10px 22px rgb(7 95 153 / 22%);
  transform: translateY(-2px);
}

.calendar-day.is-selected::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(90deg, #075f99, #1594bf);
  content: '';
}

.day-heading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  margin-bottom: 3px;
}

.day-number {
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 50%;
}

.is-today .day-number {
  color: #fff;
  background: var(--petroil-blue);
  box-shadow: 0 4px 10px rgb(7 95 153 / 24%);
}

.today-label {
  padding: 2px 5px;
  border-radius: 99px;
  color: var(--petroil-orange);
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.reminder-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border-radius: 99px;
  background: rgb(var(--v-theme-secondary), 0.12);
  color: rgb(var(--v-theme-secondary));
  font-size: 0.62rem;
  font-weight: 800;
}

.payday-banner {
  display: flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  padding: 3px 6px;
  margin-bottom: 4px;
  border: 1px solid #f4d2b9;
  border-radius: 7px;
  background: rgb(255 245 236 / 88%);
  color: #d65d10;
  font-size: 0.65rem;
  font-weight: 600;
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
  border: 1px solid #c8e2ed;
  border-radius: 8px;
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
  border-radius: 7px;
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
  overflow: hidden;
  padding: 12px;
  border: 1px solid #bcdce9;
  border-radius: 12px;
  background: linear-gradient(145deg, #e8f5fa, #fff 58%, #fff7e8);
  box-shadow: 0 6px 14px rgb(7 95 153 / 7%);
}

.selected-payday__heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
}

.selected-payday__heading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.selected-payday__heading strong {
  color: #123c56;
  font-size: 0.78rem;
  font-weight: 700;
}

.selected-payday__heading small {
  margin-top: 1px;
  color: #718797;
  font-size: 0.59rem;
}

.selected-payday__icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border-radius: 9px;
  place-items: center;
  background: linear-gradient(145deg, #ff8a2b, #f36b1b);
  box-shadow: 0 5px 10px rgb(243 107 27 / 18%);
  color: #fff;
}

.selected-payday__summary {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 7px;
}

.selected-payday__summary > div {
  display: flex;
  min-width: 0;
  min-height: 55px;
  padding: 8px 9px;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #d0e5ee;
  border-radius: 9px;
  background: rgb(255 255 255 / 78%);
}

.selected-payday__summary span {
  overflow: hidden;
  color: #718797;
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-payday__summary strong {
  overflow: hidden;
  margin-top: 3px;
  color: #075f99;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-payday__amount strong {
  color: #df681a;
  font-size: 0.74rem;
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

.payment-icon.reminder-icon {
  color: #c76518;
  background: #fff0e4;
}

.reminder-preparation {
  padding: 12px;
  border: 1px solid #f4d2b8;
  border-radius: 11px;
  background: #fffaf6;
}

.reminder-row {
  padding-right: 8px;
  padding-left: 8px;
  border-radius: 9px;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.reminder-row--highlighted {
  background: #fff0e4;
  box-shadow: inset 3px 0 0 #ff791f;
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

.payment-info small {
  margin-top: 2px;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.62rem;
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
  gap: 7px;
  padding: 22px 12px;
  margin-top: 11px;
  border: 1px dashed #c7dfe9;
  border-radius: 12px;
  background: linear-gradient(145deg, #f7fbfc, #fff);
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-align: center;
}

.empty-day strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.82rem;
  font-weight: 600;
}

.empty-day__icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 3px;
  border-radius: 14px;
  place-items: center;
  background: #fff0e6;
  box-shadow: inset 0 0 0 1px #f7d8c3;
  color: #ff791f;
}

.empty-day span {
  max-width: 240px;
  font-size: 0.7rem;
  line-height: 1.45;
}

.detail-dialog {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #c7dfe9;
  border-radius: 14px !important;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 9px 22px rgb(7 95 153 / 10%);
}

.detail-dialog-header {
  flex: 0 0 auto;
  padding: 10px 12px;
  background:
    linear-gradient(120deg, #dceef6, #fff 60%);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.empty-day > span:last-child {
  color: #718797;
}

.detail-dialog-header :deep(.v-card-title) {
  display: -webkit-box;
  overflow: hidden;
  color: #123c56;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.detail-dialog-header :deep(.v-card-subtitle) {
  margin-top: 3px;
  color: #6b8292;
  font-size: 0.68rem;
  font-weight: 400;
}

.detail-date-icon {
  display: grid;
  width: 39px;
  height: 41px;
  color: rgb(var(--v-theme-on-primary));
  text-align: center;
  background: linear-gradient(145deg, var(--petroil-blue), #087eb2);
  border-radius: 12px;
  box-shadow: 0 7px 18px rgba(var(--v-theme-primary), 0.24);
  place-content: center;
}

.detail-date-icon span {
  font-size: 1rem;
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

.detail-dialog-footer {
  display: flex;
  min-height: 48px;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 11px !important;
  background: #f7fbfc;
}

.detail-dialog-footer__icon {
  display: grid;
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  border-radius: 8px;
  place-items: center;
  background: #e2f2f8;
  color: #0872a5;
}

.dialog-rule {
  display: block;
  padding-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.6rem;
  line-height: 1.4;
}

.day-panel {
  height: calc(clamp(390px, calc(100vh - 350px), 625px) + 32px);
  min-width: 0;
  padding: 6px 6px 6px 5px;
  background: #d5eaf3;
}

@media (max-width: 1180px) {
  .month-count {
    display: none;
  }

  .calendar-layout {
    grid-template-columns: minmax(0, 1fr) 238px;
  }

  .calendar-filters {
    grid-template-columns: repeat(2, minmax(110px, 138px)) auto;
  }
}

@media (max-height: 820px) and (min-width: 761px) {
  .calendar-heading {
    min-height: 38px;
    margin-bottom: 7px;
  }

  .calendar-grid {
    height: calc(100vh - 332px);
    min-height: 365px;
  }

  .day-panel {
    height: calc(100vh - 300px);
    min-height: 397px;
  }
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
:global(.calendar-filter-menu) {
  overflow: hidden;
  border: 1px solid #8fc5d9;
  border-radius: 14px !important;
  background: #edf7fa !important;
  box-shadow: 0 14px 30px rgb(7 70 112 / 18%) !important;
}

.new-reminder-button {
  min-height: 42px;
  padding-inline: 18px !important;
  border: 1px solid #064f80;
  border-radius: 11px !important;
  background: #075f99 !important;
  box-shadow: 0 8px 18px rgb(7 71 112 / 25%);
  color: #fff !important;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: transform 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.new-reminder-button:hover {
  background: #064f80 !important;
  box-shadow: 0 11px 23px rgb(7 71 112 / 32%);
  transform: translateY(-1px);
}

.new-reminder-button :deep(.v-icon) {
  color: #fff !important;
}

:global(.calendar-filter-menu .v-list) {
  padding: 7px;
  background: #edf7fa !important;
}

:global(.calendar-filter-menu .v-list-item) {
  min-height: 40px;
  margin: 3px 0;
  border-radius: 9px;
  color: #17445f;
  font-size: 0.76rem;
}

:global(.calendar-filter-menu .v-list-item:hover) {
  background: #d8edf5 !important;
}

:global(.calendar-filter-menu .v-list-item--active) {
  background: #c2e2ef !important;
  color: #075f99 !important;
  font-weight: 700;
}

:global(.calendar-filter-menu .v-list-item__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}
</style>
