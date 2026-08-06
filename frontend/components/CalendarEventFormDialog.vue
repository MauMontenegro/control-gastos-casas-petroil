<script setup lang="ts">
import type { CalendarEvent, CreateCalendarEventPayload, CalendarEventRecurrence } from '~/types'

const props = defineProps<{ editingEvent: CalendarEvent | null }>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ saved: [] }>()

const store = useCalendarEventsStore()
const casasStore = useCasasStore()

const tipoPagoOptions = ['Luz', 'Agua', 'Limpieza', 'Gas', 'Internet', 'Otros']

const casa = ref<number | null>(null)
const tipoPago = ref('')
const recurrencia = ref<CalendarEventRecurrence>('unico')
const fecha = ref('')
const diaDelMes = ref<number | null>(null)
const nota = ref('')

const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitAttempted = ref(false)

const casaOptions = computed(() =>
  casasStore.items.map((c) => ({ title: `${c.empresa} · ${c.nombre}`, value: c.id })),
)

function resetForm() {
  submitAttempted.value = false
  submitError.value = null
  if (props.editingEvent) {
    casa.value = props.editingEvent.casa
    tipoPago.value = props.editingEvent.tipoPago
    recurrencia.value = props.editingEvent.recurrencia
    fecha.value = props.editingEvent.fecha || ''
    diaDelMes.value = props.editingEvent.diaDelMes ?? null
    nota.value = props.editingEvent.nota || ''
  } else {
    casa.value = null
    tipoPago.value = ''
    recurrencia.value = 'unico'
    fecha.value = ''
    diaDelMes.value = null
    nota.value = ''
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  if (casasStore.items.length === 0) casasStore.fetchCasas()
  resetForm()
})

const isValid = computed(() => {
  if (casa.value == null || !tipoPago.value) return false
  if (recurrencia.value === 'unico') return !!fecha.value
  return !!diaDelMes.value && diaDelMes.value >= 1 && diaDelMes.value <= 31
})

async function onSubmit() {
  submitAttempted.value = true
  if (!isValid.value) return

  submitting.value = true
  submitError.value = null
  try {
    const payload: CreateCalendarEventPayload = {
      casa: casa.value as number,
      tipoPago: tipoPago.value,
      recurrencia: recurrencia.value,
      fecha: recurrencia.value === 'unico' ? fecha.value : undefined,
      diaDelMes: recurrencia.value === 'mensual' ? (diaDelMes.value as number) : undefined,
      nota: nota.value || undefined,
    }
    if (props.editingEvent) {
      await store.updateEvent(props.editingEvent.id, payload)
    } else {
      await store.createEvent(payload)
    }
    emit('saved')
    open.value = false
  } catch (e) {
    console.error('Error al guardar el recordatorio:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    submitError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar el recordatorio.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="680">
    <v-card class="reminder-dialog-card">
      <v-card-item class="reminder-dialog-header">
        <div class="reminder-dialog-header__content">
          <span class="reminder-dialog-header__icon"><v-icon icon="mdi-calendar-plus-outline" /></span>
          <div>
            <h2>
              {{ editingEvent ? 'Editar recordatorio' : 'Nuevo recordatorio' }}
            </h2>
          </div>
          <v-btn class="reminder-close" icon="mdi-close" variant="text" density="comfortable" @click="open = false" />
        </div>
      </v-card-item>

      <v-card-text class="reminder-dialog-body">
        <v-alert
          v-if="submitError"
          type="error"
          variant="tonal"
          density="comfortable"
          closable
          class="mb-3"
          @click:close="submitError = null"
        >
          {{ submitError }}
        </v-alert>

        <div class="reminder-form-grid">
          <label class="reminder-field">
            <span>Casa Petroil</span>
            <v-select
              v-model="casa"
              :items="casaOptions"
              :menu-props="{ contentClass: 'reminder-select-menu' }"
              aria-label="Casa Petroil"
              placeholder="Selecciona una casa"
              persistent-placeholder
              density="compact"
              hide-details="auto"
              :error-messages="submitAttempted && casa == null ? ['Selecciona una casa'] : []"
            />
          </label>
          <label class="reminder-field">
            <span>Tipo de pago</span>
            <v-select
              v-model="tipoPago"
              :items="tipoPagoOptions"
              :menu-props="{ contentClass: 'reminder-select-menu' }"
              aria-label="Tipo de pago"
              placeholder="Selecciona el servicio"
              persistent-placeholder
              density="compact"
              hide-details="auto"
              :error-messages="submitAttempted && !tipoPago ? ['Selecciona un tipo de pago'] : []"
            />
          </label>

          <v-radio-group v-model="recurrencia" inline hide-details class="reminder-recurrence">
            <template #label>
              <span class="text-caption font-weight-bold text-uppercase">Recurrencia</span>
            </template>
            <v-radio label="Único" value="unico" />
            <v-radio label="Cada mes" value="mensual" />
          </v-radio-group>

          <label class="reminder-field">
            <span>{{ recurrencia === 'unico' ? 'Fecha' : 'Día del mes' }}</span>
            <v-text-field
              v-if="recurrencia === 'unico'"
              v-model="fecha"
              type="date"
              aria-label="Fecha"
              density="compact"
              hide-details="auto"
              :error-messages="submitAttempted && !fecha ? ['Selecciona una fecha'] : []"
            />
            <v-text-field
              v-else
              v-model.number="diaDelMes"
              type="number"
              min="1"
              max="31"
              aria-label="Día del mes"
              placeholder="Ej. 15"
              density="compact"
              hide-details="auto"
              :error-messages="submitAttempted && !diaDelMes ? ['Indica el día del mes (1-31)'] : []"
            />
          </label>

          <label class="reminder-field reminder-field--note">
            <span>Nota <small>opcional</small></span>
            <v-textarea
              v-model="nota"
              aria-label="Nota opcional"
              placeholder="Ej. Verificar tanque de gas antes de pagar..."
              rows="2"
              density="compact"
              hide-details="auto"
            />
          </label>
        </div>
      </v-card-text>

      <v-card-actions class="reminder-dialog-actions">
        <v-spacer />
        <v-btn class="reminder-cancel" variant="outlined" @click="open = false">Cancelar</v-btn>
        <v-btn class="reminder-save" prepend-icon="mdi-check" :loading="submitting" @click="onSubmit">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.reminder-dialog-card {
  overflow: hidden;
  border: 1px solid #8fc4da;
  border-radius: 18px !important;
  background: #e4f1f6;
  box-shadow: 0 24px 60px rgb(4 54 88 / 28%) !important;
}

.reminder-dialog-header {
  padding: 14px 17px !important;
  background: #075f99;
  color: #fff;
}

.reminder-dialog-header__content {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
}

.reminder-dialog-header__icon {
  display: grid;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  place-items: center;
  background: #ff791f;
  box-shadow: 0 7px 16px rgb(0 0 0 / 14%);
}

.reminder-dialog-header h2 {
  font-size: 1rem;
  font-weight: 700;
}

.reminder-close {
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 10px !important;
  background: rgb(255 255 255 / 10%);
  color: #fff !important;
}

.reminder-dialog-body {
  padding: 18px !important;
  background: #e4f1f6;
}

.reminder-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
  gap: 14px 16px;
}

.reminder-dialog-body :deep(.v-field) {
  border-radius: 10px;
  background: #fff;
  color: #123c56;
  --v-field-border-opacity: 0.72;
}

.reminder-dialog-body :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgb(8 111 165 / 14%);
  --v-field-border-opacity: 1;
}

.reminder-dialog-body :deep(.v-field-label),
.reminder-dialog-body :deep(.v-label) {
  color: #315c75 !important;
  font-size: 0.76rem;
  font-weight: 700;
  opacity: 1 !important;
}

.reminder-dialog-body :deep(.v-field__outline) {
  color: #78a9c0;
}

.reminder-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #17445f;
  font-size: 0.76rem;
  font-weight: 700;
}

.reminder-field--note {
  grid-column: 1 / -1;
}

.reminder-field small {
  color: #6a8292;
  font-size: 0.66rem;
  font-weight: 500;
}

.reminder-field > :deep(.v-input) {
  width: 100%;
}

.reminder-standalone-label {
  margin: 0 4px -8px;
  color: #17445f;
  font-size: 0.76rem;
  font-weight: 700;
}

.reminder-standalone-label small {
  color: #527388;
  font-size: 0.66rem;
  font-weight: 500;
}

.reminder-recurrence {
  min-height: 66px;
  padding: 6px 11px;
  border: 1px solid #b8d7e5;
  border-radius: 11px;
  background: #fff;
}

.reminder-recurrence :deep(.v-selection-control--dirty .v-selection-control__input) {
  color: #0872a5;
}

.reminder-dialog-actions {
  padding: 12px 16px !important;
  border-top: 1px solid #c5dfe9;
  background: #fff;
}

.reminder-cancel {
  border-color: #9fc4d5 !important;
  color: #45677c !important;
}

.reminder-save {
  border: 1px solid #075f99;
  border-radius: 10px !important;
  background: #0878aa !important;
  box-shadow: 0 8px 18px rgb(7 71 112 / 28%);
  color: #fff !important;
  transition: transform 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.reminder-save:hover {
  background: #075f99 !important;
  box-shadow: 0 11px 23px rgb(7 71 112 / 35%);
  transform: translateY(-1px);
}

:global(.reminder-select-menu) {
  overflow: hidden;
  border: 1px solid #8fc5d9;
  border-radius: 14px !important;
  background: #edf7fa !important;
  box-shadow: 0 14px 30px rgb(7 70 112 / 18%) !important;
}

:global(.reminder-select-menu .v-list) {
  padding: 7px;
  background: #edf7fa !important;
}

:global(.reminder-select-menu .v-list-item) {
  min-height: 42px;
  margin: 3px 0;
  border-radius: 10px;
  color: #17445f;
  font-size: 0.78rem;
}

:global(.reminder-select-menu .v-list-item:hover) {
  background: #d8edf5 !important;
}

:global(.reminder-select-menu .v-list-item--active) {
  background: #c2e2ef !important;
  color: #075f99 !important;
  font-weight: 700;
}

@media (max-width: 620px) {
  .reminder-form-grid {
    grid-template-columns: 1fr;
  }

  .reminder-field--note {
    grid-column: auto;
  }
}
</style>
