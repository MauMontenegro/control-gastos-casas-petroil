<script setup lang="ts">
import type { Payment, PaymentStatus } from '~/types'

const store = usePaymentsStore()
const { t } = useI18n()

onMounted(() => {
  store.fetchPayments()
})

const headers = [
  { title: 'Solicitud', key: 'requestFolio' },
  { title: 'Servicio / sucursal', key: 'service' },
  { title: 'Vencimiento', key: 'dueDate' },
  { title: 'Importe', key: 'amount' },
  { title: 'Variación', key: 'variationPct' },
  { title: 'Estado', key: 'status' },
  { title: 'Acción', key: 'actions', sortable: false },
]

const statusColor: Record<PaymentStatus, string> = {
  listo: 'success',
  variacion: 'warning',
  'falta-recibo': 'error',
  pagado: 'success',
}

async function payNow(payment: Payment) {
  await store.registerPayment({
    approvedRequestFolio: payment.requestFolio ?? '',
    service: payment.service,
    branch: payment.branch,
    amount: payment.amount,
    paymentDate: new Date().toLocaleDateString('es-MX'),
  })
}
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">EJECUCIÓN</p>
      <h1 class="text-h4 font-weight-bold mb-1">Pagos autorizados</h1>
      <p class="text-body-2 text-medium-emphasis">
        Ejecuta únicamente pagos respaldados por una solicitud aprobada.
      </p>
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="store.items"
        :loading="store.loading"
        item-value="id"
      >
        <template #item.service="{ item }">
          <strong>{{ item.service }}</strong>
          <div class="text-caption text-medium-emphasis">{{ item.branch }}</div>
        </template>
        <template #item.amount="{ item }">
          <strong>{{ formatCurrency(item.amount) }}</strong>
        </template>
        <template #item.variationPct="{ item }">
          <span :class="item.variationPct >= 0 ? 'text-warning' : ''">
            {{ item.variationPct >= 0 ? '+' : '' }}{{ item.variationPct }}%
          </span>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor[item.status]" variant="tonal">
            {{ t(`status.${item.status}`) }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn
            size="small"
            :color="item.status === 'pagado' ? undefined : 'primary'"
            :disabled="item.status === 'pagado'"
            variant="flat"
            @click="payNow(item)"
          >
            {{ item.status === 'pagado' ? 'Pagado ✓' : 'Pagar' }}
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>
