<script setup lang="ts">
import type {
  FundRequest,
  FundRequestConceptDetail,
  FundRequestStatus,
  UpdateFundRequestConceptPayload,
} from '~/types'
import { useOcrRepository } from '~/repositories/ocrRepository'
import { expenseTypeOptions, incrementTypeOptions, providerOptions } from '~/utils/fundRequestOptions'
import { deriveIncrementType, roundToCajero } from '~/utils/fundRequestRules'

const props = defineProps<{ request: FundRequest | null }>()
const open = defineModel<boolean>({ default: false })

const config = useRuntimeConfig()
const store = useRequestsStore()
const casasStore = useCasasStore()

function documentHref(documentUrl: string): string {
  // apiBaseUrl ya incluye "/api" (ej. http://localhost:4000/api). El backend
  // ha mandado documentUrl con y sin el prefijo "/api/" en distintos
  // momentos — se le quita si viene duplicado, así funciona con cualquiera
  // de las dos formas y el archivo siempre se resuelve bajo apiBaseUrl.
  const apiBase = (config.public.apiBaseUrl as string).replace(/\/$/, '')
  const path = documentUrl.startsWith('/api/') ? documentUrl.slice(4) : documentUrl
  return `${apiBase}${path}`
}

const casaOptions = computed(() =>
  casasStore.items.map((c) => ({ title: `${c.empresa} · ${c.nombre}`, value: c.id })),
)

function casaIdFor(casaNombre: string): number | null {
  return casasStore.items.find((c) => c.nombre === casaNombre)?.id ?? null
}

watch(open, (isOpen) => {
  if (isOpen && casasStore.items.length === 0) casasStore.fetchCasas()
})

const statusOptions: { title: string; value: FundRequestStatus }[] = [
  { title: 'En revisión', value: 'en-revision' },
  { title: 'Autorizada', value: 'autorizada' },
  { title: 'Corrección', value: 'correccion' },
]
const statusColor: Record<FundRequestStatus, string> = {
  'en-revision': 'info',
  autorizada: 'success',
  correccion: 'error',
}

const updatingStatus = ref(false)
const statusError = ref<string | null>(null)

async function changeStatus(status: FundRequestStatus) {
  if (!props.request || status === props.request.status) return
  updatingStatus.value = true
  statusError.value = null
  try {
    await store.updateStatus(props.request.id, status)
  } catch (e) {
    console.error('Error al cambiar el estatus de la solicitud:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    statusError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo cambiar el estatus.'
  } finally {
    updatingStatus.value = false
  }
}

// Los conceptos solo se editan mientras la solicitud sigue abierta — p. ej.
// los que arma en lote el botón "Crear Solicitudes" del calendario, sin
// proveedor/importe/documento todavía.
const isEditable = computed(() => props.request?.status === 'en-revision')

const savingConceptId = ref<string | null>(null)
const conceptError = ref<string | null>(null)

async function saveConceptField(conceptId: string, payload: UpdateFundRequestConceptPayload) {
  if (!props.request) return
  savingConceptId.value = conceptId
  conceptError.value = null
  try {
    await store.updateConcept(props.request.id, conceptId, payload)
  } catch (e) {
    console.error('Error al guardar el concepto:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    conceptError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar el cambio.'
  } finally {
    savingConceptId.value = null
  }
}

function onExpenseTypeChange(concept: FundRequestConceptDetail, value: string) {
  concept.expenseType = value
  concept.incrementType = deriveIncrementType(value)
  concept.comment = `Pago de ${value}`
  if (concept.incrementType === 'Cajero Automático' && concept.amount) {
    concept.amount = roundToCajero(concept.amount)
  }
  saveConceptField(concept.id, {
    expenseType: concept.expenseType,
    incrementType: concept.incrementType,
    comment: concept.comment,
    amount: concept.amount,
  })
}

function onIncrementTypeChange(concept: FundRequestConceptDetail, value: string) {
  concept.incrementType = value
  if (value === 'Cajero Automático' && concept.amount) concept.amount = roundToCajero(concept.amount)
  saveConceptField(concept.id, { incrementType: value, amount: concept.amount })
}

function onCasaChange(concept: FundRequestConceptDetail, casaId: number) {
  const casa = casasStore.items.find((c) => c.id === casaId)
  if (!casa) return
  concept.casa = casa.nombre
  saveConceptField(concept.id, { casa: casaId })
}

function onAmountBlur(concept: FundRequestConceptDetail) {
  if (concept.incrementType === 'Cajero Automático' && concept.amount) {
    concept.amount = roundToCajero(concept.amount)
  }
  saveConceptField(concept.id, { amount: concept.amount })
}

const ocrProcessingId = ref<string | null>(null)
const ocrNotice = reactive<Record<string, string>>({})

async function onDocumentSelected(
  concept: FundRequestConceptDetail,
  fileOrFiles: File | File[] | null,
) {
  const file = Array.isArray(fileOrFiles) ? (fileOrFiles[0] ?? null) : fileOrFiles
  if (!props.request || !file) return

  ocrProcessingId.value = concept.id
  ocrNotice[concept.id] = ''
  conceptError.value = null
  try {
    await store.uploadConceptDocument(props.request.id, concept.id, file)

    const result = await useOcrRepository().extractFundRequestDocument(file)
    const payload: UpdateFundRequestConceptPayload = {}
    if (result.expenseType) {
      concept.expenseType = result.expenseType
      concept.incrementType = deriveIncrementType(result.expenseType)
      concept.comment = `Pago de ${result.expenseType}`
      payload.expenseType = concept.expenseType
      payload.incrementType = concept.incrementType
      payload.comment = concept.comment
    }
    if (result.provider) {
      concept.provider = result.provider
      payload.provider = result.provider
    }
    if (result.amount != null) {
      concept.amount =
        concept.incrementType === 'Cajero Automático' ? roundToCajero(result.amount) : result.amount
      payload.amount = concept.amount
    }

    ocrNotice[concept.id] = Object.keys(payload).length
      ? 'Datos completados automáticamente — revísalos.'
      : 'Documento adjuntado. No se pudo leer automáticamente, completa los campos a mano.'

    if (Object.keys(payload).length) await saveConceptField(concept.id, payload)
  } catch (e) {
    console.error('Error al procesar el documento:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    conceptError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo adjuntar el documento.'
  } finally {
    ocrProcessingId.value = null
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="960" scrollable class="detail-dialog">
    <v-card v-if="props.request" class="detail-dialog-card">
      <v-card-item class="detail-dialog-header">
        <div class="detail-dialog-header__content">
          <span class="detail-dialog-header__icon">
            <v-icon icon="mdi-file-document-outline" size="24" />
          </span>
          <div class="detail-dialog-header__copy">
            <p class="detail-dialog-header__eyebrow">
              Folio {{ props.request.sippFolio || props.request.folio }}
            </p>
            <h2>Detalle de la solicitud</h2>
            <span>
              Fecha de solicitud: {{ props.request.requiredDate }} · Tarjeta: {{ props.request.card }}
            </span>
          </div>
          <v-btn
            class="detail-dialog-close"
            icon="mdi-close"
            variant="text"
            density="comfortable"
            @click="open = false"
          />
        </div>
      </v-card-item>

      <v-divider />

      <v-card-text class="detail-dialog-body">
        <div class="detail-status-bar">
          <div class="detail-status-bar__field">
            <span>Estatus</span>
            <v-select
              :model-value="props.request.status"
              :items="statusOptions"
              :loading="updatingStatus"
              density="compact"
              hide-details
              class="detail-status-select"
              @update:model-value="changeStatus"
            >
              <template #selection="{ item }">
                <v-chip
                  size="small"
                  :color="statusColor[item.value as FundRequestStatus]"
                  variant="tonal"
                >
                  {{ item.title }}
                </v-chip>
              </template>
            </v-select>
            <p v-if="statusError" class="detail-field-error">{{ statusError }}</p>
          </div>
          <div class="detail-total">
            <span>Total de la solicitud</span>
            <strong>{{ formatCurrency(props.request.total) }}</strong>
          </div>
        </div>

        <v-alert
          v-if="conceptError"
          type="error"
          variant="tonal"
          density="comfortable"
          closable
          class="mb-3"
          @click:close="conceptError = null"
        >
          {{ conceptError }}
        </v-alert>

        <div v-if="isEditable" class="detail-editable-hint">
          <v-icon icon="mdi-information-outline" size="16" />
          <span>La solicitud sigue en revisión — puedes editar cualquier campo de cada concepto.</span>
        </div>

        <div class="detail-concepts">
          <v-card
            v-for="concept in props.request.concepts"
            :key="concept.id"
            variant="outlined"
            class="detail-concept-card"
          >
            <v-row dense>
              <v-col cols="12" sm="4">
                <v-select
                  v-if="isEditable"
                  :model-value="concept.expenseType"
                  :items="expenseTypeOptions"
                  label="Tipo de gasto"
                  density="compact"
                  hide-details="auto"
                  :loading="savingConceptId === concept.id"
                  @update:model-value="(v) => onExpenseTypeChange(concept, v)"
                />
                <div v-else class="detail-field-static">
                  <span>Tipo de gasto</span>
                  <strong>{{ concept.expenseType }}</strong>
                </div>
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-if="isEditable"
                  :model-value="concept.incrementType"
                  :items="incrementTypeOptions"
                  label="Tipo de incremento"
                  density="compact"
                  hide-details="auto"
                  :loading="savingConceptId === concept.id"
                  @update:model-value="(v) => onIncrementTypeChange(concept, v)"
                />
                <div v-else class="detail-field-static">
                  <span>Tipo de incremento</span>
                  <strong>{{ concept.incrementType }}</strong>
                </div>
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-if="isEditable"
                  :model-value="casaIdFor(concept.casa)"
                  :items="casaOptions"
                  label="Casa Petroil"
                  density="compact"
                  hide-details="auto"
                  :loading="savingConceptId === concept.id"
                  @update:model-value="(v) => onCasaChange(concept, v)"
                />
                <div v-else class="detail-field-static">
                  <span>Casa Petroil</span>
                  <strong>{{ concept.casa }}</strong>
                </div>
              </v-col>
            </v-row>

            <v-row dense class="detail-concept-card__row">
              <v-col cols="12" sm="4">
                <v-combobox
                  v-if="isEditable"
                  :model-value="concept.provider"
                  :items="providerOptions"
                  label="Proveedor"
                  density="compact"
                  hide-details="auto"
                  :loading="savingConceptId === concept.id"
                  @update:model-value="(v) => (concept.provider = v)"
                  @blur="saveConceptField(concept.id, { provider: concept.provider })"
                />
                <div v-else class="detail-field-static">
                  <span>Proveedor</span>
                  <strong>{{ concept.provider || '—' }}</strong>
                </div>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-if="isEditable"
                  :model-value="concept.amount || null"
                  type="number"
                  prefix="$"
                  label="Importe"
                  density="compact"
                  hide-details="auto"
                  :loading="savingConceptId === concept.id"
                  @update:model-value="(v) => (concept.amount = Number(v) || 0)"
                  @blur="onAmountBlur(concept)"
                />
                <div v-else class="detail-field-static">
                  <span>Importe</span>
                  <strong>{{ formatCurrency(concept.amount) }}</strong>
                </div>
              </v-col>
              <v-col cols="12" sm="4" class="detail-document-col">
                <div v-if="concept.documentUrl" class="detail-field-static">
                  <span>Documento</span>
                  <a
                    :href="documentHref(concept.documentUrl)"
                    target="_blank"
                    rel="noopener"
                    class="detail-document-link"
                  >
                    <v-icon icon="mdi-paperclip" size="14" />
                    {{ concept.documentName }}
                  </a>
                </div>
                <div v-else-if="!isEditable" class="detail-field-static">
                  <span>Documento</span>
                  <strong class="detail-field-static--muted">Sin documento</strong>
                </div>
                <v-file-input
                  v-if="isEditable"
                  :label="concept.documentUrl ? 'Cambiar documento' : 'Documento'"
                  density="compact"
                  hide-details="auto"
                  accept="application/pdf,image/*"
                  prepend-icon=""
                  prepend-inner-icon="mdi-paperclip"
                  :class="{ 'mt-2': concept.documentUrl }"
                  :loading="ocrProcessingId === concept.id"
                  @update:model-value="(file) => onDocumentSelected(concept, file)"
                />
                <p v-if="ocrNotice[concept.id]" class="detail-ocr-notice">
                  <v-icon icon="mdi-auto-fix" size="12" />
                  {{ ocrNotice[concept.id] }}
                </p>
              </v-col>
            </v-row>

            <v-row dense class="detail-concept-card__row">
              <v-col cols="12">
                <v-textarea
                  v-if="isEditable"
                  :model-value="concept.comment"
                  label="Motivo"
                  rows="2"
                  auto-grow
                  density="compact"
                  hide-details="auto"
                  :loading="savingConceptId === concept.id"
                  @update:model-value="(v) => (concept.comment = v)"
                  @blur="saveConceptField(concept.id, { comment: concept.comment })"
                />
                <div v-else class="detail-field-static">
                  <span>Motivo</span>
                  <strong>{{ concept.comment || '—' }}</strong>
                </div>
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="detail-dialog-actions">
        <v-spacer />
        <v-btn class="detail-close-button" variant="outlined" @click="open = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.detail-dialog-card {
  overflow: hidden;
  border: 1px solid rgb(151 194 213 / 70%);
  border-radius: 20px !important;
  background: #edf6fa;
  color: #123c56;
  font-family: Arial, Helvetica, sans-serif;
  box-shadow: 0 28px 80px rgb(0 42 70 / 28%) !important;
}

.detail-dialog-header {
  padding: 15px 18px !important;
  background: linear-gradient(115deg, #064f80, #0877a8 68%, #1594bf);
  color: #fff;
}

.detail-dialog-header__content {
  display: flex;
  align-items: center;
  gap: 13px;
}

.detail-dialog-header__icon {
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

.detail-dialog-header__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.detail-dialog-header__eyebrow {
  margin: 0 0 2px;
  color: #ffd2a3;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.detail-dialog-header__copy h2 {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.detail-dialog-header__copy span {
  display: block;
  margin-top: 3px;
  color: rgb(255 255 255 / 78%);
  font-size: 0.72rem;
}

.detail-dialog-close {
  border: 1px solid rgb(255 255 255 / 16%);
  background: rgb(255 255 255 / 9%);
  color: #fff;
}

.detail-dialog-body {
  padding: 17px 18px 20px !important;
  background: #b9d8e5;
}

.detail-status-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 13px;
  margin-bottom: 15px;
  border: 1px solid #c5dfe9;
  border-left: 4px solid #1594bf;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 7px 18px rgb(7 95 153 / 7%);
}

.detail-status-bar__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-status-bar__field > span {
  color: #56758a;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-status-select {
  min-width: 190px;
}

.detail-field-error {
  margin: 0;
  color: rgb(var(--v-theme-error));
  font-size: 0.68rem;
}

.detail-total {
  display: flex;
  min-width: 155px;
  flex-direction: column;
  gap: 3px;
  padding: 9px 13px;
  border-radius: 11px;
  background: linear-gradient(110deg, #075f99, #087cae);
  box-shadow: 0 8px 18px rgb(7 95 153 / 18%);
  color: #fff;
  text-align: right;
}

.detail-total span {
  font-size: 0.66rem;
  font-weight: 700;
}

.detail-total strong {
  font-size: 1rem;
  font-weight: 700;
}

.detail-editable-hint {
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

.detail-editable-hint :deep(.v-icon) {
  color: #0a7cad;
}

.detail-dialog-body :deep(.v-field) {
  border-radius: 9px;
  background: #fff;
  color: #183e5c;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.74rem;
  --v-field-border-opacity: 0.72;
}

.detail-dialog-body :deep(.v-field--focused) {
  background: #fff;
  box-shadow: 0 0 0 3px rgb(8 111 165 / 14%);
  --v-field-border-opacity: 1;
}

.detail-dialog-body :deep(.v-field-label),
.detail-dialog-body :deep(.v-label) {
  color: #315c75 !important;
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 1 !important;
}

.detail-dialog-body :deep(.v-field__input) {
  color: #123c56;
  font-size: 0.76rem;
  font-weight: 600;
  opacity: 1;
}

.detail-status-select :deep(.v-field) {
  border: none;
  background: transparent;
}

.detail-concepts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-concept-card {
  padding: 13px 14px 11px;
  border: 1px solid #c7dfe9 !important;
  border-top: 3px solid #1685b3 !important;
  border-radius: 12px !important;
  background: #fff !important;
  box-shadow: 0 6px 15px rgb(7 95 153 / 6%);
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.detail-concept-card:hover {
  box-shadow: 0 10px 22px rgb(7 95 153 / 10%);
  transform: translateY(-1px);
}

.detail-concept-card__row {
  margin-top: 6px;
}

.detail-field-static {
  display: flex;
  min-height: 48px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 0 2px;
}

.detail-field-static > span {
  color: #56758a;
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.detail-field-static > strong {
  overflow: hidden;
  color: #123c56;
  font-size: 0.82rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-field-static--muted {
  color: #8298a8;
  font-weight: 500;
}

.detail-document-link {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: #0877a8;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-document-link:hover {
  text-decoration: underline;
}

.detail-document-col {
  min-width: 0;
}

.detail-ocr-notice {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 2px 0;
  color: #0872a5;
  font-size: 0.65rem;
  font-weight: 600;
}

.detail-dialog-actions {
  gap: 8px;
  padding: 12px 18px !important;
  background: #fff;
}

.detail-close-button {
  min-height: 38px;
  padding-inline: 18px !important;
  border-radius: 9px !important;
  border-color: #a9c9d8 !important;
  color: #45677c !important;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: none;
}

@media (max-width: 700px) {
  .detail-status-bar {
    flex-direction: column;
  }

  .detail-total {
    align-self: stretch;
    text-align: left;
  }
}
</style>
