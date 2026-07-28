<script setup lang="ts">
const store = useBranchesStore()
const { t } = useI18n()

onMounted(() => {
  store.fetchBranches()
})

function initials(name: string) {
  return name.replace('Sucursal ', '').slice(0, 2).toUpperCase()
}
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-end flex-wrap ga-4 mb-6">
      <div>
        <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">CATÁLOGOS</p>
        <h1 class="text-h4 font-weight-bold mb-1">Sucursales y casas</h1>
        <p class="text-body-2 text-medium-emphasis">
          Expediente maestro de servicios, responsables y presupuesto.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus">{{ t('common.newBranch') }}</v-btn>
    </div>

    <v-row>
      <v-col v-for="branch in store.items" :key="branch.id" cols="12" sm="6" lg="4">
        <v-card class="pa-4">
          <div class="d-flex justify-space-between align-center mb-3">
            <div class="kpi-card__icon kpi-card__icon--blue">{{ initials(branch.name) }}</div>
            <v-chip size="small" color="success" variant="tonal">Activa</v-chip>
          </div>
          <h3 class="text-subtitle-1 font-weight-bold">{{ branch.name }}</h3>
          <p class="text-caption text-medium-emphasis mb-3">
            {{ branch.region }} · Centro de costo {{ branch.costCenter }}
          </p>
          <v-row dense class="mb-3">
            <v-col cols="4">
              <span class="text-caption text-medium-emphasis d-block">Servicios</span>
              <strong class="text-body-2">{{ branch.servicesCount }}</strong>
            </v-col>
            <v-col cols="4">
              <span class="text-caption text-medium-emphasis d-block">Presupuesto</span>
              <strong class="text-body-2">{{ formatCurrency(branch.budget) }}</strong>
            </v-col>
            <v-col cols="4">
              <span class="text-caption text-medium-emphasis d-block">Responsable</span>
              <strong class="text-body-2">{{ branch.ownerName }}</strong>
            </v-col>
          </v-row>
          <v-btn block variant="outlined" color="secondary">Ver expediente</v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
