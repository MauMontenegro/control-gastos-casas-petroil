<script setup lang="ts">
import type { Payment, PaymentProofStatus } from '~/types'

defineProps<{ payment: Payment | null }>()
const model = defineModel<boolean>({ default: false })

const proofLabel: Record<PaymentProofStatus, string> = {
  'sin-cargar': 'Sin cargar',
  cargada: 'Cargada',
}
</script>

<template>
  <v-dialog v-model="model" max-width="920" scrollable>
    <v-card class="detail-dialog">
      <v-card-title class="detail-dialog__header">
        <div>
          <p>DETALLE OPERATIVO</p>
          <h2>Soporte · {{ payment?.service }} · {{ payment?.branch }}</h2>
        </div>
        <v-btn icon="mdi-close" variant="flat" @click="model = false" />
      </v-card-title>

      <v-card-text>
        <p class="detail-dialog__intro">Archivo soporte integrado al pago.</p>

        <dl class="detail-summary">
          <div>
            <dt>Solicitud</dt>
            <dd>{{ payment?.requestFolio }}</dd>
          </div>
          <div>
            <dt>Estado de pago</dt>
            <dd>{{ payment?.status === 'pagado' ? 'Pagado' : 'No pagado' }}</dd>
          </div>
          <div>
            <dt>Estado de comprobación</dt>
            <dd>{{ payment ? proofLabel[payment.proofStatus] : '' }}</dd>
          </div>
        </dl>

        <section class="document-preview">
          <header>
            <span>VISTA PREVIA</span>
            <strong>comprobante-{{ payment?.requestFolio }}.pdf</strong>
          </header>
          <div class="document-sheet">
            <div class="document-sheet__title">
              <span><v-icon icon="mdi-receipt-text-outline" /></span>
              <div>
                <strong>Comprobante de pago</strong>
                <small>Documento soporte</small>
              </div>
            </div>
            <div class="document-sheet__line" />
            <dl>
              <div><dt>Servicio</dt><dd>{{ payment?.service }} · {{ payment?.branch }}</dd></div>
              <div><dt>Importe</dt><dd>{{ formatCurrency(payment?.amount ?? 0) }}</dd></div>
              <div><dt>Fecha</dt><dd>{{ payment?.dueDate }}</dd></div>
              <div><dt>Referencia</dt><dd>{{ payment?.requestFolio }}</dd></div>
            </dl>
            <span class="document-sheet__stamp">
              {{ payment ? proofLabel[payment.proofStatus].toUpperCase() : '' }}
            </span>
          </div>
        </section>

        <section class="attachment-card">
          <div class="attachment-card__title">
            <span><v-icon icon="mdi-file-document-outline" /></span>
            <div>
              <strong>Comprobante o recibo</strong>
              <small>Archivo PDF integrado</small>
            </div>
          </div>
          <div class="attachment-card__actions">
            <v-btn variant="outlined">Adjuntar archivo</v-btn>
            <v-btn class="attachment-card__view" variant="flat">Ver comprobante</v-btn>
          </div>
        </section>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.detail-dialog {
  max-height: calc(100vh - 28px);
  border-left: 4px solid #ff741c;
  border-radius: 0 22px 22px 0 !important;
  background: #e9f4fa;
  color: #123d68;
}

.detail-dialog__header {
  display: flex;
  align-items: flex-start;
  padding: 20px 24px 12px;
  white-space: normal;
}

.detail-dialog__header p,
.document-preview header span {
  color: #9b5d00;
  font-size: 0.72rem;
  letter-spacing: 0.13em;
}

.detail-dialog__header h2 {
  margin-top: 6px;
  font-size: 1.3rem;
}

.detail-dialog__header .v-btn {
  margin-left: auto;
  background: white;
}

.detail-dialog .v-card-text {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(250px, 0.8fr);
  gap: 12px;
  padding: 0 24px 20px;
}

.detail-dialog__intro {
  grid-column: 1 / -1;
  padding-top: 12px;
  border-top: 1px solid #cfdee7;
  color: #5f778c;
  font-size: 0.82rem;
}

.detail-summary {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.detail-summary > div {
  display: grid;
  gap: 4px;
  justify-content: space-between;
  padding: 11px 13px;
  border-radius: 11px;
  background: #d9eaf4;
}

.detail-summary dt {
  color: #5f778c;
  font-size: 0.7rem;
}

.detail-summary dd {
  color: #173f60;
  font-size: 0.82rem;
  font-weight: 800;
}

.document-preview {
  overflow: hidden;
  border: 1px solid #afd5e7;
  border-radius: 16px;
}

.document-preview header {
  display: flex;
  justify-content: space-between;
  padding: 9px 13px;
  font-size: 0.66rem;
}

.document-sheet {
  position: relative;
  margin: 0 14px 14px;
  padding: 16px 18px;
  border-radius: 9px;
  background: white;
}

.document-sheet__title,
.attachment-card__title {
  display: flex;
  gap: 14px;
  align-items: center;
}

.document-sheet__title > span,
.attachment-card__title > span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  background: #0785b5;
  color: white;
}

.document-sheet small,
.attachment-card small {
  display: block;
  margin-top: 2px;
  color: #728ba0;
  font-size: 0.7rem;
}

.document-sheet__line {
  height: 2px;
  margin: 13px 0;
  background: #ff741c;
}

.document-sheet dl > div {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #e0e9ee;
  font-size: 0.78rem;
}

.document-sheet dt {
  color: #6e879b;
}

.document-sheet dd {
  font-weight: 700;
}

.document-sheet__stamp {
  display: block;
  width: fit-content;
  margin: 9px 0 0 auto;
  padding: 6px 9px;
  transform: rotate(-5deg);
  border: 3px solid #20a47c;
  border-radius: 10px;
  color: #168a68;
  font-size: 0.72rem;
  font-weight: 900;
}

.attachment-card {
  align-self: stretch;
  margin-top: 0;
  padding: 16px;
  border: 1px solid #bddbea;
  border-radius: 16px;
  background: rgb(255 255 255 / 70%);
}

.attachment-card__actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 9px;
  margin-top: 14px;
}

.attachment-card__actions .v-btn {
  height: 40px;
  border-radius: 11px;
  font-weight: 700;
  text-transform: none;
}

.attachment-card__view {
  background: #ff9d63;
  color: white;
}

@media (max-width: 600px) {
  .detail-dialog__header,
  .detail-dialog .v-card-text {
    padding-inline: 20px;
  }

  .document-sheet {
    margin-inline: 14px;
    padding: 20px;
  }
}

@media (max-width: 760px) {
  .detail-dialog .v-card-text,
  .detail-summary {
    grid-template-columns: 1fr;
  }

  .detail-dialog__intro,
  .detail-summary {
    grid-column: auto;
  }
}
</style>
