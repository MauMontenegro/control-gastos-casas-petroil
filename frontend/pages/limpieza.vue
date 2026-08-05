<script setup lang="ts">
import type { LimpiezaAsignacion, LimpiezaDias } from '~/types'

const store = useLimpiezaStore()

onMounted(() => {
  store.fetchAsignaciones()
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

// La "cantidad semanal" es el importe de una semana completa trabajada;
// el monto real se prorratea por los días que sí se marcaron. Si el
// criterio real del negocio no es /7, hay que ajustar esta fórmula.
function diasTrabajados(asignacion: LimpiezaAsignacion): number {
  return diasSemana.filter((d) => asignacion.dias[d.key]).length
}
function montoAPagar(asignacion: LimpiezaAsignacion): number {
  return Math.round((asignacion.cantidadSemanal / 7) * diasTrabajados(asignacion))
}

const groupedAsignaciones = computed(() => {
  const groups = new Map<string, LimpiezaAsignacion[]>()
  for (const asignacion of store.items) {
    groups.set(asignacion.empresa, [...(groups.get(asignacion.empresa) ?? []), asignacion])
  }
  return [...groups.entries()].map(([empresa, items]) => ({ empresa, items }))
})

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
    <div class="d-flex justify-space-between align-end flex-wrap ga-4 mb-6">
      <div>
        <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">
          SERVICIO RECURRENTE
        </p>
        <h1 class="text-h4 font-weight-bold mb-1">Limpieza</h1>
        <p class="text-body-2 text-medium-emphasis">
          Marca los días trabajados de cada semana y obtén el monto a transferir, sin cuentas
          manuales.
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-content-copy"
          @click="copiarResumen"
        >
          Copiar resumen
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNewAsignacion">
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

    <v-card v-else>
      <div class="table-scroll">
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Casa</th>
              <th>Banco</th>
              <th>Tarjeta</th>
              <th v-for="dia in diasSemana" :key="dia.key" class="text-center">
                {{ dia.label }}
              </th>
              <th class="text-right">Días</th>
              <th class="text-right">Monto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <template v-for="group in groupedAsignaciones" :key="group.empresa">
              <tr class="empresa-row">
                <td :colspan="12" class="font-weight-bold text-secondary">
                  {{ group.empresa }}
                </td>
              </tr>
              <tr v-for="asignacion in group.items" :key="asignacion.id">
                <td>{{ asignacion.personaNombre }}</td>
                <td>{{ asignacion.casaNombre }}</td>
                <td>{{ asignacion.banco }}</td>
                <td>{{ asignacion.tarjeta }}</td>
                <td v-for="dia in diasSemana" :key="dia.key" class="text-center">
                  <v-checkbox-btn
                    :model-value="asignacion.dias[dia.key]"
                    :disabled="togglingKey === `${asignacion.id}-${dia.key}`"
                    @update:model-value="toggleDia(asignacion, dia.key)"
                  />
                </td>
                <td class="text-right">{{ diasTrabajados(asignacion) }}</td>
                <td class="text-right font-weight-bold">
                  {{ formatCurrency(montoAPagar(asignacion)) }}
                </td>
                <td>
                  <div class="d-flex ga-1">
                    <v-btn
                      icon="mdi-pencil-outline"
                      variant="text"
                      size="x-small"
                      density="comfortable"
                      @click="openEditAsignacion(asignacion)"
                    />
                    <v-btn
                      icon="mdi-trash-can-outline"
                      variant="text"
                      size="x-small"
                      density="comfortable"
                      :loading="deletingId === asignacion.id"
                      @click="removeAsignacion(asignacion)"
                    />
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>
      </div>

      <v-divider />
      <div class="d-flex justify-space-between align-center pa-4">
        <span class="text-body-2 text-medium-emphasis">
          {{ store.items.length }} asignaciones
        </span>
        <span class="text-body-1">
          Total a transferir esta semana:
          <strong class="text-h6 text-secondary">{{ formatCurrency(totalAPagar) }}</strong>
        </span>
      </div>
    </v-card>

    <LimpiezaAsignacionFormDialog v-model="showFormDialog" :editing-asignacion="editingAsignacion" />
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
.empresa-row {
  background: rgba(var(--v-theme-secondary), 0.06);
}
</style>
