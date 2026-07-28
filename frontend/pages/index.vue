<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'

const dashboard = useDashboardStore()
const { user } = useAuth0()

onMounted(() => {
  dashboard.fetchOverview()
})

const severityIcon: Record<string, string> = {
  critical: 'mdi-close-circle',
  warning: 'mdi-alert',
  info: 'mdi-information',
  success: 'mdi-check-circle',
}
const severityColor: Record<string, string> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
  success: 'success',
}

const serviceSpendChart = computed(() => ({
  series: [{ name: 'Gasto', data: dashboard.serviceSpend.map((s) => s.amount) }],
  options: {
    chart: { toolbar: { show: false } },
    xaxis: { categories: dashboard.serviceSpend.map((s) => s.service) },
    colors: ['#1261a6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.9,
        opacityTo: 0.6,
        gradientToColors: ['#58a3d9'],
      },
    },
    plotOptions: { bar: { borderRadius: 6, horizontal: true } },
    dataLabels: { formatter: (v: number) => formatCurrency(v) },
  },
}))

const budgetDonutChart = computed(() => {
  const pct = dashboard.kpis?.availableBudgetPct ?? 0
  return {
    series: [pct, 100 - pct],
    options: {
      labels: ['Disponible', 'Ejercido'],
      colors: ['#1261a6', '#e7edf4'],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
      plotOptions: {
        pie: {
          donut: { size: '72%' },
        },
      },
    },
  }
})
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-end flex-wrap ga-4 mb-6">
      <div>
        <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">
          {{ $t('dashboard.eyebrow') }}
        </p>
        <h1 class="text-h4 font-weight-bold mb-1">
          {{ $t('dashboard.greeting', { name: user?.given_name ?? user?.name ?? 'Kevin' }) }}
        </h1>
        <p class="text-body-2 text-medium-emphasis">{{ $t('dashboard.subtitle') }}</p>
      </div>
    </div>

    <v-row class="mb-2">
      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card pa-4">
          <div class="kpi-card__icon kpi-card__icon--blue">$</div>
          <div>
            <span class="text-caption text-medium-emphasis d-block">{{
              $t('dashboard.kpi.porPagar')
            }}</span>
            <strong class="text-h6 d-block">{{
              formatCurrency(dashboard.kpis?.payableThisWeek ?? 0)
            }}</strong>
            <small class="text-caption text-medium-emphasis"
              >{{ dashboard.kpis?.obligationsCount ?? 0 }} obligaciones</small
            >
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card pa-4">
          <div class="kpi-card__icon kpi-card__icon--orange">!</div>
          <div>
            <span class="text-caption text-medium-emphasis d-block">{{
              $t('dashboard.kpi.proximosVencer')
            }}</span>
            <strong class="text-h6 d-block">{{ dashboard.kpis?.upcomingDueCount ?? 0 }}</strong>
            <small class="text-caption text-medium-emphasis">Dentro de 3 días</small>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card pa-4">
          <div class="kpi-card__icon kpi-card__icon--red">×</div>
          <div>
            <span class="text-caption text-medium-emphasis d-block">{{
              $t('dashboard.kpi.vencidos')
            }}</span>
            <strong class="text-h6 d-block">{{ dashboard.kpis?.overdueCount ?? 0 }}</strong>
            <small class="text-caption text-medium-emphasis">Requieren atención</small>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card pa-4">
          <div class="kpi-card__icon kpi-card__icon--green">✓</div>
          <div>
            <span class="text-caption text-medium-emphasis d-block">{{
              $t('dashboard.kpi.presupuestoDisponible')
            }}</span>
            <strong class="text-h6 d-block">{{
              formatCurrency(dashboard.kpis?.availableBudget ?? 0)
            }}</strong>
            <small class="text-caption text-medium-emphasis"
              >{{ dashboard.kpis?.availableBudgetPct ?? 0 }}% disponible</small
            >
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-2">
      <v-col cols="12" lg="8">
        <v-card class="pa-4">
          <div class="d-flex justify-space-between align-start mb-2">
            <div>
              <h2 class="text-h6">{{ $t('dashboard.attention') }}</h2>
              <p class="text-caption text-medium-emphasis">Prioridades ordenadas por urgencia</p>
            </div>
            <v-btn variant="text" color="secondary" size="small">{{ $t('common.seeAll') }}</v-btn>
          </div>
          <v-list lines="two">
            <v-list-item
              v-for="item in dashboard.attentionItems"
              :key="item.id"
              :title="item.title"
              :subtitle="item.description"
            >
              <template #prepend>
                <v-avatar :color="severityColor[item.severity]" variant="tonal" size="36">
                  <v-icon :icon="severityIcon[item.severity]" size="18" />
                </v-avatar>
              </template>
              <template #append>
                <v-chip size="small" :color="severityColor[item.severity]" variant="tonal">
                  {{ item.tag }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" lg="4">
        <v-card class="pa-4">
          <div class="mb-2">
            <h2 class="text-h6">{{ $t('dashboard.budget') }}</h2>
            <p class="text-caption text-medium-emphasis">Julio 2026</p>
          </div>
          <div class="position-relative">
            <ClientOnly>
              <apexchart
                type="donut"
                height="220"
                :options="budgetDonutChart.options"
                :series="budgetDonutChart.series"
              />
            </ClientOnly>
            <div class="donut-center-label">
              <strong class="text-h6">{{ dashboard.kpis?.availableBudgetPct ?? 0 }}%</strong>
              <span class="text-caption text-medium-emphasis">Disponible</span>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card class="pa-4">
          <h2 class="text-h6 mb-4">Gasto por servicio</h2>
          <ClientOnly>
            <apexchart
              type="bar"
              height="260"
              :options="serviceSpendChart.options"
              :series="serviceSpendChart.series"
            />
          </ClientOnly>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
