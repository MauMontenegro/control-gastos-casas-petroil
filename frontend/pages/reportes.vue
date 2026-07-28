<script setup lang="ts">
const dashboard = useDashboardStore()

onMounted(() => {
  dashboard.fetchOverview()
})

const trendChart = computed(() => ({
  series: [
    { name: 'Real', data: dashboard.spendTrend.map((p) => p.actual) },
    { name: 'Planeado', data: dashboard.spendTrend.map((p) => p.planned) },
  ],
  options: {
    chart: { toolbar: { show: false } },
    xaxis: { categories: dashboard.spendTrend.map((p) => p.month) },
    colors: ['#1683bd', '#94a9c2'],
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
    yaxis: { labels: { formatter: (v: number) => formatCurrency(v) } },
  },
}))

const serviceDonutChart = computed(() => ({
  series: dashboard.serviceSpend.map((s) => s.percentage),
  options: {
    labels: dashboard.serviceSpend.map((s) => s.service),
    colors: ['#1261a6', '#1fa56b', '#ff7a21', '#58a3d9'],
    legend: { position: 'bottom' },
    dataLabels: { formatter: (v: number) => `${v.toFixed(0)}%` },
  },
}))

const branchBudgetChart = computed(() => ({
  series: [{ name: 'Ejercido %', data: dashboard.branchBudget.map((b) => b.percentage) }],
  options: {
    chart: { toolbar: { show: false } },
    xaxis: { categories: dashboard.branchBudget.map((b) => b.branch), max: 100 },
    colors: ['#1261a6'],
    plotOptions: { bar: { borderRadius: 6, horizontal: true } },
    dataLabels: { formatter: (v: number) => `${v}%` },
  },
}))
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">
        INTELIGENCIA OPERATIVA
      </p>
      <h1 class="text-h4 font-weight-bold mb-1">Dashboards</h1>
      <p class="text-body-2 text-medium-emphasis">
        Indicadores visuales para detectar riesgos, tendencias y oportunidades de ahorro.
      </p>
    </div>

    <v-row class="mb-2">
      <v-col cols="12" lg="7">
        <v-card class="pa-4">
          <h2 class="text-h6 mb-4">Evolución del gasto</h2>
          <ClientOnly>
            <apexchart
              type="area"
              height="300"
              :options="trendChart.options"
              :series="trendChart.series"
            />
          </ClientOnly>
        </v-card>
      </v-col>
      <v-col cols="12" lg="5">
        <v-card class="pa-4">
          <h2 class="text-h6 mb-4">Distribución por servicio</h2>
          <ClientOnly>
            <apexchart
              type="donut"
              height="300"
              :options="serviceDonutChart.options"
              :series="serviceDonutChart.series"
            />
          </ClientOnly>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card class="pa-4">
          <h2 class="text-h6 mb-4">Presupuesto por sucursal</h2>
          <ClientOnly>
            <apexchart
              type="bar"
              height="260"
              :options="branchBudgetChart.options"
              :series="branchBudgetChart.series"
            />
          </ClientOnly>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
