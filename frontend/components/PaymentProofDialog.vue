<script setup lang="ts">
import type { Payment } from '~/types'

defineProps<{ payment: Payment | null }>()
const model = defineModel<boolean>({ default: false })
const emit = defineEmits<{ registered: [] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const paymentDate = ref('')
const concept = ref('')
const paymentMethod = ref<string | null>(null)
const bankReference = ref('')

const methods = ['Transferencia', 'Tarjeta', 'Efectivo', 'Domiciliación']

function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

function registerProof() {
  emit('registered')
}
</script>

<template>
  <v-dialog v-model="model" max-width="1180" scrollable>
    <v-card class="proof-dialog">
      <v-card-title class="proof-dialog__header">
        <div class="proof-dialog__icon">
          <v-icon icon="mdi-receipt-text-outline" />
        </div>
        <div>
          <p class="proof-dialog__eyebrow">COMPROBANTE DE PAGO</p>
          <h2>Registrar pago realizado</h2>
          <p class="proof-dialog__subtitle">
            Sube el comprobante; el OCR preparará los datos para tu revisión.
          </p>
        </div>
        <v-btn
          class="proof-dialog__close"
          icon="mdi-close"
          variant="outlined"
          @click="model = false"
        />
      </v-card-title>

      <v-card-text class="proof-dialog__body">
        <section class="proof-section proof-section--request">
          <div class="proof-section__heading">
            <span>1</span>
            <div>
              <h3>Solicitud</h3>
              <p>Origen autorizado del pago</p>
            </div>
          </div>
          <div class="proof-request-field">
            <label>Solicitud aprobada</label>
            <v-select
              :items="[
                `${payment?.requestFolio ?? 'Sin folio'} · ${formatCurrency(payment?.amount ?? 0)} · Autorizada`,
              ]"
              :model-value="`${payment?.requestFolio ?? 'Sin folio'} · ${formatCurrency(payment?.amount ?? 0)} · Autorizada`"
              density="compact"
              hide-details
              variant="outlined"
            />
          </div>
        </section>

        <div class="proof-dialog__grid">
          <section class="proof-section">
            <div class="proof-section__heading">
              <span>2</span>
              <div>
                <h3>Datos del pago</h3>
                <p>Información del movimiento</p>
              </div>
            </div>

            <div class="form-grid">
              <div>
                <label>Servicio</label>
                <v-text-field
                  :model-value="payment?.service"
                  density="compact"
                  hide-details
                  readonly
                  variant="outlined"
                />
              </div>
              <div>
                <label>Sucursal</label>
                <v-text-field
                  :model-value="payment?.branch"
                  density="compact"
                  hide-details
                  readonly
                  variant="outlined"
                />
              </div>
              <div>
                <label>Importe</label>
                <v-text-field
                  :model-value="payment?.amount"
                  density="compact"
                  hide-details
                  variant="outlined"
                />
              </div>
              <div>
                <label>Fecha de pago</label>
                <v-text-field
                  v-model="paymentDate"
                  density="compact"
                  hide-details
                  type="date"
                  variant="outlined"
                />
              </div>
              <div class="form-grid__wide">
                <label>Concepto</label>
                <v-text-field
                  v-model="concept"
                  density="compact"
                  hide-details
                  placeholder="Describe el pago"
                  variant="outlined"
                />
              </div>
              <div>
                <label>Método de pago</label>
                <v-select
                  v-model="paymentMethod"
                  :items="methods"
                  density="compact"
                  hide-details
                  placeholder="Selecciona..."
                  variant="outlined"
                />
              </div>
              <div>
                <label>Referencia bancaria</label>
                <v-text-field
                  v-model="bankReference"
                  density="compact"
                  hide-details
                  placeholder="Folio o referencia"
                  variant="outlined"
                />
              </div>
            </div>
          </section>

          <section class="proof-section">
            <div class="proof-section__heading">
              <span>3</span>
              <div>
                <h3>Comprobante y lectura OCR</h3>
                <p>PDF, JPG o PNG</p>
              </div>
            </div>

            <input
              ref="fileInput"
              accept=".pdf,image/png,image/jpeg"
              hidden
              type="file"
              @change="selectFile"
            />
            <input
              ref="cameraInput"
              accept="image/*"
              capture="environment"
              hidden
              type="file"
              @change="selectFile"
            />

            <button class="upload-option" type="button" @click="fileInput?.click()">
              <span class="upload-option__icon"><v-icon icon="mdi-upload" /></span>
              <span>
                <strong>Subir archivo</strong>
                <small>{{ selectedFile?.name ?? 'PDF o imagen de banca móvil' }}</small>
              </span>
            </button>
            <button class="upload-option" type="button" @click="cameraInput?.click()">
              <span class="upload-option__icon upload-option__icon--camera">
                <v-icon icon="mdi-camera-outline" />
              </span>
              <span>
                <strong>Tomar fotografía</strong>
                <small>Abrir cámara para ticket físico</small>
              </span>
            </button>

            <div class="ocr-status">
              <strong>{{ selectedFile ? 'Archivo listo' : 'OCR listo' }}</strong>
              <p>
                {{
                  selectedFile
                    ? 'El comprobante está listo para registrarse.'
                    : 'Selecciona un comprobante para detectar fecha, importe, método y referencia.'
                }}
              </p>
            </div>
          </section>
        </div>
      </v-card-text>

      <v-card-actions class="proof-dialog__actions">
        <v-btn class="proof-dialog__cancel" variant="outlined" @click="model = false">
          Cancelar
        </v-btn>
        <v-btn class="proof-dialog__submit" variant="flat" @click="registerProof">
          Registrar comprobante
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.proof-dialog {
  max-height: calc(100vh - 28px);
  border-radius: 22px !important;
  border-top: 4px solid #ff741c;
  background: #edf7fc;
  color: #123d68;
}

.proof-dialog__header {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 24px 10px;
  white-space: normal;
}

.proof-dialog__icon {
  display: grid;
  flex: 0 0 50px;
  height: 50px;
  place-items: center;
  border-radius: 15px;
  background: #ff741c;
  color: white;
  box-shadow: 0 8px 18px rgb(255 116 28 / 20%);
}

.proof-dialog__eyebrow {
  color: #9b5d00;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.proof-dialog h2 {
  font-size: 1.45rem;
  line-height: 1.2;
}

.proof-dialog__subtitle,
.proof-section__heading p,
.ocr-status p {
  color: #6e89a0;
  font-size: 0.78rem;
}

.proof-dialog__close {
  margin-left: auto;
  align-self: flex-start;
  border-color: #cbdde8;
  background: white;
}

.proof-dialog__body {
  padding: 0 24px 8px;
}

.proof-dialog__grid {
  display: grid;
  grid-template-columns: 1.65fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.proof-section {
  padding: 14px 16px;
  border: 1px solid #d5e4ed;
  border-radius: 18px;
  background: rgb(255 255 255 / 78%);
}

.proof-section__heading {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-bottom: 10px;
}

.proof-section__heading > span {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  background: #0c86b6;
  color: white;
  font-weight: 800;
}

.proof-section h3 {
  font-size: 0.95rem;
}

.proof-section label {
  display: block;
  margin-bottom: 4px;
  color: #526d82;
  font-size: 0.74rem;
  font-weight: 800;
}

.proof-section--request {
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.proof-section--request .proof-section__heading {
  margin-bottom: 0;
}

.proof-request-field {
  min-width: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px 14px;
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.proof-dialog :deep(.v-field) {
  border-radius: 11px;
  font-size: 0.86rem;
}

.proof-dialog :deep(.v-field__input) {
  min-height: 40px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.upload-option {
  display: flex;
  width: 100%;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
  padding: 9px 12px;
  border: 1px dashed #54a6cc;
  border-radius: 13px;
  background: transparent;
  color: #07598a;
  text-align: left;
  cursor: pointer;
}

.upload-option__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  background: #0987ba;
  color: white;
}

.upload-option__icon--camera {
  background: #ff741c;
}

.upload-option strong,
.upload-option small {
  display: block;
}

.upload-option small {
  margin-top: 2px;
  color: #718a9d;
}

.ocr-status {
  padding: 10px 12px;
  border-radius: 12px;
  background: #e1eef5;
}

.ocr-status p {
  margin-top: 3px;
}

.proof-dialog__actions {
  gap: 12px;
  justify-content: flex-end;
  margin: 0 24px;
  padding: 10px 0 14px;
  border-top: 1px solid #d1e1ea;
}

.proof-dialog__cancel,
.proof-dialog__submit {
  min-width: 170px;
  height: 42px;
  border-radius: 13px;
  font-weight: 800;
  text-transform: none;
}

.proof-dialog__submit {
  background: #ff741c;
  color: white;
}

@media (max-width: 800px) {
  .proof-dialog__header,
  .proof-dialog__body {
    padding-inline: 18px;
  }

  .proof-dialog__grid,
  .form-grid,
  .proof-section--request {
    grid-template-columns: 1fr;
  }

  .form-grid__wide {
    grid-column: auto;
  }

  .proof-dialog__actions {
    margin-inline: 18px;
  }

  .proof-dialog__cancel,
  .proof-dialog__submit {
    min-width: 0;
  }
}
</style>
