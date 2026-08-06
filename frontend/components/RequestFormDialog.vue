<script setup lang="ts">
import type { CreateFundRequestPayload } from '~/types'
import { useOcrRepository } from '~/repositories/ocrRepository'

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

async function addConcept() {
  const row = createConceptRow()
  concepts.value.push(row)

  await nextTick()
  document
    .querySelector<HTMLElement>(`[data-concept-key="${row.key}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function removeConcept(key: string) {
  if (concepts.value.length > 1) {
    concepts.value = concepts.value.filter((row) => row.key !== key)
  }
}

// El "Tipo de Incremento" se deriva del tipo de gasto: Limpieza siempre se
// paga en cajero (no hay ventanilla/establecimiento para eso), el resto en
// establecimiento por default. El usuario puede cambiarlo a mano después.
function deriveIncrementType(expenseType: string): string {
  return expenseType === 'Limpieza' ? 'Cajero Automático' : 'Pago en establecimiento'
}

// En el cajero automático solo se puede retirar en múltiplos de $100 — se
// redondea siempre hacia arriba (1353 -> 1400) para no quedar corto.
function applyCajeroRounding(row: ConceptRow) {
  if (row.incrementType === 'Cajero Automático' && row.amount) {
    row.amount = Math.ceil(row.amount / 100) * 100
  }
}

function onIncrementTypeChange(row: ConceptRow, value: string) {
  row.incrementType = value
  applyCajeroRounding(row)
}

function onExpenseTypeChange(row: ConceptRow, value: string) {
  row.expenseType = value
  row.incrementType = deriveIncrementType(value)
  row.comment = `Pago de ${value}`
  applyCajeroRounding(row)
}

function onAmountBlur(row: ConceptRow) {
  applyCajeroRounding(row)
}

const ocrProcessingKey = ref<string | null>(null)
const ocrNotice = reactive<Record<string, string>>({})

async function onDocumentSelected(row: ConceptRow, fileOrFiles: File | File[] | null) {
  const file = Array.isArray(fileOrFiles) ? (fileOrFiles[0] ?? null) : fileOrFiles
  row.document = file
  ocrNotice[row.key] = ''
  if (!file) return

  ocrProcessingKey.value = row.key
  try {
    const result = await useOcrRepository().extractFundRequestDocument(file)
    if (result.expenseType) row.expenseType = result.expenseType
    if (result.provider) row.provider = result.provider
    row.incrementType = deriveIncrementType(row.expenseType)
    if (result.amount != null) {
      row.amount = result.amount
      applyCajeroRounding(row)
    }
    if (result.expenseType) row.comment = `Pago de ${result.expenseType}`

    ocrNotice[row.key] =
      result.expenseType || result.provider || result.amount != null
        ? 'Datos completados automáticamente — revísalos antes de enviar.'
        : 'No se pudo leer el documento automáticamente, completa los campos a mano.'
  } catch (e) {
    console.error('Error al leer el documento con OCR:', e)
    const backendMessage = (e as { data?: { message?: string } })?.data?.message
    ocrNotice[row.key] = backendMessage
      ? backendMessage
      : 'No se pudo leer el documento automáticamente, completa los campos a mano.'
  } finally {
    ocrProcessingKey.value = null
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
  <v-dialog v-model="open" max-width="960" scrollable class="request-dialog">
    <v-card class="request-dialog-card">
      <v-card-item class="request-dialog-header">
        <div class="request-dialog-header__content">
          <span class="request-dialog-header__icon">
            <v-icon icon="mdi-file-document-plus-outline" size="24" />
          </span>
          <div class="request-dialog-header__copy">
            <h2>Nueva solicitud</h2>
          </div>
          <v-btn class="request-dialog-close" icon="mdi-close" variant="text" density="comfortable" @click="handleCancel" />
        </div>
      </v-card-item>

      <v-divider />

      <v-card-text class="request-dialog-body">
        <div class="request-dialog-intro">
          <v-icon icon="mdi-information-outline" size="18" />
          <span>{{ t('requests.modal.subtitle') }}</span>
        </div>

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
          <div class="request-form-layout">
            <div class="request-card-selector">
              <div class="request-card-selector__copy">
                <strong>Cuenta de origen</strong>
              </div>
              <v-select
                v-model="card"
                :items="cardOptions"
                :menu-props="{ contentClass: 'request-select-menu' }"
                :label="t('requests.modal.fields.card')"
                :placeholder="t('requests.modal.fields.cardPlaceholder')"
                hide-details="auto"
                :error-messages="cardError ? [cardError] : []"
              />
              <div class="request-total">
                <div>
                  <span>Total de la solicitud</span>
                </div>
                <strong>{{ formatCurrency(totalAmount) }}</strong>
              </div>
            </div>

            <div class="concepts-section">
              <div class="concepts-section__heading">
                <div>
                  <strong>
                  {{ t('requests.modal.fields.concepts') }}
                  </strong>
                </div>
                <v-btn
                  class="add-concept-button"
                  icon="mdi-plus"
                  size="small"
                  aria-label="Agregar concepto"
                  title="Agregar concepto"
                  @click="addConcept"
                />
              </div>

              <v-card
                v-for="row in concepts"
                :key="row.key"
                :data-concept-key="row.key"
                variant="outlined"
                class="concept-card"
              >
                <div class="concept-card__heading">
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
                  <v-col cols="12" sm="4">
                    <v-select
                      v-model="row.casa"
                      :items="casaOptions"
                      :menu-props="{ contentClass: 'request-select-menu' }"
                      :label="t('requests.modal.fields.casa')"
                      placeholder="Selecciona una casa"
                      persistent-placeholder
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-select
                      :model-value="row.expenseType"
                      :items="expenseTypeOptions"
                      :menu-props="{ contentClass: 'request-select-menu' }"
                      :label="t('requests.modal.fields.expenseType')"
                      placeholder="Selecciona el tipo de gasto"
                      persistent-placeholder
                      hide-details="auto"
                      @update:model-value="(v) => onExpenseTypeChange(row, v)"
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-combobox
                      v-model="row.provider"
                      :items="providerOptions"
                      :menu-props="{ contentClass: 'request-select-menu' }"
                      :label="t('requests.modal.fields.provider')"
                      placeholder="Selecciona o escribe un proveedor"
                      persistent-placeholder
                      hide-details="auto"
                    />
                  </v-col>
                </v-row>

                <v-row dense class="concept-fields-row">
                  <v-col cols="12" sm="5">
                    <v-select
                      :model-value="row.incrementType"
                      :items="incrementTypeOptions"
                      :menu-props="{ contentClass: 'request-select-menu' }"
                      :label="t('requests.modal.fields.incrementType')"
                      placeholder="Selecciona el incremento"
                      persistent-placeholder
                      hide-details="auto"
                      @update:model-value="(v) => onIncrementTypeChange(row, v)"
                    />
                  </v-col>
                  <v-col cols="12" sm="3">
                    <v-text-field
                      v-model="row.amount"
                      type="number"
                      prefix="$"
                      :label="t('requests.modal.fields.amount')"
                      placeholder="0.00"
                      persistent-placeholder
                      hide-details="auto"
                      @blur="onAmountBlur(row)"
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-file-input
                      :model-value="row.document"
                      :label="t('requests.modal.fields.document')"
                      placeholder="Adjunta un archivo"
                      persistent-placeholder
                      accept="application/pdf,image/*"
                      prepend-icon=""
                      prepend-inner-icon="mdi-paperclip"
                      :loading="ocrProcessingKey === row.key"
                      hide-details="auto"
                      @update:model-value="(file) => onDocumentSelected(row, file)"
                    />
                    <p v-if="ocrNotice[row.key]" class="ocr-notice">
                      <v-icon icon="mdi-auto-fix" size="12" />
                      {{ ocrNotice[row.key] }}
                    </p>
                  </v-col>
                </v-row>

                <v-row dense class="concept-fields-row">
                  <v-col cols="12">
                    <v-textarea
                      v-model="row.comment"
                      :label="t('requests.modal.fields.comment')"
                      placeholder="Explica brevemente el motivo"
                      persistent-placeholder
                      rows="2"
                      auto-grow
                      hide-details="auto"
                    />
                  </v-col>
                </v-row>

                <p v-if="conceptRowError(row)" class="text-caption text-error mb-0 mt-1">
                  {{ conceptRowError(row) }}
                </p>
              </v-card>

            </div>
          </div>
        </form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="request-dialog-actions">
        <v-spacer />
        <v-btn class="request-cancel-button" variant="outlined" @click="handleCancel">
          {{ t('requests.modal.cancel') }}
        </v-btn>
        <v-btn class="request-submit-button" prepend-icon="mdi-check" :loading="submitting" @click="onSubmit">
          {{ t('requests.modal.submit') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.request-dialog-card {
  overflow: hidden;
  border: 1px solid rgb(151 194 213 / 70%);
  border-radius: 20px !important;
  background: #edf6fa;
  color: #123c56;
  font-family: Arial, Helvetica, sans-serif;
  box-shadow: 0 28px 80px rgb(0 42 70 / 28%) !important;
}

.request-dialog-header {
  padding: 15px 18px !important;
  background: linear-gradient(115deg, #064f80, #0877a8 68%, #1594bf);
  color: #fff;
}

.request-dialog-header__content {
  display: flex;
  align-items: center;
  gap: 13px;
}

.request-dialog-header__icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 14px;
  place-items: center;
  background: linear-gradient(145deg, #ff963e, #ff6f1a);
  box-shadow: 0 8px 18px rgb(0 40 65 / 20%);
}

.request-dialog-header__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.request-dialog-header__copy h2 {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.request-dialog-close {
  border: 1px solid rgb(255 255 255 / 16%);
  background: rgb(255 255 255 / 9%);
  color: #fff;
}

.request-dialog-body {
  padding: 17px 18px 20px !important;
  background: #b9d8e5;
}

.request-dialog-intro {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  margin-bottom: 13px;
  border: 1px solid #c7e0eb;
  border-radius: 10px;
  background: rgb(255 255 255 / 75%);
  color: #537287;
  font-size: 0.7rem;
}

.request-dialog-intro :deep(.v-icon) {
  color: #0a7cad;
}

.request-form-layout {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.request-card-selector {
  position: sticky;
  z-index: 5;
  top: 0;
  display: grid;
  grid-template-columns: minmax(120px, 0.5fr) minmax(240px, 1.4fr) minmax(145px, 0.55fr);
  align-items: center;
  gap: 11px;
  padding: 12px 13px;
  border: 1px solid #c5dfe9;
  border-left: 4px solid #1594bf;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 7px 18px rgb(7 95 153 / 7%);
}

.request-card-selector__copy,
.concepts-section__heading > div > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.request-card-selector__copy strong,
.concepts-section__heading strong {
  color: #123c56;
  font-size: 0.78rem;
  font-weight: 700;
}

.request-card-selector__copy small,
.concepts-section__heading small {
  margin-top: 2px;
  color: #718797;
  font-size: 0.62rem;
}

.request-dialog-body :deep(.v-field) {
  border-radius: 9px;
  background: #fff;
  color: #183e5c;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.74rem;
  --v-field-border-opacity: 0.72;
}

.request-dialog-body :deep(.v-field--focused) {
  background: #fff;
  box-shadow: 0 0 0 3px rgb(8 111 165 / 14%);
  --v-field-border-opacity: 1;
}

.request-dialog-body :deep(.v-field-label),
.request-dialog-body :deep(.v-label) {
  color: #315c75 !important;
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 1 !important;
}

.request-dialog-body :deep(.v-field__input) {
  min-height: 48px;
  color: #123c56;
  font-size: 0.76rem;
  font-weight: 600;
  opacity: 1;
}

.request-dialog-body :deep(input::placeholder),
.request-dialog-body :deep(textarea::placeholder) {
  color: #6f8798 !important;
  font-weight: 500;
  opacity: 1;
}

.request-dialog-body :deep(.v-field__outline) {
  color: #78a9c0;
}

.concepts-section {
  padding: 13px;
  border: 1px solid #c5dfe9;
  border-radius: 14px;
  background: rgb(255 255 255 / 84%);
}

.concepts-section__heading {
  position: sticky;
  z-index: 4;
  top: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 7px 9px;
  margin: -5px -5px 10px;
  border: 1px solid #c3dfeb;
  border-radius: 11px;
  background: rgb(255 255 255 / 98%);
  box-shadow: 0 6px 15px rgb(7 95 153 / 9%);
  backdrop-filter: blur(7px);
}

.concepts-section__heading > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.add-concept-button {
  border: 1px solid #0872a5;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #1594bf, #0872a5) !important;
  box-shadow: 0 6px 13px rgb(8 114 165 / 24%);
  color: #fff !important;
}

.concept-card {
  scroll-margin-top: 145px;
  padding: 13px 14px 11px;
  margin-bottom: 10px;
  border: 1px solid #c7dfe9 !important;
  border-top: 3px solid #1685b3 !important;
  border-radius: 12px !important;
  background: #fff !important;
  box-shadow: 0 6px 15px rgb(7 95 153 / 6%);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.concept-card:hover {
  border-color: #8fc4d9 !important;
  box-shadow: 0 10px 22px rgb(7 95 153 / 10%);
  transform: translateY(-1px);
}

.concept-card__heading {
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: flex-end;
}

.concept-fields-row {
  margin-top: 5px;
}

.ocr-notice {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 2px 0;
  color: #0872a5;
  font-size: 0.65rem;
  font-weight: 600;
}

.concept-group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 1px 4px 4px;
  color: #56758a;
  font-size: 0.61rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.concept-group-label::before {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1594bf;
  content: '';
}

.concept-group-label--spaced {
  margin-top: 8px;
}

.request-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  min-width: 145px;
  padding: 9px 11px;
  border-radius: 11px;
  background: linear-gradient(110deg, #075f99, #087cae);
  box-shadow: 0 8px 18px rgb(7 95 153 / 18%);
  color: #fff;
}

.request-total > div {
  display: flex;
  flex-direction: column;
}

.request-total span {
  font-size: 0.7rem;
  font-weight: 700;
}

.request-total small {
  color: rgb(255 255 255 / 67%);
  font-size: 0.59rem;
}

.request-total > strong {
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
}

.request-dialog-actions {
  gap: 8px;
  padding: 12px 18px !important;
  background: #fff;
}

.request-cancel-button,
.request-submit-button {
  min-height: 38px;
  padding-inline: 18px !important;
  border-radius: 9px !important;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: none;
}

.request-cancel-button {
  border-color: #a9c9d8 !important;
  color: #45677c !important;
}

.request-submit-button {
  background: linear-gradient(135deg, #ff8a2b, #f36b1b) !important;
  box-shadow: 0 7px 15px rgb(243 107 27 / 24%);
  color: #fff !important;
}

@media (max-width: 700px) {
  .request-card-selector {
    grid-template-columns: 1fr;
  }

  .request-card-selector :deep(.v-input) {
    grid-column: 1 / -1;
  }

  .request-total {
    grid-column: 1 / -1;
    width: 100%;
    align-items: flex-start;
  }
}

:global(.request-select-menu) {
  overflow: hidden;
  border: 1px solid #4c9cbe;
  border-radius: 14px !important;
  background: #b9ddea !important;
  box-shadow: 0 14px 30px rgb(7 70 112 / 18%) !important;
}

:global(.request-select-menu .v-list) {
  padding: 7px;
  background: linear-gradient(145deg, #d1eaf4, #afd5e5) !important;
}

:global(.request-select-menu .v-list-item) {
  min-height: 42px;
  margin: 3px 0;
  border-radius: 10px;
  color: #17445f;
  font-size: 0.78rem;
  transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

:global(.request-select-menu .v-list-item:hover) {
  background: #91c9df !important;
  color: #075f99;
  transform: translateX(2px);
}

:global(.request-select-menu .v-list-item--active) {
  background: #78bbd6 !important;
  color: #075f99 !important;
  font-weight: 700;
}

:global(.request-select-menu .v-list-item-title) {
  font-size: 0.78rem;
  line-height: 1.25rem;
}
</style>
