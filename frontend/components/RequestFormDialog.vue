<script setup lang="ts">
import type { CreateFundRequestPayload } from '~/types'

interface RequestFormValues {
  branch: string
  card: string
  expenseType: string
  provider: string
  comment?: string
}

interface ConceptRow {
  key: string
  concept: string
  amount: number | null
  document: File | null
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function createConceptRow(): ConceptRow {
  return {
    key: crypto.randomUUID(),
    concept: '',
    amount: null,
    document: null,
  }
}

const open = defineModel<boolean>({ default: false })

const store = useRequestsStore()
const branchesStore = useBranchesStore()
const { t } = useI18n()

const conceptOptions = [
  'Servicios recurrentes',
  'Limpieza semanal',
  'Mantenimiento',
  'Nómina',
  'Otro',
]
const expenseTypeOptions = ['Servicio recurrente', 'Gasto único', 'Mantenimiento', 'Nómina', 'Otro']
const providerOptions = [
  'CFE',
  'Telmex',
  'Agua y Saneamiento',
  'Servicios de Limpieza del Norte',
  'Otro',
]
// TODO: sin catálogo de tarjetas bancarias todavía (no existe endpoint en el
// backend). Reemplazar por un fetch real cuando exista.
const cardOptions = ['Tarjeta CFE ****1234', 'Tarjeta Telmex ****5678', 'Tarjeta General ****9012']

const branchOptions = computed(() =>
  branchesStore.items.map((b) => ({ title: b.name.replace('Sucursal ', ''), value: b.id })),
)

const { handleSubmit, defineField, errors, resetForm, setFieldValue, values } =
  useForm<RequestFormValues>({
    initialValues: {
      expenseType: expenseTypeOptions[0],
    },
    validationSchema: {
      branch: (value: string) => !!value || t('requests.modal.errors.branch'),
      card: (value: string) => !!value || t('requests.modal.errors.card'),
      expenseType: (value: string) => !!value || t('requests.modal.errors.expenseType'),
      provider: (value: string) => !!value || t('requests.modal.errors.provider'),
    },
  })

const [branch, branchAttrs] = defineField('branch')
const [card, cardAttrs] = defineField('card')
const [expenseType, expenseTypeAttrs] = defineField('expenseType')
const [provider, providerAttrs] = defineField('provider')
const [comment, commentAttrs] = defineField('comment')

const concepts = ref<ConceptRow[]>([createConceptRow()])
const conceptsSubmitAttempted = ref(false)

function addConcept() {
  concepts.value.push(createConceptRow())
}

function removeConcept(key: string) {
  if (concepts.value.length > 1) {
    concepts.value = concepts.value.filter((row) => row.key !== key)
  }
}

function conceptRowError(row: ConceptRow): string | null {
  if (!conceptsSubmitAttempted.value) return null
  if (!row.concept) return t('requests.modal.errors.concept')
  if (!row.amount || Number(row.amount) <= 0) return t('requests.modal.errors.amount')
  if (!row.document) return t('requests.modal.errors.document')
  return null
}

const totalAmount = computed(() =>
  concepts.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
)

const conceptsValid = computed(() =>
  concepts.value.every((row) => row.concept && Number(row.amount) > 0 && row.document),
)

const submitting = ref(false)
const submitError = ref<string | null>(null)

watch(open, (isOpen) => {
  if (isOpen && branchesStore.items.length === 0) {
    branchesStore.fetchBranches()
  }
})

watch(
  () => branchesStore.items,
  (items) => {
    if (items.length && !values.branch) {
      setFieldValue('branch', items[0].id)
    }
  },
  { immediate: true },
)

function resetConcepts() {
  concepts.value = [createConceptRow()]
  conceptsSubmitAttempted.value = false
}

const onSubmit = handleSubmit(async (submittedValues) => {
  conceptsSubmitAttempted.value = true
  if (!conceptsValid.value) return

  submitting.value = true
  submitError.value = null
  try {
    const payload: CreateFundRequestPayload = {
      requiredDate: todayDate(),
      branch: submittedValues.branch,
      card: submittedValues.card,
      expenseType: submittedValues.expenseType,
      provider: submittedValues.provider,
      comment: submittedValues.comment || undefined,
      concepts: concepts.value.map((row) => ({
        concept: row.concept,
        amount: Number(row.amount),
        document: row.document as File,
      })),
    }
    await store.createRequest(payload)
    resetForm()
    resetConcepts()
    open.value = false
  } catch (e) {
    console.error('Error al crear la solicitud de fondos:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    submitError.value =
      fetchError.data?.message || fetchError.message || t('requests.modal.submitError')
  } finally {
    submitting.value = false
  }
})

function handleCancel() {
  resetForm()
  resetConcepts()
  submitError.value = null
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="720" scrollable>
    <v-card>
      <v-card-item class="pa-6 pb-4">
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

      <v-card-text class="pa-6">
        <p class="text-body-2 text-medium-emphasis mb-6">{{ t('requests.modal.subtitle') }}</p>

        <v-alert
          v-if="submitError"
          type="error"
          variant="tonal"
          density="comfortable"
          closable
          class="mb-4"
          @click:close="submitError = null"
        >
          {{ submitError }}
        </v-alert>

        <form @submit.prevent="onSubmit">
          <div class="d-flex flex-column ga-4">
            <v-row dense>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.branch') }}
                </p>
                <v-select
                  v-model="branch"
                  v-bind="branchAttrs"
                  :items="branchOptions"
                  hide-details="auto"
                  :error-messages="errors.branch ? [errors.branch] : []"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.card') }}
                </p>
                <v-select
                  v-model="card"
                  v-bind="cardAttrs"
                  :items="cardOptions"
                  :placeholder="t('requests.modal.fields.cardPlaceholder')"
                  hide-details="auto"
                  :error-messages="errors.card ? [errors.card] : []"
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.expenseType') }}
                </p>
                <v-select
                  v-model="expenseType"
                  v-bind="expenseTypeAttrs"
                  :items="expenseTypeOptions"
                  hide-details="auto"
                  :error-messages="errors.expenseType ? [errors.expenseType] : []"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.provider') }}
                </p>
                <v-combobox
                  v-model="provider"
                  v-bind="providerAttrs"
                  :items="providerOptions"
                  :placeholder="t('requests.modal.fields.providerPlaceholder')"
                  hide-details="auto"
                  :error-messages="errors.provider ? [errors.provider] : []"
                />
              </v-col>
            </v-row>

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
                class="pa-4 mb-3"
              >
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-caption font-weight-bold text-medium-emphasis">
                    {{ t('requests.modal.conceptLabel', { n: index + 1 }) }}
                  </span>
                  <v-btn
                    v-if="concepts.length > 1"
                    icon="mdi-close"
                    variant="text"
                    size="x-small"
                    density="comfortable"
                    @click="removeConcept(row.key)"
                  />
                </div>

                <div class="d-flex flex-column ga-3">
                  <v-combobox
                    v-model="row.concept"
                    :items="conceptOptions"
                    :label="t('requests.modal.fields.concept')"
                    :placeholder="t('requests.modal.fields.conceptPlaceholder')"
                    hide-details="auto"
                  />
                  <v-text-field
                    v-model="row.amount"
                    type="number"
                    prefix="$"
                    :label="t('requests.modal.fields.amount')"
                    placeholder="0.00"
                    hide-details="auto"
                  />
                  <v-file-input
                    v-model="row.document"
                    :label="t('requests.modal.fields.document')"
                    accept="application/pdf,image/*"
                    prepend-icon=""
                    prepend-inner-icon="mdi-paperclip"
                    show-size
                    hide-details="auto"
                  />
                  <p v-if="conceptRowError(row)" class="text-caption text-error mb-0">
                    {{ conceptRowError(row) }}
                  </p>
                </div>
              </v-card>

              <div class="d-flex justify-end">
                <span class="text-body-2 font-weight-bold">
                  {{ t('requests.modal.total') }}: {{ formatCurrency(totalAmount) }}
                </span>
              </div>
            </div>

            <div>
              <p class="text-caption font-weight-bold text-uppercase mb-1">
                {{ t('requests.modal.fields.comment') }}
              </p>
              <v-textarea
                v-model="comment"
                v-bind="commentAttrs"
                rows="3"
                :placeholder="t('requests.modal.fields.commentPlaceholder')"
                hide-details="auto"
              />
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
