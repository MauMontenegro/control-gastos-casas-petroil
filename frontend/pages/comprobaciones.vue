<script setup lang="ts">
import type {
  ComprobacionStatus,
  FundRequest,
  FundRequestConceptDetail,
  TipoNegocio,
  UpdateFundRequestConceptPayload,
} from '~/types'
import { expenseTypeOptions } from '~/utils/fundRequestOptions'
import { cardOptions } from '~/utils/cardOptions'

interface ComprobacionEntry {
  request: FundRequest
  concept: FundRequestConceptDetail
  empresa: string
}

const requestsStore = useRequestsStore()
const casasStore = useCasasStore()
const config = useRuntimeConfig()

const tipoNegocioOptions: TipoNegocio[] = [
  'Distribuidora',
  'Negocios Asociados',
  'Distribuidora y Negocios Asociados',
  'COPE',
]

const comprobacionStatusOptions: { title: string; value: ComprobacionStatus }[] = [
  { title: 'Pendiente', value: 'pendiente' },
  { title: 'Enviada', value: 'enviada' },
  { title: 'Autorizada', value: 'autorizada' },
  { title: 'Rechazada', value: 'rechazada' },
]
const comprobacionStatusColor: Record<ComprobacionStatus, string> = {
  pendiente: 'default',
  enviada: 'info',
  autorizada: 'success',
  rechazada: 'error',
}
const comprobacionStatusIcon: Record<ComprobacionStatus, string> = {
  pendiente: 'mdi-clock-outline',
  enviada: 'mdi-check-circle-outline',
  autorizada: 'mdi-shield-check-outline',
  rechazada: 'mdi-alert-circle-outline',
}

onMounted(() => {
  requestsStore.fetchRequests()
  if (casasStore.items.length === 0) casasStore.fetchCasas()
})

function documentHref(documentUrl: string): string {
  const apiBase = (config.public.apiBaseUrl as string).replace(/\/$/, '')
  const path = documentUrl.startsWith('/api/') ? documentUrl.slice(4) : documentUrl
  return `${apiBase}${path}`
}

function empresaForCasa(casaNombre: string): string {
  return casasStore.items.find((c) => c.nombre === casaNombre)?.empresa ?? '—'
}

// Los conceptos de solicitudes autorizadas SON las comprobaciones — nada de
// datos mock ni de copias locales: se lee/edita directo sobre los objetos
// del store (mismo patrón que Limpieza con los días trabajados), así cada
// cambio persiste de una vez contra el backend.
const realEntries = computed<ComprobacionEntry[]>(() =>
  requestsStore.items
    .filter((r) => r.status === 'autorizada')
    .flatMap((r) =>
      r.concepts.map((concept) => ({ request: r, concept, empresa: empresaForCasa(concept.casa) })),
    ),
)

// Registros visuales para trabajar el diseño mientras la API no tenga
// solicitudes autorizadas. Nunca se envían al backend.
const demoEntries = reactive<ComprobacionEntry[]>([
  {
    empresa: 'Abastecedora',
    request: {
      id: 'demo-request-1',
      folio: 'SOL-2026-0184',
      requiredDate: '2026-08-14',
      card: cardOptions[0] ?? '',
      total: 12450,
      status: 'autorizada',
      concepts: [],
    },
    concept: {
      id: 'demo-concept-1',
      expenseType: 'Luz',
      incrementType: 'Incremento temporal',
      casa: 'Casa Chihuahua',
      provider: 'CFE',
      amount: 12450,
      comment: 'Servicio correspondiente al periodo actual.',
      documentName: 'factura-cfe-agosto.pdf',
      documentUrl: '',
      grupoCentroCosto: 'Operaciones',
      centroCosto: 'CC-104',
      deducible: 'SI',
      tipoNegocio: 'Distribuidora',
      comprobacionStatus: 'pendiente',
    },
  },
  {
    empresa: 'Operadora',
    request: {
      id: 'demo-request-2',
      folio: 'SOL-2026-0187',
      requiredDate: '2026-08-18',
      card: cardOptions[1] ?? '',
      total: 8390,
      status: 'autorizada',
      concepts: [],
    },
    concept: {
      id: 'demo-concept-2',
      expenseType: 'Internet',
      incrementType: 'Incremento permanente',
      casa: 'Casa Juárez',
      provider: 'Telmex',
      amount: 8390,
      comment: 'Comprobante pendiente de validación.',
      documentName: 'comprobante-internet.pdf',
      documentUrl: '',
      grupoCentroCosto: 'Administración',
      centroCosto: 'CC-105',
      deducible: 'SI',
      tipoNegocio: 'Negocios Asociados',
      comprobacionStatus: 'enviada',
    },
  },
  {
    empresa: 'Abastecedora',
    request: {
      id: 'demo-request-3',
      folio: 'SOL-2026-0191',
      requiredDate: '2026-08-20',
      card: cardOptions[2] ?? '',
      total: 4720,
      status: 'autorizada',
      concepts: [],
    },
    concept: {
      id: 'demo-concept-3',
      expenseType: 'Agua',
      incrementType: 'Incremento temporal',
      casa: 'Casa Chihuahua',
      provider: 'JMAS',
      amount: 4720,
      comment: 'Consumo de agua del mes de agosto.',
      documentName: 'recibo-agua-agosto.jpg',
      documentUrl: '',
      grupoCentroCosto: 'Operaciones',
      centroCosto: 'CC-104',
      deducible: 'SI',
      tipoNegocio: 'Distribuidora',
      comprobacionStatus: 'autorizada',
    },
  },
  {
    empresa: 'Petro Smart',
    request: {
      id: 'demo-request-4',
      folio: 'SOL-2026-0194',
      requiredDate: '2026-08-21',
      card: cardOptions[3] ?? '',
      total: 15600,
      status: 'autorizada',
      concepts: [],
    },
    concept: {
      id: 'demo-concept-4',
      expenseType: 'Limpieza',
      incrementType: 'Incremento permanente',
      casa: 'Casa Parral',
      provider: 'Servicios del Norte',
      amount: 15600,
      comment: 'Servicio mensual de limpieza de instalaciones.',
      documentName: 'factura-limpieza-0194.pdf',
      documentUrl: '',
      grupoCentroCosto: 'Servicios Generales',
      centroCosto: 'CC-109',
      deducible: 'SI',
      tipoNegocio: 'COPE',
      comprobacionStatus: 'pendiente',
    },
  },
  {
    empresa: 'Operadora',
    request: {
      id: 'demo-request-5',
      folio: 'SOL-2026-0198',
      requiredDate: '2026-08-24',
      card: cardOptions[2] ?? '',
      total: 2980,
      status: 'autorizada',
      concepts: [],
    },
    concept: {
      id: 'demo-concept-5',
      expenseType: 'Gas',
      incrementType: 'Incremento temporal',
      casa: 'Casa Delicias',
      provider: 'Gas Natural',
      amount: 2980,
      comment: 'Recarga extraordinaria para operación.',
      documentName: 'ticket-gas-0198.png',
      documentUrl: '',
      grupoCentroCosto: 'Mantenimiento',
      centroCosto: 'CC-110',
      deducible: 'NO',
      tipoNegocio: 'Negocios Asociados',
      comprobacionStatus: 'rechazada',
    },
  },
  {
    empresa: 'Abastecedora',
    request: {
      id: 'demo-request-6',
      folio: 'SOL-2026-0202',
      requiredDate: '2026-08-27',
      card: cardOptions[0] ?? '',
      total: 22150,
      status: 'autorizada',
      concepts: [],
    },
    concept: {
      id: 'demo-concept-6',
      expenseType: 'Cable',
      incrementType: 'Incremento permanente',
      casa: 'Casa Gómez Palacio',
      provider: 'Megacable',
      amount: 22150,
      comment: 'Renovación anual del servicio.',
      documentName: 'orden-servicio-cable.pdf',
      documentUrl: '',
      grupoCentroCosto: 'Tecnologías',
      centroCosto: 'CC-112',
      deducible: 'SI',
      tipoNegocio: 'Distribuidora y Negocios Asociados',
      comprobacionStatus: 'enviada',
    },
  },
])

const isDemoMode = computed(() => !requestsStore.loading && realEntries.value.length === 0)
const entries = computed<ComprobacionEntry[]>(() =>
  realEntries.value.length ? realEntries.value : isDemoMode.value ? demoEntries : [],
)

const filters = reactive({
  folioSolicitud: '',
  empresa: 'Todas',
  casa: 'Todas',
  sipp: 'no-enviados' as 'no-enviados' | 'enviados' | 'todos',
  dateFrom: '',
  dateTo: '',
})

const sippFilterOptions = [
  { title: 'No enviados', value: 'no-enviados' },
  { title: 'Enviados', value: 'enviados' },
  { title: 'Todos', value: 'todos' },
]

function clearFilters() {
  filters.folioSolicitud = ''
  filters.empresa = 'Todas'
  filters.casa = 'Todas'
  filters.sipp = 'no-enviados'
  filters.dateFrom = ''
  filters.dateTo = ''
}

const hasActiveFilters = computed(
  () =>
    !!filters.folioSolicitud ||
    filters.empresa !== 'Todas' ||
    filters.casa !== 'Todas' ||
    filters.sipp !== 'no-enviados' ||
    !!filters.dateFrom ||
    !!filters.dateTo,
)

const empresaOptions = computed(() => ['Todas', ...new Set(entries.value.map((e) => e.empresa))])
const casaOptions = computed(() => ['Todas', ...new Set(entries.value.map((e) => e.concept.casa))])

const filteredEntries = computed(() => {
  const folioSolTerm = filters.folioSolicitud.trim().toLocaleLowerCase('es')
  return entries.value.filter((entry) => {
    const folio = (entry.request.sippFolio || entry.request.folio).toLocaleLowerCase('es')
    if (folioSolTerm && !folio.includes(folioSolTerm)) return false
    if (filters.empresa !== 'Todas' && entry.empresa !== filters.empresa) return false
    if (filters.casa !== 'Todas' && entry.concept.casa !== filters.casa) return false
    const wasSent = (entry.concept.comprobacionStatus ?? 'pendiente') !== 'pendiente'
    if (filters.sipp === 'no-enviados' && wasSent) return false
    if (filters.sipp === 'enviados' && !wasSent) return false
    if (filters.dateFrom && entry.request.requiredDate < filters.dateFrom) return false
    if (filters.dateTo && entry.request.requiredDate > filters.dateTo) return false
    return true
  })
})

// Comprobaciones se agrupan por empresa/casa.
const groupedEntries = computed(() => {
  const groups = new Map<string, ComprobacionEntry[]>()
  for (const entry of filteredEntries.value) {
    const key = `${entry.empresa} · ${entry.concept.casa}`
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }))
})

const expandedGroups = ref<string[]>([])

watch(
  groupedEntries,
  (groups) => {
    const available = new Set(groups.map((group) => group.group))
    expandedGroups.value = expandedGroups.value.filter((group) => available.has(group))
    if (!expandedGroups.value.length && groups[0]) expandedGroups.value = [groups[0].group]
  },
  { immediate: true },
)

function toggleGroup(group: string) {
  expandedGroups.value = expandedGroups.value.includes(group)
    ? expandedGroups.value.filter((item) => item !== group)
    : [...expandedGroups.value, group]
}

const savingId = ref<string | null>(null)
const saveError = ref<string | null>(null)

async function saveConcept(entry: ComprobacionEntry, payload: UpdateFundRequestConceptPayload) {
  if (entry.request.id.startsWith('demo-')) {
    Object.assign(entry.concept, payload)
    return
  }
  savingId.value = entry.concept.id
  saveError.value = null
  try {
    await requestsStore.updateConcept(entry.request.id, entry.concept.id, payload)
  } catch (e) {
    console.error('Error al guardar la comprobación:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    saveError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar el cambio.'
  } finally {
    savingId.value = null
  }
}

const savingRequestId = ref<string | null>(null)

// La tarjeta vive en la solicitud, no en el concepto — como varios conceptos
// de esta pantalla pueden compartir la misma solicitud (misma `entry.request`
// por referencia), cambiarla aquí se refleja de una vez en todas sus tarjetas.
async function saveCard(entry: ComprobacionEntry, card: string) {
  entry.request.card = card
  if (entry.request.id.startsWith('demo-')) return
  savingRequestId.value = entry.request.id
  saveError.value = null
  try {
    await requestsStore.updateCard(entry.request.id, card)
  } catch (e) {
    console.error('Error al guardar la tarjeta:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    saveError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar la tarjeta.'
  } finally {
    savingRequestId.value = null
  }
}

const sippRunningId = ref<string | null>(null)
const sippNotice = reactive<Record<string, string>>({})

const confirmEntry = ref<ComprobacionEntry | null>(null)
const successMessage = ref('')

function isEntryComplete(entry: ComprobacionEntry): boolean {
  return Boolean(
    entry.request.card &&
      entry.concept.expenseType &&
      entry.concept.grupoCentroCosto?.trim() &&
      entry.concept.centroCosto?.trim() &&
      entry.concept.tipoNegocio &&
      entry.concept.documentName &&
      entry.concept.amount > 0,
  )
}

function requestSippConfirmation(entry: ComprobacionEntry) {
  confirmEntry.value = entry
}

async function confirmSippSend() {
  const entry = confirmEntry.value
  confirmEntry.value = null
  if (entry) await sendToSipp(entry)
}

async function sendToSipp(entry: ComprobacionEntry) {
  if (entry.request.id.startsWith('demo-')) {
    entry.concept.comprobacionStatus = 'enviada'
    successMessage.value = `${entry.request.folio} se marcó como enviada a SIPP.`
    return
  }
  sippRunningId.value = entry.concept.id
  sippNotice[entry.concept.id] = ''
  try {
    await requestsStore.sendConceptToSipp(entry.request.id, entry.concept.id)
    entry.concept.comprobacionStatus = 'enviada'
    sippNotice[entry.concept.id] = 'Enviado a SIPP correctamente.'
    successMessage.value = `${entry.request.sippFolio || entry.request.folio} se envió correctamente.`
  } catch (e) {
    console.error('Error al enviar el concepto a SIPP:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    sippNotice[entry.concept.id] =
      fetchError.data?.message || fetchError.message || 'No se pudo enviar a SIPP.'
  } finally {
    sippRunningId.value = null
  }
}
</script>

<template>
  <section class="comprobaciones-page">
    <header class="comprobaciones-heading">
      <div>
        <p>SOLICITUDES APROBADAS</p>
        <h1>Comprobaciones</h1>
        <span>
          Conceptos de solicitudes aprobadas, listos para capturarse como gasto por casa/empresa.
        </span>
      </div>
    </header>

    <div v-if="isDemoMode" class="demo-notice">
      <v-icon icon="mdi-eye-outline" size="18" />
      Vista de muestra para revisar el diseño. No modifica información real.
    </div>

    <v-alert v-if="requestsStore.error" type="error" variant="tonal" class="mb-4">
      {{ requestsStore.error }}
    </v-alert>
    <v-alert
      v-if="saveError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="saveError = null"
    >
      {{ saveError }}
    </v-alert>

    <div v-if="entries.length" class="comprobaciones-filter-bar">
      <div class="comprobaciones-filter-line">
        <label class="comprobaciones-search">
          <v-icon icon="mdi-magnify" size="23" />
          <input
            v-model="filters.folioSolicitud"
            type="search"
            placeholder="Buscar folio de solicitud..."
          />
          <span>{{ filteredEntries.length }} resultados</span>
        </label>

        <label class="filter-field filter-field--select">
          <span>Empresa</span>
          <v-select
            v-model="filters.empresa"
            :items="empresaOptions"
            :menu-props="{ contentClass: 'comprobaciones-filter-menu' }"
            aria-label="Empresa"
            density="compact"
            hide-details
          />
        </label>
        <label class="filter-field filter-field--select">
          <span>Sucursal</span>
          <v-select
            v-model="filters.casa"
            :items="casaOptions"
            :menu-props="{ contentClass: 'comprobaciones-filter-menu' }"
            aria-label="Sucursal"
            density="compact"
            hide-details
          />
        </label>
        <label class="filter-field filter-field--select filter-field--sipp">
          <span>Envío a SIPP</span>
          <v-select
            v-model="filters.sipp"
            :items="sippFilterOptions"
            :menu-props="{ contentClass: 'comprobaciones-filter-menu' }"
            aria-label="Envío a SIPP"
            density="compact"
            hide-details
          />
        </label>
        <label class="filter-field filter-field--date">
          <span>Desde</span>
          <v-text-field
            v-model="filters.dateFrom"
            type="date"
            aria-label="Desde"
            density="compact"
            clearable
            hide-details
          />
        </label>
        <label class="filter-field filter-field--date">
          <span>Hasta</span>
          <v-text-field
            v-model="filters.dateTo"
            type="date"
            aria-label="Hasta"
            density="compact"
            clearable
            hide-details
          />
        </label>
        <v-btn
          v-if="hasActiveFilters"
          class="clear-filter-button"
          variant="text"
          size="small"
          @click="clearFilters"
        >
          Limpiar
        </v-btn>
      </div>
    </div>

    <div v-if="requestsStore.loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" />
      <span>Cargando comprobaciones...</span>
    </div>

    <div v-else-if="!entries.length" class="empty-state">
      <v-icon icon="mdi-file-check-outline" size="42" color="primary" />
      <strong>Sin comprobaciones pendientes</strong>
      <span>Aquí aparecerán los conceptos en cuanto se aprueben solicitudes.</span>
    </div>

    <div v-else-if="!filteredEntries.length" class="empty-state">
      <v-icon icon="mdi-filter-off-outline" size="42" color="primary" />
      <strong>Sin resultados</strong>
      <span>Ningún concepto coincide con esos filtros.</span>
    </div>

    <div v-else>
      <div v-for="group in groupedEntries" :key="group.group" class="comprobacion-group">
        <button
          type="button"
          class="comprobacion-group__label"
          :aria-expanded="expandedGroups.includes(group.group)"
          @click="toggleGroup(group.group)"
        >
          <span class="comprobacion-group__identity">
            <span class="comprobacion-group__icon">
              {{ group.items[0]?.concept.casa.replace(/^Casa\s+/i, '').slice(0, 2).toUpperCase() }}
            </span>
            <span>
              <strong>{{ group.items[0]?.concept.casa }}</strong>
              <small>{{ group.items[0]?.empresa }}</small>
            </span>
          </span>
          <span class="comprobacion-group__summary">
            <span class="comprobacion-group__count">
              <strong>{{ group.items.length }}</strong>
              {{ group.items.length === 1 ? 'comprobación' : 'comprobaciones' }}
            </span>
            <span class="comprobacion-group__toggle">
              <v-icon
                :icon="expandedGroups.includes(group.group) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                size="20"
              />
            </span>
          </span>
        </button>

        <div v-show="expandedGroups.includes(group.group)" class="comprobacion-group__content">
          <article
            v-for="entry in group.items"
            :key="entry.concept.id"
            class="comprobacion-card"
          >
          <div class="comprobacion-card__folios">
            <span class="comprobacion-folio">
              Solicitud {{ entry.request.sippFolio || entry.request.folio }}
            </span>
            <v-select
              :model-value="entry.request.card"
              :items="cardOptions"
              :menu-props="{ contentClass: 'comprobaciones-filter-menu' }"
              :loading="savingRequestId === entry.request.id"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-credit-card-outline"
              class="comprobacion-card__tarjeta-select"
              @update:model-value="(v) => saveCard(entry, v)"
            />
            <v-chip
              size="small"
              variant="tonal"
              :color="isEntryComplete(entry) ? 'success' : 'warning'"
              :prepend-icon="isEntryComplete(entry) ? 'mdi-check-circle' : 'mdi-alert-circle-outline'"
              class="completion-chip"
            >
              {{ isEntryComplete(entry) ? 'Información completa' : 'Faltan datos' }}
            </v-chip>
            <v-btn
              size="default"
              variant="flat"
              color="primary"
              class="comprobacion-card__sipp-button"
              prepend-icon="mdi-send"
              :disabled="
                !isEntryComplete(entry) ||
                (entry.concept.comprobacionStatus ?? 'pendiente') !== 'pendiente'
              "
              :loading="sippRunningId === entry.concept.id"
              @click="requestSippConfirmation(entry)"
            >
              Enviar a SIPP
            </v-btn>
          </div>
          <p v-if="sippNotice[entry.concept.id]" class="comprobacion-card__sipp-notice">
            {{ sippNotice[entry.concept.id] }}
          </p>

          <v-row dense class="comprobacion-card__fields">
            <v-col cols="12" sm="3">
              <v-select
                :model-value="entry.concept.expenseType"
                :items="expenseTypeOptions"
                :menu-props="{ contentClass: 'comprobaciones-filter-menu' }"
                :loading="savingId === entry.concept.id"
                label="Concepto"
                hide-details="auto"
                @update:model-value="
                  (v) => {
                    entry.concept.expenseType = v
                    saveConcept(entry, { expenseType: v })
                  }
                "
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model="entry.concept.grupoCentroCosto"
                label="Grupo Centro Costo"
                placeholder="Escribe..."
                persistent-placeholder
                hide-details="auto"
                @blur="saveConcept(entry, { grupoCentroCosto: entry.concept.grupoCentroCosto })"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model="entry.concept.centroCosto"
                label="Centro Costo"
                placeholder="Escribe..."
                persistent-placeholder
                hide-details="auto"
                @blur="saveConcept(entry, { centroCosto: entry.concept.centroCosto })"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-select
                :model-value="entry.concept.tipoNegocio"
                :items="tipoNegocioOptions"
                :menu-props="{ contentClass: 'comprobaciones-filter-menu' }"
                :loading="savingId === entry.concept.id"
                label="Tipo de Negocio"
                hide-details="auto"
                @update:model-value="
                  (v) => {
                    entry.concept.tipoNegocio = v
                    saveConcept(entry, { tipoNegocio: v })
                  }
                "
              />
            </v-col>
          </v-row>

          <div class="comprobacion-card__meta">
            <div class="document-meta">
              <span>Documento</span>
              <div class="document-meta__content">
                <v-btn
                  :href="entry.concept.documentUrl ? documentHref(entry.concept.documentUrl) : undefined"
                  target="_blank"
                  rel="noopener"
                  variant="text"
                  color="primary"
                  size="small"
                  icon="mdi-eye-outline"
                  :disabled="!entry.concept.documentUrl"
                  aria-label="Ver comprobante"
                  title="Ver comprobante"
                  class="document-button"
                />
                <small>{{ entry.concept.documentName }}</small>
              </div>
            </div>
            <div class="amount-meta">
              <span>Importe</span>
              <strong>{{ formatCurrency(entry.concept.amount) }}</strong>
            </div>
            <div>
              <span>Estatus comprobación</span>
              <v-chip
                size="small"
                variant="tonal"
                :color="comprobacionStatusColor[entry.concept.comprobacionStatus ?? 'pendiente']"
                :prepend-icon="comprobacionStatusIcon[entry.concept.comprobacionStatus ?? 'pendiente']"
                class="status-chip"
              >
                {{
                  comprobacionStatusOptions.find(
                    (option) => option.value === (entry.concept.comprobacionStatus ?? 'pendiente'),
                  )?.title
                }}
              </v-chip>
            </div>
          </div>

          <div class="comprobacion-card__comment">
            <span>Comentarios</span>
            <p>{{ entry.concept.comment || '—' }}</p>
          </div>
          </article>
        </div>
      </div>
    </div>

    <v-dialog :model-value="Boolean(confirmEntry)" max-width="430" @update:model-value="(value) => !value && (confirmEntry = null)">
      <v-card class="sipp-confirmation">
        <v-card-title>
          <span class="sipp-confirmation__icon"><v-icon icon="mdi-send" size="22" /></span>
          Confirmar envío
        </v-card-title>
        <v-card-text>
          ¿Enviar <strong>{{ confirmEntry?.request.folio }}</strong> a SIPP?
          Después del envío aparecerá en la sección de enviados.
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="confirmEntry = null">Cancelar</v-btn>
          <v-btn class="sipp-confirmation__button" prepend-icon="mdi-send" @click="confirmSippSend">
            Enviar a SIPP
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      :model-value="Boolean(successMessage)"
      color="success"
      location="top right"
      timeout="3500"
      @update:model-value="(value) => !value && (successMessage = '')"
    >
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>

<style scoped>
.comprobaciones-page {
  min-height: calc(100vh - 126px);
  margin: -24px;
  padding: 16px 24px 24px;
  background: #eaf5fa;
  color: #0c2f4d;
  font-family: Arial, Helvetica, sans-serif;
}

.comprobaciones-heading {
  position: relative;
  min-height: 48px;
  margin-bottom: 18px;
  padding-left: 18px;
}

.comprobaciones-heading::before {
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

.comprobaciones-heading p {
  margin: 0 0 3px;
  color: #ff791f;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.comprobaciones-heading h1 {
  margin: 0;
  color: #123c56;
  font-size: clamp(1.28rem, 1.8vw, 1.6rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.comprobaciones-heading span {
  display: block;
  margin-top: 4px;
  color: #607b8d;
  font-size: 0.8rem;
}

.demo-notice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  padding: 8px 13px;
  border: 1px solid #b8d9e8;
  border-radius: 10px;
  background: #eef8fc;
  color: #315d75;
  font-size: 0.82rem;
  font-weight: 600;
}

.comprobaciones-filter-bar {
  padding: 10px 12px;
  margin-bottom: 16px;
  overflow-x: auto;
  border: 1px solid #b9d9e9;
  border-top: 4px solid #e9b224;
  border-radius: 14px;
  background: #f7fbfc;
  box-shadow: 0 8px 24px rgb(28 52 68 / 7%);
}

.comprobaciones-filter-line {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 9px;
}

.comprobaciones-search {
  display: grid;
  width: min(320px, 28%);
  min-width: 230px;
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

.comprobaciones-search:focus-within {
  border-color: #0872a5;
  box-shadow: 0 0 0 3px rgb(8 111 165 / 9%);
}

.comprobaciones-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  color: #183e5c;
  font: inherit;
  font-size: 0.75rem;
}

.comprobaciones-search input::placeholder {
  color: #7891a3;
}

.comprobaciones-search > span {
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

.filter-field--select {
  width: 160px;
}

.filter-field--sipp {
  width: 145px;
}

.clear-filter-button {
  min-width: 66px !important;
  color: #d76518 !important;
  font-size: 0.68rem !important;
  font-weight: 700;
}

.comprobaciones-filter-bar :deep(.v-field) {
  min-height: 39px;
  border-radius: 9px;
  border: 1px solid #9fc7d9;
  background: rgb(255 255 255 / 88%);
  color: #183e5c;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.75rem;
}

.comprobaciones-filter-bar :deep(.v-field:hover) {
  border-color: #4d9fc1;
  background: #fff;
}

.comprobaciones-filter-bar :deep(.v-field__input) {
  min-height: 39px;
  padding-top: 4px;
  padding-bottom: 4px;
}

.comprobaciones-filter-bar :deep(.v-label) {
  color: #397a9d;
  font-size: 0.7rem;
}

.comprobaciones-filter-bar :deep(.v-field--focused) {
  border-color: #0872a5;
  box-shadow: 0 0 0 3px rgb(8 111 165 / 9%);
}

.loading-state,
.empty-state {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #718697;
  text-align: center;
}

.empty-state strong {
  color: #264b65;
}

.comprobacion-group {
  margin-bottom: 16px;
}

.comprobacion-group__label {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 10px 8px 12px;
  border: 1px solid #07567f;
  border-left: 4px solid #f47a28;
  border-radius: 14px;
  background: #075477;
  box-shadow: 0 9px 22px rgb(6 61 89 / 20%);
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s ease, box-shadow 0.16s ease;
}

.comprobacion-group__label:hover,
.comprobacion-group__label[aria-expanded='true'] {
  background: #086184;
}

.comprobacion-group__label[aria-expanded='true'] {
  border-left-color: #f47a28;
  box-shadow: 0 11px 26px rgb(6 61 89 / 25%);
}

.comprobacion-group__identity,
.comprobacion-group__summary {
  display: flex;
  align-items: center;
}

.comprobacion-group__identity {
  gap: 11px;
  color: #fff;
}

.comprobacion-group__icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 34%);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 10px rgb(1 35 54 / 18%);
  color: #075477;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.comprobacion-group__identity > span {
  display: grid;
  gap: 1px;
}

.comprobacion-group__identity strong {
  color: #fff;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.comprobacion-group__identity small {
  color: #c5e1ec;
  font-size: 0.69rem;
}

.comprobacion-group__summary {
  gap: 10px;
  color: #e6f4f8;
  font-size: 0.68rem;
  font-weight: 600;
}

.comprobacion-group__count {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 3px 7px;
  border: 1px solid rgb(255 255 255 / 23%);
  border-radius: 99px;
  background: rgb(255 255 255 / 10%);
  font-size: 0.61rem;
  line-height: 1.1;
  white-space: nowrap;
}

.comprobacion-group__count strong {
  color: #fff;
  font-size: 0.68rem;
}

.comprobacion-group__toggle {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: #f47a28;
  box-shadow: 0 6px 14px rgb(230 91 16 / 34%);
  color: #fff;
  transition: background 0.16s ease, transform 0.16s ease;
}

.comprobacion-group__label:hover .comprobacion-group__toggle {
  background: #ff8a3c;
  transform: translateY(-1px);
}

.comprobacion-group__label[aria-expanded='true'] .comprobacion-group__toggle {
  background: #ff8a3c;
}

.comprobacion-group__content {
  padding: 8px;
  margin-top: 8px;
  border: 1px solid #c6e0ea;
  border-radius: 14px;
  background: #f5fafc;
  box-shadow: 0 7px 18px rgb(13 67 98 / 7%);
}

.comprobacion-card {
  padding: 11px 13px 10px;
  margin-bottom: 8px;
  border: 1px solid #c7dfe9;
  border-top: 3px solid #1685b3;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 16px rgb(7 95 153 / 6%);
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.comprobacion-card:last-child {
  margin-bottom: 0;
}

.comprobacion-card:hover {
  box-shadow: 0 10px 22px rgb(7 95 153 / 10%);
  transform: translateY(-1px);
}

.comprobacion-card__folios {
  display: grid;
  grid-template-columns: auto minmax(220px, 340px) auto minmax(20px, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
}

.comprobacion-folio {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 99px;
  background: #eaf5fa;
  color: #0877a8;
  font-size: 0.68rem;
  font-weight: 700;
}

.comprobacion-card__tarjeta-select {
  max-width: 230px;
}

.comprobacion-card__tarjeta-select :deep(.v-field) {
  min-height: 32px;
  border-radius: 99px;
  background: #eaf5fa;
  box-shadow: none;
}

.comprobacion-card__tarjeta-select :deep(.v-field__input) {
  min-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
  color: #0877a8;
  font-size: 0.7rem;
  font-weight: 700;
}

.comprobacion-card__tarjeta-select :deep(.v-field__prepend-inner) {
  padding-top: 0;
  align-items: center;
  color: #0877a8;
}

.comprobacion-card__sipp-button {
  grid-column: 5;
  min-height: 38px !important;
  padding-inline: 17px !important;
  border-radius: 10px !important;
  border: 1px solid rgb(255 255 255 / 30%) !important;
  background: #f47a28 !important;
  box-shadow: 0 8px 18px rgb(211 91 17 / 30%), 0 3px 7px rgb(112 54 18 / 16%) !important;
  color: #fff !important;
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  letter-spacing: 0;
  text-transform: none;
}

.comprobacion-card__sipp-button:hover {
  background: #df681b !important;
  box-shadow: 0 11px 22px rgb(211 91 17 / 36%), 0 4px 9px rgb(112 54 18 / 18%) !important;
  transform: translateY(-1px);
}

.comprobacion-card__sipp-button.v-btn--disabled {
  background: #d8e5eb !important;
  box-shadow: none !important;
  color: #7890a0 !important;
}

.comprobacion-card__sipp-notice {
  margin: -8px 0 14px;
  color: #0872a5;
  font-size: 0.72rem;
  font-weight: 600;
}

.completion-chip {
  grid-column: 4;
  justify-self: end;
  font-size: 0.67rem !important;
  font-weight: 700 !important;
}

.comprobacion-card__fields :deep(.v-field) {
  min-height: 44px;
  border-radius: 9px;
  background: #fff;
}

.comprobacion-card__fields :deep(.v-field-label),
.comprobacion-card__fields :deep(.v-label) {
  color: #315c75 !important;
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 1 !important;
}

.comprobacion-card__fields :deep(.v-field__input) {
  min-height: 44px;
  color: #123c56;
  font-size: 0.78rem;
  font-weight: 600;
}

.comprobacion-card__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  padding: 8px 11px;
  margin-top: 9px;
  border-radius: 10px;
  background: #f4f9fb;
}

.comprobacion-card__meta > div {
  display: flex;
  min-width: 0;
  min-height: 66px;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 8px 11px;
  border: 1px solid #d4e7ef;
  border-radius: 9px;
  background: #fff;
}

.comprobacion-card__meta .amount-meta {
  justify-content: center;
  border: 1px solid #bfdeeb;
  background: #dff1f7;
}

.document-meta__content {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.document-meta small {
  overflow: hidden;
  color: #7890a0;
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-button {
  width: 30px !important;
  height: 30px !important;
  flex: 0 0 30px;
  min-width: 30px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #087caf !important;
  transition: color 0.16s ease, transform 0.16s ease;
}

.document-button:hover {
  background: transparent !important;
  box-shadow: none !important;
  color: #f47a28 !important;
  transform: scale(1.12);
}

.document-button.v-btn--disabled {
  background: transparent !important;
  box-shadow: none !important;
  color: #75a9c0 !important;
  opacity: 1;
}

.status-chip {
  width: fit-content;
  font-size: 0.68rem !important;
  font-weight: 700 !important;
}

.comprobacion-card__meta > div > span {
  color: #56758a;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.comprobacion-card__meta strong {
  color: #123c56;
  font-size: 0.88rem;
  line-height: 1.2;
}

.comprobacion-card__meta a {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: #0877a8;
  font-size: 0.78rem;
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comprobacion-card__meta a:hover {
  text-decoration: underline;
}

.comprobacion-card__muted {
  margin: 0;
  color: #6f8798;
  font-size: 0.78rem;
}

.comprobacion-card__meta :deep(.v-selection-control-group) {
  flex-direction: row;
}

.comprobacion-card__meta :deep(.v-label) {
  color: #123c56;
  font-size: 0.76rem;
  opacity: 1;
}

.comprobacion-card__comment {
  padding: 7px 11px;
  margin-top: 7px;
  border-radius: 10px;
  background: #f4f9fb;
}

.comprobacion-card__comment span {
  display: block;
  margin-bottom: 3px;
  color: #56758a;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.comprobacion-card__comment p {
  margin: 0;
  color: #33536b;
  font-size: 0.8rem;
}

.sipp-confirmation {
  overflow: hidden;
  border: 1px solid #b9d9e7;
  border-radius: 16px !important;
  box-shadow: 0 22px 54px rgb(5 54 82 / 24%) !important;
}

.sipp-confirmation :deep(.v-card-title) {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 18px 20px 10px;
  color: #123c56;
  font-size: 1rem;
  font-weight: 700;
}

.sipp-confirmation__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 11px;
  background: #fff0e6;
  color: #f47a28;
}

.sipp-confirmation :deep(.v-card-text) {
  padding: 8px 20px 18px;
  color: #547187;
  font-size: 0.82rem;
  line-height: 1.55;
}

.sipp-confirmation :deep(.v-card-actions) {
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 20px 18px;
}

.sipp-confirmation__button {
  border-radius: 9px !important;
  background: #f47a28 !important;
  box-shadow: 0 7px 16px rgb(211 91 17 / 27%) !important;
  color: #fff !important;
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  text-transform: none;
}

@media (max-width: 700px) {
  .comprobacion-card__folios {
    display: flex;
    flex-wrap: wrap;
  }

  .comprobacion-card__sipp-button {
    margin-left: auto;
  }

  .completion-chip {
    margin-left: auto;
  }

  .comprobacion-card__meta {
    grid-template-columns: 1fr;
  }

  .comprobaciones-search {
    width: 100%;
  }
}

:global(.comprobaciones-filter-menu) {
  overflow: hidden;
  border: 1px solid #b5d5e3;
  border-radius: 14px !important;
  background: #f2f8fb !important;
  box-shadow: 0 14px 28px rgb(7 70 112 / 18%) !important;
}

:global(.comprobaciones-filter-menu .v-list) {
  padding: 7px;
  background: #f2f8fb !important;
}

:global(.comprobaciones-filter-menu .v-list-item) {
  min-height: 40px;
  margin: 3px 0;
  border-radius: 9px;
  color: #17445f;
  font-size: 0.76rem;
}

:global(.comprobaciones-filter-menu .v-list-item:hover) {
  background: #e1f0f6 !important;
}

:global(.comprobaciones-filter-menu .v-list-item--active) {
  background: #cce7f1 !important;
  color: #075f99 !important;
  font-weight: 700;
}

:global(.comprobaciones-filter-menu .v-list-item__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}
</style>
