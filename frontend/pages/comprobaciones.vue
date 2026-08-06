<script setup lang="ts">
import type {
  ComprobacionStatus,
  FundRequest,
  FundRequestConceptDetail,
  UpdateFundRequestConceptPayload,
} from '~/types'
import { useRpaRepository } from '~/repositories/rpaRepository'

interface ComprobacionEntry {
  request: FundRequest
  concept: FundRequestConceptDetail
  empresa: string
}

const requestsStore = useRequestsStore()
const casasStore = useCasasStore()
const config = useRuntimeConfig()

// Mismo catálogo usado al capturar la solicitud (RequestFormDialog.vue). El
// diccionario concepto -> catálogo real de SIPP para un servicio específico
// llega después; por ahora el usuario puede corregirlo aquí a mano.
const expenseTypeOptions = ['Luz', 'Agua', 'Limpieza', 'Gas', 'Internet', 'Otros']

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
const entries = computed<ComprobacionEntry[]>(() =>
  requestsStore.items
    .filter((r) => r.status === 'autorizada')
    .flatMap((r) =>
      r.concepts.map((concept) => ({ request: r, concept, empresa: empresaForCasa(concept.casa) })),
    ),
)

const filters = reactive({
  folioSolicitud: '',
  empresa: 'Todas',
  casa: 'Todas',
  dateFrom: '',
  dateTo: '',
})

function clearFilters() {
  filters.folioSolicitud = ''
  filters.empresa = 'Todas'
  filters.casa = 'Todas'
  filters.dateFrom = ''
  filters.dateTo = ''
}

const hasActiveFilters = computed(
  () =>
    !!filters.folioSolicitud ||
    filters.empresa !== 'Todas' ||
    filters.casa !== 'Todas' ||
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
  return [...groups.entries()].map(([group, items]) => ({
    group,
    items,
    casaId: casasStore.items.find((c) => c.nombre === items[0].concept.casa)?.id ?? null,
  }))
})

const rpaRunningGroup = ref<string | null>(null)
const rpaNotice = reactive<Record<string, string>>({})

async function runSucursalRpa(group: { group: string; casaId: number | null }) {
  if (!group.casaId) {
    rpaNotice[group.group] = 'No se encontró la sucursal para ejecutar el RPA.'
    return
  }
  rpaRunningGroup.value = group.group
  rpaNotice[group.group] = ''
  try {
    const result = await useRpaRepository().executeSucursalComprobacion(group.casaId)
    rpaNotice[group.group] = result.message || 'RPA ejecutado correctamente.'
  } catch (e) {
    console.error('Error al ejecutar el RPA de la sucursal:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    rpaNotice[group.group] =
      fetchError.data?.message || fetchError.message || 'No se pudo ejecutar el RPA.'
  } finally {
    rpaRunningGroup.value = null
  }
}

const savingId = ref<string | null>(null)
const saveError = ref<string | null>(null)

async function saveConcept(entry: ComprobacionEntry, payload: UpdateFundRequestConceptPayload) {
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
        <div class="comprobacion-group__header">
          <p class="comprobacion-group__label"><i />{{ group.group }}</p>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-robot-outline"
            :loading="rpaRunningGroup === group.group"
            @click="runSucursalRpa(group)"
          >
            Ejecutar RPA
          </v-btn>
        </div>
        <p v-if="rpaNotice[group.group]" class="comprobacion-group__rpa-notice">
          {{ rpaNotice[group.group] }}
        </p>

        <article
          v-for="entry in group.items"
          :key="entry.concept.id"
          class="comprobacion-card"
        >
          <div class="comprobacion-card__folios">
            <span class="comprobacion-folio">
              Solicitud {{ entry.request.sippFolio || entry.request.folio }}
            </span>
            <v-chip
              size="small"
              variant="tonal"
              :color="comprobacionStatusColor[entry.concept.comprobacionStatus ?? 'pendiente']"
            >
              {{
                comprobacionStatusOptions.find(
                  (o) => o.value === (entry.concept.comprobacionStatus ?? 'pendiente'),
                )?.title
              }}
            </v-chip>
          </div>

          <v-row dense class="comprobacion-card__fields">
            <v-col cols="12" sm="6">
              <v-select
                :model-value="entry.concept.expenseType"
                :items="expenseTypeOptions"
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
          </v-row>

          <div class="comprobacion-card__meta">
            <div>
              <span>Deducible</span>
              <v-radio-group
                :model-value="entry.concept.deducible ?? 'NO'"
                inline
                hide-details
                density="compact"
                @update:model-value="
                  (v) => {
                    const value = v as 'SI' | 'NO'
                    entry.concept.deducible = value
                    saveConcept(entry, { deducible: value })
                  }
                "
              >
                <v-radio label="SI" value="SI" />
                <v-radio label="NO" value="NO" />
              </v-radio-group>
            </div>
            <div>
              <span>Documento</span>
              <a
                v-if="entry.concept.documentUrl"
                :href="documentHref(entry.concept.documentUrl)"
                target="_blank"
                rel="noopener"
              >
                <v-icon icon="mdi-paperclip" size="14" />
                {{ entry.concept.documentName }}
              </a>
              <p v-else class="comprobacion-card__muted">{{ entry.concept.documentName }}</p>
            </div>
            <div>
              <span>Importe</span>
              <strong>{{ formatCurrency(entry.concept.amount) }}</strong>
            </div>
            <div>
              <span>Estatus comprobación</span>
              <v-select
                :model-value="entry.concept.comprobacionStatus ?? 'pendiente'"
                :items="comprobacionStatusOptions"
                :loading="savingId === entry.concept.id"
                density="compact"
                hide-details
                @update:model-value="
                  (v) => {
                    entry.concept.comprobacionStatus = v
                    saveConcept(entry, { comprobacionStatus: v })
                  }
                "
              />
            </div>
          </div>

          <div class="comprobacion-card__comment">
            <span>Comentarios</span>
            <p>{{ entry.concept.comment || '—' }}</p>
          </div>
        </article>
      </div>
    </div>
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
  margin-bottom: 22px;
}

.comprobacion-group__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
}

.comprobacion-group__label {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  margin: 0;
  border: 1px solid #c5dfe9;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 12px rgb(7 95 153 / 6%);
  color: #123c56;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.comprobacion-group__rpa-notice {
  margin: -4px 0 10px;
  color: #0872a5;
  font-size: 0.72rem;
  font-weight: 600;
}

.comprobacion-group__label i {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #1594bf;
}

.comprobacion-card {
  padding: 16px 18px 14px;
  margin-bottom: 14px;
  border: 1px solid #c7dfe9;
  border-top: 3px solid #1685b3;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 16px rgb(7 95 153 / 6%);
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.comprobacion-card:hover {
  box-shadow: 0 10px 22px rgb(7 95 153 / 10%);
  transform: translateY(-1px);
}

.comprobacion-card__folios {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
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

.comprobacion-card__fields :deep(.v-field) {
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
  color: #123c56;
  font-size: 0.78rem;
  font-weight: 600;
}

.comprobacion-card__meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 12px 14px;
  margin-top: 14px;
  border-radius: 10px;
  background: #f4f9fb;
}

.comprobacion-card__meta > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
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
  font-size: 1.05rem;
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
  padding: 10px 14px;
  margin-top: 10px;
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

@media (max-width: 700px) {
  .comprobacion-card__meta {
    grid-template-columns: 1fr;
  }

  .comprobaciones-search {
    width: 100%;
  }
}

:global(.comprobaciones-filter-menu) {
  overflow: hidden;
  border: 1px solid #69a9c4;
  border-radius: 14px !important;
  background: #c7e4ef !important;
  box-shadow: 0 14px 28px rgb(7 70 112 / 18%) !important;
}

:global(.comprobaciones-filter-menu .v-list) {
  padding: 7px;
  background: #c7e4ef !important;
}

:global(.comprobaciones-filter-menu .v-list-item) {
  min-height: 40px;
  margin: 3px 0;
  border-radius: 9px;
  color: #17445f;
  font-size: 0.76rem;
}

:global(.comprobaciones-filter-menu .v-list-item:hover) {
  background: #a9d5e6 !important;
}

:global(.comprobaciones-filter-menu .v-list-item--active) {
  background: #82bfd8 !important;
  color: #075f99 !important;
  font-weight: 700;
}

:global(.comprobaciones-filter-menu .v-list-item__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}
</style>
