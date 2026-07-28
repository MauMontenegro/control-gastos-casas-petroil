<script setup lang="ts">
import type { FundRequestStatus } from '~/types'

const store = useRequestsStore()
const { t } = useI18n()

onMounted(() => {
  store.fetchRequests()
})

const headers = [
  { title: 'Folio', key: 'folio' },
  { title: 'Fecha requerida', key: 'requiredDate' },
  { title: 'Concepto', key: 'concept' },
  { title: 'Sucursal', key: 'branch' },
  { title: 'Total', key: 'total' },
  { title: 'Estado', key: 'status' },
]

const statusColor: Record<FundRequestStatus, string> = {
  'en-revision': 'info',
  autorizada: 'success',
  correccion: 'error',
}

const pendingAmount = computed(() => store.pending.reduce((sum, r) => sum + r.total, 0))
const approvedAmount = computed(() => store.approved.reduce((sum, r) => sum + r.total, 0))
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-end flex-wrap ga-4 mb-6">
      <div>
        <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">FONDOS</p>
        <h1 class="text-h4 font-weight-bold mb-1">Solicitudes de fondos</h1>
        <p class="text-body-2 text-medium-emphasis">
          Seguimiento de solicitudes, autorizaciones y origen de recursos.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus">{{ t('common.newRequest') }}</v-btn>
    </div>

    <v-row class="mb-2">
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">Pendientes</span>
          <strong class="text-h6 d-block">{{ store.pending.length }}</strong>
          <small class="text-caption text-medium-emphasis">{{
            formatCurrency(pendingAmount)
          }}</small>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">En aprobación</span>
          <strong class="text-h6 d-block">{{ store.pending.length }}</strong>
          <small class="text-caption text-medium-emphasis">Requieren decisión</small>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">Autorizadas</span>
          <strong class="text-h6 d-block">{{ store.approved.length }}</strong>
          <small class="text-caption text-medium-emphasis">{{
            formatCurrency(approvedAmount)
          }}</small>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4">
          <span class="text-caption text-medium-emphasis d-block">Corrección / rechazo</span>
          <strong class="text-h6 d-block">{{ store.rejected.length }}</strong>
          <small class="text-caption text-medium-emphasis">Requieren ajustes</small>
        </v-card>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="store.items"
        :loading="store.loading"
        item-value="id"
      >
        <template #item.total="{ item }">
          <strong>{{ formatCurrency(item.total) }}</strong>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor[item.status]" variant="tonal">
            {{ t(`status.${item.status}`) }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>
