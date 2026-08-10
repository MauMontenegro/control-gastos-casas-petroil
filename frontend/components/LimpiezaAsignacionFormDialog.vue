<script setup lang="ts">
import type { CreateLimpiezaAsignacionPayload, LimpiezaAsignacion } from '~/types'

const props = defineProps<{ editingAsignacion: LimpiezaAsignacion | null }>()
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ saved: [] }>()

const store = useLimpiezaStore()
const casasStore = useCasasStore()

const bancoOptions = ['BBVA', 'Banamex', 'Banco Azteca', 'Coppel', 'Santander', 'Spin', 'Otro']

const casa = ref<number | null>(null)
const personaNombre = ref('')
const banco = ref('')
const tarjeta = ref('')
const tarifaDiaria = ref<number | null>(null)

const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitAttempted = ref(false)

const casaOptions = computed(() =>
  casasStore.items.map((c) => ({ title: `${c.empresa} · ${c.nombre}`, value: c.id })),
)

function resetForm() {
  submitAttempted.value = false
  submitError.value = null
  if (props.editingAsignacion) {
    casa.value = props.editingAsignacion.casa
    personaNombre.value = props.editingAsignacion.personaNombre
    banco.value = props.editingAsignacion.banco
    tarjeta.value = props.editingAsignacion.tarjeta
    tarifaDiaria.value = props.editingAsignacion.tarifaDiaria
  } else {
    casa.value = null
    personaNombre.value = ''
    banco.value = ''
    tarjeta.value = ''
    tarifaDiaria.value = null
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  if (casasStore.items.length === 0) casasStore.fetchCasas()
  resetForm()
})

const isValid = computed(
  () =>
    casa.value != null &&
    !!personaNombre.value.trim() &&
    !!banco.value &&
    !!tarjeta.value.trim() &&
    !!tarifaDiaria.value &&
    tarifaDiaria.value > 0,
)

async function onSubmit() {
  submitAttempted.value = true
  if (!isValid.value) return

  submitting.value = true
  submitError.value = null
  try {
    const payload: CreateLimpiezaAsignacionPayload = {
      casa: casa.value as number,
      personaNombre: personaNombre.value.trim(),
      banco: banco.value,
      tarjeta: tarjeta.value.trim(),
      tarifaDiaria: tarifaDiaria.value as number,
    }
    if (props.editingAsignacion) {
      await store.updateAsignacion(props.editingAsignacion.id, payload)
    } else {
      await store.createAsignacion(payload)
    }
    emit('saved')
    open.value = false
  } catch (e) {
    console.error('Error al guardar la asignación de limpieza:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    submitError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar la asignación.'
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
              Limpieza
            </p>
            <h2 class="text-h5 font-weight-bold text-secondary">
              {{ editingAsignacion ? 'Editar asignación' : 'Nueva asignación' }}
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
          <v-text-field
            v-model="personaNombre"
            label="Nombre de la persona"
            placeholder="Ej. Itzel"
            hide-details="auto"
            :error-messages="
              submitAttempted && !personaNombre.trim() ? ['Ingresa el nombre'] : []
            "
          />
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="banco"
                :items="bancoOptions"
                label="Banco"
                hide-details="auto"
                :error-messages="submitAttempted && !banco ? ['Selecciona un banco'] : []"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="tarjeta"
                label="Tarjeta"
                placeholder="0000 0000 0000 0000"
                hide-details="auto"
                :error-messages="
                  submitAttempted && !tarjeta.trim() ? ['Ingresa el número de tarjeta'] : []
                "
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model.number="tarifaDiaria"
            type="number"
            prefix="$"
            label="Tarifa diaria"
            placeholder="0.00"
            hide-details="auto"
            :error-messages="
              submitAttempted && !(tarifaDiaria && tarifaDiaria > 0)
                ? ['Ingresa un importe válido']
                : []
            "
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
