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
  <v-dialog v-model="open" max-width="520">
    <v-card>
      <v-card-item class="pa-5 pb-3">
        <div class="d-flex justify-space-between align-start">
          <div>
            <p class="text-caption font-weight-bold text-primary text-uppercase mb-1">
              Calendario
            </p>
            <h2 class="text-h5 font-weight-bold text-secondary">
              {{ editingEvent ? 'Editar recordatorio' : 'Nuevo recordatorio' }}
            </h2>
          </div>
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="open = false" />
        </div>
      </v-card-item>

      <v-divider />

      <v-card-text class="pa-5">
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

        <div class="d-flex flex-column ga-3">
          <v-select
            v-model="casa"
            :items="casaOptions"
            label="Casa Petroil"
            hide-details="auto"
            :error-messages="submitAttempted && casa == null ? ['Selecciona una casa'] : []"
          />
          <v-select
            v-model="tipoPago"
            :items="tipoPagoOptions"
            label="Tipo de pago"
            hide-details="auto"
            :error-messages="submitAttempted && !tipoPago ? ['Selecciona un tipo de pago'] : []"
          />

          <v-radio-group v-model="recurrencia" inline hide-details class="mt-0 mb-0">
            <template #label>
              <span class="text-caption font-weight-bold text-uppercase">Recurrencia</span>
            </template>
            <v-radio label="Único" value="unico" />
            <v-radio label="Cada mes" value="mensual" />
          </v-radio-group>

          <v-text-field
            v-if="recurrencia === 'unico'"
            v-model="fecha"
            type="date"
            label="Fecha"
            hint="Se respetará esta fecha y también se preparará en el viernes anterior."
            persistent-hint
            :error-messages="submitAttempted && !fecha ? ['Selecciona una fecha'] : []"
          />
          <v-text-field
            v-else
            v-model.number="diaDelMes"
            type="number"
            min="1"
            max="31"
            label="Día del mes"
            placeholder="Ej. 15"
            hint="Cada ocurrencia conservará su día y se preparará en el viernes anterior."
            persistent-hint
            :error-messages="
              submitAttempted && !diaDelMes ? ['Indica el día del mes (1-31)'] : []
            "
          />

          <v-textarea
            v-model="nota"
            label="Nota (opcional)"
            placeholder="Ej. Verificar tanque de gas antes de pagar..."
            rows="2"
            hide-details="auto"
          />
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" color="secondary" @click="open = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="submitting" @click="onSubmit">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
