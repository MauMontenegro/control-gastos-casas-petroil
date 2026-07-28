<script setup lang="ts">
import type { ProofStatus } from '~/types'

const store = useProofsStore()
const { t } = useI18n()

onMounted(() => {
  store.fetchProofs()
})

const headers = [
  { title: 'Solicitud', key: 'requestFolio' },
  { title: 'Pago realizado', key: 'service' },
  { title: 'Fecha', key: 'paymentDate' },
  { title: 'Importe', key: 'amount' },
  { title: 'Comprobante', key: 'status' },
  { title: 'Acción', key: 'actions', sortable: false },
]

const statusColor: Record<ProofStatus, string> = {
  completo: 'success',
  pendiente: 'error',
}
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">
        HISTORIAL DE PAGOS
      </p>
      <h1 class="text-h4 font-weight-bold mb-1">Comprobaciones</h1>
      <p class="text-body-2 text-medium-emphasis">
        Recuento de pagos realizados y sus documentos comprobatorios.
      </p>
    </div>

    <v-card class="pa-4 mb-4 d-flex justify-space-between align-center flex-wrap ga-4">
      <div class="d-flex align-center ga-3">
        <v-avatar color="success" variant="tonal" size="36">
          <v-icon icon="mdi-check-circle" size="18" />
        </v-avatar>
        <div>
          <strong>{{ store.completeCount }} expedientes completos</strong>
          <div class="text-caption text-medium-emphasis">
            {{ store.pendingCount }} requiere comprobante
          </div>
        </div>
      </div>
      <v-btn variant="outlined" prepend-icon="mdi-download">{{ t('common.export') }}</v-btn>
    </v-card>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="store.items"
        :loading="store.loading"
        item-value="id"
      >
        <template #item.amount="{ item }">
          <strong>{{ formatCurrency(item.amount) }}</strong>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor[item.status]" variant="tonal">
            {{ t(`status.${item.status}`) }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn
            size="small"
            variant="tonal"
            :color="item.status === 'completo' ? 'secondary' : 'primary'"
          >
            {{ item.status === 'completo' ? 'Ver comprobante' : 'Adjuntar' }}
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>
