<script setup lang="ts">
import type { LimpiezaAsignacion, LimpiezaDias } from '~/types'

const store = useLimpiezaStore()
const casasStore = useCasasStore()

onMounted(() => {
  store.fetchAsignaciones()
  if (casasStore.items.length === 0) casasStore.fetchCasas()
})

const diasSemana: { key: keyof LimpiezaDias; label: string }[] = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
]

function diasTrabajados(asignacion: LimpiezaAsignacion): number {
  return diasSemana.filter((d) => asignacion.dias[d.key]).length
}
function montoAPagar(asignacion: LimpiezaAsignacion): number {
  return asignacion.tarifaDiaria * diasTrabajados(asignacion)
}

function personaInitials(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function sucursalCasa(casaId: number): string | null {
  return casasStore.items.find((casa) => casa.id === casaId)?.sucursal ?? null
}

const totalAPagar = computed(() => store.items.reduce((sum, a) => sum + montoAPagar(a), 0))

const togglingKey = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function toggleDia(asignacion: LimpiezaAsignacion, dia: keyof LimpiezaDias) {
  const key = `${asignacion.id}-${dia}`
  const previous = asignacion.dias[dia]
  asignacion.dias[dia] = !previous
  togglingKey.value = key
  actionError.value = null
  try {
    await store.updateAsignacion(asignacion.id, { dias: { [dia]: !previous } })
  } catch (e) {
    asignacion.dias[dia] = previous
    console.error('Error al actualizar el día trabajado:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    actionError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar el cambio.'
  } finally {
    togglingKey.value = null
  }
}

async function aplicarSemana(asignacion: LimpiezaAsignacion, modo: 'laboral' | 'limpiar') {
  const previous = { ...asignacion.dias }
  const dias: LimpiezaDias = {
    lunes: modo === 'laboral',
    martes: modo === 'laboral',
    miercoles: modo === 'laboral',
    jueves: modo === 'laboral',
    viernes: modo === 'laboral',
    sabado: false,
    domingo: false,
  }

  asignacion.dias = dias
  togglingKey.value = `${asignacion.id}-semana`
  actionError.value = null
  try {
    await store.updateAsignacion(asignacion.id, { dias })
  } catch (e) {
    asignacion.dias = previous
    console.error('Error al actualizar la semana:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    actionError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar la semana.'
  } finally {
    togglingKey.value = null
  }
}

const deletingId = ref<string | null>(null)

async function removeAsignacion(asignacion: LimpiezaAsignacion) {
  deletingId.value = asignacion.id
  actionError.value = null
  try {
    await store.deleteAsignacion(asignacion.id)
  } catch (e) {
    console.error('Error al eliminar la asignación:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    actionError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo eliminar la asignación.'
  } finally {
    deletingId.value = null
  }
}

const showFormDialog = ref(false)
const editingAsignacion = ref<LimpiezaAsignacion | null>(null)

function openNewAsignacion() {
  editingAsignacion.value = null
  showFormDialog.value = true
}

function openEditAsignacion(asignacion: LimpiezaAsignacion) {
  editingAsignacion.value = asignacion
  showFormDialog.value = true
}

function descargarPdf() {
  exportLimpiezaPdf(store.items)
}

const copiedMessage = ref<string | null>(null)

async function copiarResumen() {
  const lines = store.items
    .filter((a) => diasTrabajados(a) > 0)
    .map(
      (a) =>
        `${a.personaNombre} · ${a.banco} · ${a.tarjeta} · ${formatCurrency(montoAPagar(a))}`,
    )
  if (!lines.length) return
  await navigator.clipboard.writeText(lines.join('\n'))
  copiedMessage.value = 'Resumen de transferencias copiado al portapapeles.'
  setTimeout(() => {
    copiedMessage.value = null
  }, 3000)
}
</script>

<template>
  <div>
    <div
      class="page-intro petroil-page-heading d-flex justify-space-between align-end flex-wrap ga-3 mb-4"
    >
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Limpieza</h1>
        <p class="text-body-2 text-medium-emphasis">
          Marca los días trabajados de cada semana y obtén el monto a transferir, sin cuentas
          manuales.
        </p>
      </div>
      <div class="page-actions">
        <div class="summary-actions" aria-label="Acciones de resumen">
          <v-btn
            class="summary-button"
            variant="flat"
            prepend-icon="mdi-content-copy"
            size="small"
            @click="copiarResumen"
          >
            Copiar
          </v-btn>
          <v-btn
            class="summary-button summary-button--pdf"
            variant="flat"
            prepend-icon="mdi-file-pdf-box"
            size="small"
            :disabled="!store.items.length"
            @click="descargarPdf"
          >
            Descargar PDF
          </v-btn>
        </div>
        <v-btn
          class="new-assignment-button"
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="openNewAsignacion"
        >
          Nueva asignación
        </v-btn>
      </div>
    </div>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">
      {{ store.error }}
    </v-alert>
    <v-alert
      v-if="actionError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="actionError = null"
    >
      {{ actionError }}
    </v-alert>
    <v-alert
      v-if="copiedMessage"
      type="success"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="copiedMessage = null"
    >
      {{ copiedMessage }}
    </v-alert>

    <div v-if="store.loading" class="pa-10 text-center">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-else-if="!store.items.length" class="pa-10 text-center">
      <v-icon icon="mdi-broom" size="42" color="primary" />
      <p class="text-body-1 font-weight-bold mt-3 mb-1">Sin asignaciones registradas</p>
      <p class="text-body-2 text-medium-emphasis">
        Agrega la primera persona de limpieza con "Nueva asignación".
      </p>
    </v-card>

    <v-card v-else class="cleaning-table-card" elevation="0">
      <div class="table-heading">
        <div>
          <span class="table-heading__icon"><v-icon icon="mdi-calendar-week" size="22" /></span>
          <div>
            <strong>Control semanal</strong>
            <small>Marca los días trabajados para actualizar el pago automáticamente.</small>
          </div>
        </div>
        <span class="week-status"><i /> Semana activa</span>
      </div>

      <div class="table-scroll">
        <v-table class="cleaning-table" density="compact">
          <thead>
            <tr>
              <th class="person-column">
                <span class="column-heading"><v-icon icon="mdi-account-outline" size="15" />Persona</span>
              </th>
              <th>
                <span class="column-heading"><v-icon icon="mdi-home-outline" size="15" />Casa</span>
              </th>
              <th>
                <span class="column-heading"><v-icon icon="mdi-bank-outline" size="15" />Banco</span>
              </th>
              <th>
                <span class="column-heading"><v-icon icon="mdi-credit-card-outline" size="15" />Tarjeta</span>
              </th>
              <th class="week-column">
                <span class="column-heading">
                  <v-icon icon="mdi-calendar-week-outline" size="15" />Semana
                  <small>Selecciona los días</small>
                </span>
              </th>
              <th class="text-right">
                <span class="column-heading justify-end"><v-icon icon="mdi-calendar-check-outline" size="15" />Días</span>
              </th>
              <th class="text-right">
                <span class="column-heading justify-end"><v-icon icon="mdi-cash-multiple" size="15" />Monto</span>
              </th>
              <th class="actions-column text-center" aria-label="Acciones">
                <v-icon icon="mdi-dots-horizontal" size="17" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asignacion in store.items" :key="asignacion.id" class="assignment-row">
                <td>
                  <div class="person-cell">
                    <span>{{ personaInitials(asignacion.personaNombre) }}</span>
                    <strong>{{ asignacion.personaNombre }}</strong>
                  </div>
                </td>
                <td>
                  <div class="house-cell">
                    <strong>{{ asignacion.casaNombre }}</strong>
                    <small>
                      {{ asignacion.empresa }}
                      <template v-if="sucursalCasa(asignacion.casa)">
                        · {{ sucursalCasa(asignacion.casa) }}
                      </template>
                    </small>
                  </div>
                </td>
                <td>
                  <span class="bank-cell">
                    <v-icon icon="mdi-bank-outline" size="17" />{{ asignacion.banco }}
                  </span>
                </td>
                <td><span class="card-cell">{{ asignacion.tarjeta }}</span></td>
                <td class="week-cell">
                  <div class="week-picker">
                    <div class="day-options" aria-label="Días trabajados">
                      <v-tooltip
                        v-for="dia in diasSemana"
                        :key="dia.key"
                        :text="dia.label"
                        location="top"
                      >
                        <template #activator="{ props }">
                          <button
                            v-bind="props"
                            type="button"
                            class="day-option"
                            :class="{ selected: asignacion.dias[dia.key] }"
                            :disabled="togglingKey !== null"
                            :aria-pressed="asignacion.dias[dia.key]"
                            :aria-label="dia.label"
                            @click="toggleDia(asignacion, dia.key)"
                          >
                            {{ dia.label.charAt(0) }}
                          </button>
                        </template>
                      </v-tooltip>
                    </div>
                    <div class="week-shortcuts">
                      <v-tooltip text="Marcar lunes a viernes" location="top">
                        <template #activator="{ props }">
                          <button
                            v-bind="props"
                            type="button"
                            :disabled="togglingKey !== null"
                            aria-label="Marcar lunes a viernes"
                            @click="aplicarSemana(asignacion, 'laboral')"
                          >
                            L–V
                          </button>
                        </template>
                      </v-tooltip>
                      <v-tooltip text="Limpiar días" location="top">
                        <template #activator="{ props }">
                          <button
                            v-bind="props"
                            type="button"
                            :disabled="togglingKey !== null"
                            aria-label="Limpiar días seleccionados"
                            @click="aplicarSemana(asignacion, 'limpiar')"
                          >
                            <v-icon icon="mdi-eraser" size="14" />
                          </button>
                        </template>
                      </v-tooltip>
                    </div>
                  </div>
                </td>
                <td class="text-right">
                  <span class="days-count">{{ diasTrabajados(asignacion) }}</span>
                </td>
                <td class="text-right">
                  <strong class="amount-cell">{{ formatCurrency(montoAPagar(asignacion)) }}</strong>
                </td>
                <td>
                  <div class="row-actions">
                    <v-tooltip text="Editar asignación" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-pencil-outline"
                          variant="text"
                          size="small"
                          density="comfortable"
                          @click="openEditAsignacion(asignacion)"
                        />
                      </template>
                    </v-tooltip>
                    <v-tooltip text="Eliminar asignación" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-trash-can-outline"
                          variant="text"
                          size="small"
                          density="comfortable"
                          :loading="deletingId === asignacion.id"
                          @click="removeAsignacion(asignacion)"
                        />
                      </template>
                    </v-tooltip>
                  </div>
                </td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div class="table-summary">
        <span class="assignment-count">
          <v-icon icon="mdi-account-group-outline" size="20" />
          {{ store.items.length }} asignación{{ store.items.length === 1 ? '' : 'es' }}
        </span>
        <div class="weekly-total">
          <span>Total a transferir esta semana</span>
          <strong>{{ formatCurrency(totalAPagar) }}</strong>
        </div>
      </div>
    </v-card>

    <LimpiezaAsignacionFormDialog v-model="showFormDialog" :editing-asignacion="editingAsignacion" />
  </div>
</template>

<style scoped>
.page-intro :deep(.v-btn) { min-height: 34px; }
.page-actions { display: flex; align-items: stretch; gap: 10px; }
.summary-actions { display: flex; align-items: center; gap: 10px; }
.summary-button { min-height: 42px !important; padding-inline: 15px !important; border: 1px solid #bdd5e2; border-radius: 10px !important; background: #f8fcfd !important; box-shadow: 0 6px 14px rgb(18 76 106 / 16%) !important; color: #075f99 !important; letter-spacing: .02em; transition: transform .16s ease, box-shadow .16s ease, background-color .16s ease; }
.summary-button:hover { background: #fff !important; box-shadow: 0 9px 20px rgb(18 76 106 / 22%) !important; transform: translateY(-1px); }
.summary-button--pdf { border-color: #075487 !important; background: #075f99 !important; box-shadow: 0 7px 16px rgb(7 95 153 / 28%) !important; color: #fff !important; }
.summary-button--pdf:hover { background: #064f80 !important; box-shadow: 0 10px 22px rgb(7 95 153 / 34%) !important; }
.new-assignment-button { align-self: center; min-height: 42px !important; padding-inline: 18px !important; }
.page-intro .text-body-2 { margin-top: 2px; font-size: .76rem !important; }
.cleaning-table-card {
  overflow: hidden;
  border: 1px solid #cbdde7;
  border-radius: 14px !important;
  background: #fff;
  box-shadow: 0 8px 24px rgb(17 71 101 / 8%) !important;
  font-family: Arial, Helvetica, sans-serif;
}
.table-heading {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 16px;
  border-top: 4px solid #ff791f;
  border-bottom: 1px solid #d8e5ec;
  background: linear-gradient(110deg, #edf7fb, #fff);
}
.table-heading > div { display: flex; align-items: center; gap: 10px; }
.table-heading__icon { display: grid; width: 36px; height: 36px; border: 1px solid #d3e8f2; border-radius: 10px; place-items: center; background: #e8f4f9; color: #075f99; }
.table-heading > div > div { display: flex; flex-direction: column; }
.table-heading strong { color: #123c56; font-size: .9rem; }
.table-heading small { margin-top: 3px; color: #708697; font-size: .66rem; }
.week-status { display: flex; align-items: center; gap: 7px; padding: 7px 11px; border: 1px solid #d9eee5; border-radius: 99px; background: #f1faf6; color: #287b5d; font-size: .64rem; font-weight: 800; }
.week-status i { width: 7px; height: 7px; border-radius: 50%; background: #2aa776; box-shadow: 0 0 0 4px rgb(42 167 118 / 12%); }
.table-scroll {
  overflow-x: auto;
  background: #f5f8fa;
}
.cleaning-table { min-width: 930px; background: transparent; }
.cleaning-table :deep(table) { border-collapse: separate; border-spacing: 0 3px; padding: 0 8px 3px; }
.cleaning-table :deep(thead th) { height: 42px !important; border-bottom: 0 !important; background: transparent; color: #607789 !important; font-size: .61rem !important; font-weight: 800 !important; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.column-heading { display: flex; align-items: center; gap: 6px; }
.column-heading :deep(.v-icon) { color: #8ca2b1; }
.column-heading.justify-end { justify-content: flex-end; }
.week-column { min-width: 310px; }
.week-column .column-heading small { color: #9aabb7; font-size: .52rem; font-weight: 600; letter-spacing: 0; text-transform: none; }
.cleaning-table :deep(tbody td) { height: 48px !important; color: #25475f; font-size: .7rem; transition: background .16s ease, border-color .16s ease, box-shadow .16s ease; }
.person-column { min-width: 145px; }
.actions-column { width: 78px; }
.assignment-row td { border-top: 1px solid #e1e9ee !important; border-bottom: 1px solid #e1e9ee !important; background: #fff; }
.assignment-row td:first-child { border-left: 1px solid #e1e9ee !important; border-radius: 10px 0 0 10px; }
.assignment-row td:last-child { border-right: 1px solid #e1e9ee !important; border-radius: 0 10px 10px 0; }
.assignment-row:hover td { border-color: #bfd8e5 !important; background: #fafdff; box-shadow: 0 4px 12px rgb(26 78 106 / 6%); }
.assignment-row:hover td:first-child { box-shadow: inset 3px 0 0 #ff791f, 0 4px 12px rgb(26 78 106 / 6%); }
.person-cell { display: flex; align-items: center; gap: 9px; }
.person-cell > span { display: grid; width: 30px; height: 30px; flex: 0 0 auto; border: 1px solid #d8eaf2; border-radius: 50%; place-items: center; background: #edf7fa; color: #075f99; font-size: .63rem; font-weight: 900; }
.person-cell strong { color: #173d59; font-size: .75rem; }
.house-cell { display: flex; min-width: 145px; max-width: 190px; flex-direction: column; gap: 1px; }
.house-cell strong { overflow: hidden; color: #173d59; font-size: .74rem; text-overflow: ellipsis; white-space: nowrap; }
.house-cell small { overflow: hidden; color: #758b9a; font-size: .61rem; text-overflow: ellipsis; white-space: nowrap; }
.bank-cell { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
.bank-cell :deep(.v-icon) { color: #64869c; }
.card-cell { padding: 4px 7px; border-radius: 6px; background: #f1f6f8; color: #526d80; font-family: Consolas, monospace; font-size: .65rem; white-space: nowrap; }
.week-cell { min-width: 310px; }
.week-picker { display: flex; align-items: center; gap: 8px; }
.day-options { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid #dae6ec; border-radius: 10px; background: #f4f8fa; }
.day-option { position: relative; display: grid; width: 26px; height: 26px; border: 0; border-radius: 6px; place-items: center; background: transparent; color: #6b8292; cursor: pointer; font: inherit; font-size: .64rem; font-weight: 800; transition: transform .14s ease, background .14s ease, color .14s ease, box-shadow .14s ease; }
.day-option:hover:not(:disabled) { background: #e3eff5; color: #075f99; transform: translateY(-1px); }
.day-option.selected { background: #075f99; box-shadow: 0 3px 7px rgb(7 95 153 / 18%); color: #fff; }
.day-option:disabled, .week-shortcuts button:disabled { cursor: wait; opacity: .55; }
.week-shortcuts { display: inline-flex; gap: 3px; padding-left: 7px; border-left: 1px solid #dce6eb; }
.week-shortcuts button { display: grid; min-width: 26px; height: 26px; padding: 0 5px; border: 0; border-radius: 6px; place-items: center; background: transparent; color: #708696; cursor: pointer; font: inherit; font-size: .56rem; font-weight: 800; transition: background .14s ease, color .14s ease; }
.week-shortcuts button:hover:not(:disabled) { background: #e8f2f6; color: #075f99; }
.days-count { display: inline-grid; min-width: 27px; height: 27px; border: 1px solid #d7e8f0; border-radius: 8px; place-items: center; background: #edf6fa; color: #075f99; font-size: .67rem; font-weight: 900; }
.amount-cell { display: inline-block; min-width: 74px; padding: 5px 8px; border-radius: 7px; background: #f0f7fa; color: #075f99; font-size: .75rem; }
.row-actions { display: flex; justify-content: flex-end; gap: 1px; opacity: .72; transition: opacity .15s ease; }
.assignment-row:hover .row-actions { opacity: 1; }
.row-actions :deep(.v-btn) { width: 27px; height: 27px; border-radius: 7px; }
.row-actions :deep(.v-btn:hover) { background: #edf6fa; }
.row-actions :deep(.v-btn:first-child) { color: #075f99; }
.row-actions :deep(.v-btn:last-child) { color: #c55345; }
.table-summary { display: flex; min-height: 56px; align-items: center; justify-content: space-between; gap: 16px; padding: 9px 16px; border-top: 1px solid #d6e4eb; background: #fff; }
.assignment-count { display: flex; align-items: center; gap: 7px; color: #6c8292; font-size: .68rem; }
.assignment-count :deep(.v-icon) { color: #075f99; }
.weekly-total { display: flex; align-items: center; gap: 13px; }
.weekly-total span { color: #526f83; font-size: .72rem; }
.weekly-total strong { padding: 7px 12px; border-radius: 9px; background: #075f99; box-shadow: 0 5px 12px rgb(7 95 153 / 16%); color: #fff; font-size: .9rem; }
@media (max-width: 700px) {
  .page-actions { width: 100%; align-items: stretch; flex-direction: column; }
  .summary-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .summary-button { width: 100%; }
  .new-assignment-button { width: 100%; }
  .table-heading { align-items: flex-start; flex-direction: column; }
  .week-status { align-self: flex-start; }
  .table-summary { align-items: stretch; flex-direction: column; }
  .weekly-total { justify-content: space-between; }
}
</style>
