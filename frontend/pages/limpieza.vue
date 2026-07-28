<script setup lang="ts">
const store = useCleaningStore()

onMounted(() => {
  store.fetchCurrentWeek()
})
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-end flex-wrap ga-4 mb-6">
      <div>
        <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">
          SERVICIO RECURRENTE
        </p>
        <h1 class="text-h4 font-weight-bold mb-1">Limpieza externa</h1>
        <p class="text-body-2 text-medium-emphasis">
          Confirma días trabajados y calcula automáticamente el importe.
        </p>
      </div>
    </div>

    <v-row v-if="store.week">
      <v-col cols="12" lg="8">
        <v-card class="pa-4">
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <h2 class="text-h6">Registro semanal</h2>
              <p class="text-caption text-medium-emphasis">{{ store.week.weekLabel }}</p>
            </div>
            <v-chip size="small" color="info" variant="tonal">Pendiente de confirmar</v-chip>
          </div>

          <div class="d-flex ga-2 flex-wrap mb-6">
            <v-card
              v-for="day in store.week.days"
              :key="day.label"
              class="pa-3 text-center"
              :class="day.active ? 'border-primary' : ''"
              :variant="day.active ? 'tonal' : 'outlined'"
              :color="day.active ? 'secondary' : undefined"
              min-width="70"
              @click="store.toggleDay(day)"
            >
              <div class="text-caption">{{ day.label }}</div>
              <strong>{{ day.date }}</strong>
            </v-card>
          </div>

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                :model-value="store.extraDays"
                type="number"
                min="0"
                label="Días adicionales"
                @update:model-value="(v) => store.setExtraDays(Number(v))"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                :model-value="store.discount"
                type="number"
                min="0"
                label="Descuentos autorizados"
                @update:model-value="(v) => store.setDiscount(Number(v))"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea label="Observaciones" placeholder="Agrega una nota..." rows="3" />
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="pa-4">
          <h2 class="text-h6 mb-4">Cálculo de pago</h2>
          <div class="d-flex justify-space-between py-3 border-b">
            <span class="text-body-2">Días trabajados</span>
            <strong>{{ store.workedDays }}</strong>
          </div>
          <div class="d-flex justify-space-between py-3 border-b">
            <span class="text-body-2">Tarifa diaria</span>
            <strong>{{ formatCurrency(store.dailyRate) }}</strong>
          </div>
          <div class="d-flex justify-space-between py-3 border-b">
            <span class="text-body-2">Días adicionales</span>
            <strong>{{ formatCurrency(store.extraAmount) }}</strong>
          </div>
          <div class="d-flex justify-space-between py-3 border-b">
            <span class="text-body-2">Descuentos</span>
            <strong>-{{ formatCurrency(store.discount) }}</strong>
          </div>
          <div class="d-flex justify-space-between py-4">
            <span class="text-body-1 font-weight-medium">Total a solicitar</span>
            <strong class="text-h5 text-secondary">{{ formatCurrency(store.total) }}</strong>
          </div>
          <v-btn block color="primary" size="large">Confirmar semana</v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
