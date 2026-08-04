<script setup lang="ts">
import type { CreateFundRequestPayload } from '~/types'

interface ConceptRow {
  key: string
  expenseType: string
  incrementType: string
  casa: number | null
  provider: string
  amount: number | null
  document: File | null
  comment: string
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function createConceptRow(): ConceptRow {
  return {
    key: crypto.randomUUID(),
    expenseType: expenseTypeOptions[0],
    incrementType: '',
    casa: null,
    provider: '',
    amount: null,
    document: null,
    comment: '',
  }
}

const open = defineModel<boolean>({ default: false })

const store = useRequestsStore()
const casasStore = useCasasStore()
const { t } = useI18n()

const expenseTypeOptions = ['Luz', 'Agua', 'Limpieza', 'Gas', 'Internet', 'Otros']
const incrementTypeOptions = ['Ventanilla Bancaria', 'Cajero Automático', 'Pago en establecimiento']
const providerOptions = [
  'CFE',
  'Telmex',
  'Agua y Saneamiento',
  'Servicios de Limpieza del Norte',
  'Otro',
]
// TODO: sin catálogo de tarjetas bancarias todavía (no existe endpoint en el
// backend). Reemplazar por un fetch real cuando exista.
const cardOptions = [
  'Tarjeta CFE ****1234',
  'Tarjeta Telmex ****5678',
  'Tarjeta General ****9012',
  'Abastecedora - BBVA BANCOMER - 01',
]

const casaOptions = computed(() =>
  casasStore.items.map((c) => ({ title: `${c.empresa} · ${c.nombre}`, value: c.id })),
)

const card = ref('')
const concepts = ref<ConceptRow[]>([createConceptRow()])
const submitAttempted = ref(false)

const cardError = computed(() =>
  submitAttempted.value && !card.value ? t('requests.modal.errors.card') : null,
)

function addConcept() {
  concepts.value.push(createConceptRow())
}

function removeConcept(key: string) {
  if (concepts.value.length > 1) {
    concepts.value = concepts.value.filter((row) => row.key !== key)
  }
}

function conceptRowError(row: ConceptRow): string | null {
  if (!submitAttempted.value) return null
  if (!row.expenseType) return t('requests.modal.errors.expenseType')
  if (!row.incrementType) return t('requests.modal.errors.incrementType')
  if (row.casa == null) return t('requests.modal.errors.casa')
  if (!row.provider) return t('requests.modal.errors.provider')
  if (!row.amount || Number(row.amount) <= 0) return t('requests.modal.errors.amount')
  if (!row.document) return t('requests.modal.errors.document')
  return null
}

const totalAmount = computed(() =>
  concepts.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
)

const conceptsValid = computed(() =>
  concepts.value.every(
    (row) =>
      row.expenseType &&
      row.incrementType &&
      row.casa != null &&
      row.provider &&
      Number(row.amount) > 0 &&
      row.document,
  ),
)

const submitting = ref(false)
const submitError = ref<string | null>(null)

watch(open, (isOpen) => {
  if (isOpen && casasStore.items.length === 0) {
    casasStore.fetchCasas()
  }
})

function resetFormState() {
  card.value = ''
  concepts.value = [createConceptRow()]
  submitAttempted.value = false
}

async function onSubmit() {
  submitAttempted.value = true
  if (!card.value || !conceptsValid.value) return

  submitting.value = true
  submitError.value = null
  try {
    const payload: CreateFundRequestPayload = {
      requiredDate: todayDate(),
      card: card.value,
      concepts: concepts.value.map((row) => ({
        expenseType: row.expenseType,
        incrementType: row.incrementType,
        casa: row.casa as number,
        provider: row.provider,
        amount: Number(row.amount),
        document: row.document as File,
        comment: row.comment || undefined,
      })),
    }
    await store.createRequest(payload)
    resetFormState()
    open.value = false
  } catch (e) {
    console.error('Error al crear la solicitud de fondos:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    submitError.value =
      fetchError.data?.message || fetchError.message || t('requests.modal.submitError')
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  resetFormState()
  submitError.value = null
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="820" scrollable>
    <v-card>
      <v-card-item class="pa-5 pb-3">
        <div class="d-flex justify-space-between align-start">
          <div>
            <p class="text-caption font-weight-bold text-primary text-uppercase mb-1">
              {{ t('requests.modal.eyebrow') }}
            </p>
            <h2 class="text-h5 font-weight-bold text-secondary">
              {{ t('requests.modal.title') }}
            </h2>
          </div>
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="handleCancel" />
        </div>
      </v-card-item>

      <v-divider />

      <v-card-text class="pa-5">
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('requests.modal.subtitle') }}</p>

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

        <form @submit.prevent="onSubmit">
          <div class="d-flex flex-column ga-3">
            <v-col cols="12" sm="5" class="pa-0">
              <v-select
                v-model="card"
                :items="cardOptions"
                :label="t('requests.modal.fields.card')"
                :placeholder="t('requests.modal.fields.cardPlaceholder')"
                hide-details="auto"
                :error-messages="cardError ? [cardError] : []"
              />
            </v-col>

            <div>
              <div class="d-flex justify-space-between align-center mb-2">
                <p class="text-caption font-weight-bold text-uppercase mb-0">
                  {{ t('requests.modal.fields.concepts') }}
                </p>
                <v-btn
                  variant="text"
                  size="small"
                  color="primary"
                  prepend-icon="mdi-plus"
                  @click="addConcept"
                >
                  {{ t('requests.modal.addConcept') }}
                </v-btn>
              </div>

              <v-card
                v-for="(row, index) in concepts"
                :key="row.key"
                variant="outlined"
                class="pa-3 mb-3"
              >
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-caption font-weight-bold text-medium-emphasis">
                    {{ t('requests.modal.conceptLabel', { n: index + 1 }) }}
                  </span>
                  <v-btn
                    v-if="concepts.length > 1"
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    density="comfortable"
                    @click="removeConcept(row.key)"
                  />
                </div>

                <v-row dense>
                  <v-col cols="6" sm="3">
                    <v-select
                      v-model="row.expenseType"
                      :items="expenseTypeOptions"
                      :label="t('requests.modal.fields.expenseType')"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6" sm="3">
                    <v-select
                      v-model="row.incrementType"
                      :items="incrementTypeOptions"
                      :label="t('requests.modal.fields.incrementType')"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6" sm="3">
                    <v-select
                      v-model="row.casa"
                      :items="casaOptions"
                      :label="t('requests.modal.fields.casa')"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6" sm="3">
                    <v-combobox
                      v-model="row.provider"
                      :items="providerOptions"
                      :label="t('requests.modal.fields.provider')"
                      :placeholder="t('requests.modal.fields.providerPlaceholder')"
                      hide-details="auto"
                    />
                  </v-col>
                </v-row>

                <v-row dense class="mt-0">
                  <v-col cols="6" sm="3">
                    <v-text-field
                      v-model="row.amount"
                      type="number"
                      prefix="$"
                      :label="t('requests.modal.fields.amount')"
                      placeholder="0.00"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6" sm="3">
                    <v-file-input
                      v-model="row.document"
                      :label="t('requests.modal.fields.document')"
                      accept="application/pdf,image/*"
                      prepend-icon=""
                      prepend-inner-icon="mdi-paperclip"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="row.comment"
                      :label="t('requests.modal.fields.comment')"
                      :placeholder="t('requests.modal.fields.commentPlaceholder')"
                      hide-details="auto"
                    />
                  </v-col>
                </v-row>

                <p v-if="conceptRowError(row)" class="text-caption text-error mb-0 mt-1">
                  {{ conceptRowError(row) }}
                </p>
              </v-card>

              <div class="d-flex justify-end">
                <span class="text-body-2 font-weight-bold">
                  {{ t('requests.modal.total') }}: {{ formatCurrency(totalAmount) }}
                </span>
              </div>
            </div>
          </div>
        </form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" color="secondary" @click="handleCancel">
          {{ t('requests.modal.cancel') }}
        </v-btn>
        <v-btn color="primary" :loading="submitting" @click="onSubmit">
          {{ t('requests.modal.submit') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
