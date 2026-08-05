<script setup lang="ts">
const dashboard = useDashboardStore()
const casas = useCasasStore()
const selectedCasaId = ref<number | 'todas'>('todas')

const periodFormatter = new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  year: 'numeric',
})
const periods = computed(() => {
  const currentMonth = new Date()
  currentMonth.setDate(1)

  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - index, 1)
    const label = periodFormatter.format(month)
    return label.charAt(0).toLocaleUpperCase('es-MX') + label.slice(1)
  })
})
const selectedPeriod = ref(periods.value[0] ?? '')

const casaOptions = computed(() => [
  { title: 'Todas las casas', value: 'todas' as const },
  ...casas.items.map((casa) => ({
    title: casa.empresa ? `${casa.nombre} · ${casa.empresa}` : casa.nombre,
    value: casa.id,
  })),
])
const selectedCasaLabel = computed(
  () =>
    casaOptions.value.find((option) => option.value === selectedCasaId.value)?.title ??
    'Todas las casas',
)
const totalSpend = computed(() =>
  dashboard.serviceSpend.reduce((total, item) => total + item.amount, 0),
)
const budgetUsedPct = computed(() => 100 - (dashboard.kpis?.availableBudgetPct ?? 0))

onMounted(() => {
  void Promise.all([dashboard.fetchOverview(), casas.fetchCasas()])
})

const trendChart = computed(() => ({
  series: [
    { name: 'Gasto registrado', type: 'area', data: dashboard.spendTrend.map((x) => x.actual) },
    {
      name: 'Presupuesto estimado',
      type: 'line',
      data: dashboard.spendTrend.map((x) => x.planned),
    },
  ],
  options: {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      background: 'transparent',
    },
    colors: ['#0875b1', '#ff791f'],
    stroke: { width: [4, 3], curve: 'straight', dashArray: [0, 8], lineCap: 'round' },
    fill: {
      type: ['gradient', 'solid'],
      opacity: [0.25, 1],
      gradient: { opacityFrom: 0.34, opacityTo: 0.03, stops: [0, 95] },
    },
    markers: {
      size: [5, 0],
      colors: ['#ffffff'],
      strokeColors: '#0875b1',
      strokeWidth: 4,
    },
    dataLabels: { enabled: false },
    grid: { borderColor: '#bed2df', strokeDashArray: 5 },
    xaxis: {
      categories: dashboard.spendTrend.map((x) => x.month),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#71879a', fontSize: '12px' } },
    },
    yaxis: {
      min: 0,
      max: 1000000,
      tickAmount: 4,
      labels: {
        style: { colors: '#71879a', fontSize: '11px' },
        formatter: (value: number) => `$${Math.round(value / 1000)} mil`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#60778b' },
    },
    tooltip: { y: { formatter: (value: number) => formatCurrency(value) } },
  },
}))

const donutChart = computed(() => ({
  series: dashboard.serviceSpend.map((item) => item.amount),
  options: {
    chart: { fontFamily: 'inherit' },
    labels: dashboard.serviceSpend.map((item) => item.service),
    colors: ['#075f99', '#1594bf', '#f8b923', '#ff791f'],
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { y: { formatter: (value: number) => formatCurrency(value) } },
    plotOptions: { pie: { donut: { size: '64%' } } },
  },
}))

function exportDashboard() {
  const rows = [
    ['Resumen de gastos', selectedPeriod.value, selectedCasaLabel.value],
    [],
    ['Servicio', 'Importe', 'Participación'],
    ...dashboard.serviceSpend.map((item) => [item.service, item.amount, `${item.percentage}%`]),
    [],
    ['Mes', 'Gasto registrado', 'Presupuesto estimado'],
    ...dashboard.spendTrend.map((item) => [item.month, item.actual, item.planned]),
  ]
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  link.download = `resumen-gastos-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <section class="dashboard">
    <header class="dashboard__heading">
      <div>
        <h1>Resumen de gastos</h1>
      </div>
    </header>

    <div class="filters-panel">
      <label>
        <span>Casa Petroil</span>
        <select v-model="selectedCasaId" :disabled="casas.loading">
          <option v-for="option in casaOptions" :key="option.value" :value="option.value">
            {{ option.title }}
          </option>
        </select>
      </label>
      <label>
        <span>Periodo</span>
        <select v-model="selectedPeriod">
          <option v-for="period in periods" :key="period">{{ period }}</option>
        </select>
      </label>
      <button type="button" @click="exportDashboard">
        <v-icon icon="mdi-download-outline" size="20" /> Descargar resumen
      </button>
    </div>

    <div class="metrics">
      <article class="metric metric--blue">
        <span>Pagos por ejecutar</span>
        <strong>{{ formatCurrency(dashboard.kpis?.payableThisWeek ?? 0) }}</strong>
      </article>
      <article class="metric metric--yellow">
        <span>Presupuesto disponible</span>
        <strong>{{ formatCurrency(dashboard.kpis?.availableBudget ?? 0) }}</strong>
      </article>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-column">
      <article class="panel trend-panel">
        <div class="panel__heading">
          <div>
            <h2>Evolución mensual</h2>
          </div>
        </div>
        <ClientOnly>
          <apexchart
            type="line"
            height="230"
            :options="trendChart.options"
            :series="trendChart.series"
          />
        </ClientOnly>
      </article>

      <article class="panel budget-panel">
        <div class="panel__heading">
          <h2>Uso del presupuesto</h2>
          <b class="pill">{{ budgetUsedPct }}% ejercido</b>
        </div>
        <div class="branch-list">
          <div v-for="item in dashboard.branchBudget" :key="item.branch" class="branch">
            <div>
              <strong>{{ item.branch }}</strong>
              <span>{{ formatCurrency(item.spent) }} de {{ formatCurrency(item.budget) }}</span>
            </div>
            <div class="progress"><i :style="{ width: `${item.percentage}%` }" /></div>
            <b>{{ item.percentage }}%</b>
          </div>
        </div>
      </article>
      </div>

      <div class="dashboard-column">
      <article class="panel distribution-panel">
        <div class="panel__heading">
          <div><h2>Gasto por servicio</h2></div>
        </div>
        <div class="donut">
          <ClientOnly>
            <apexchart
              type="donut"
              height="170"
              :options="donutChart.options"
              :series="donutChart.series"
            />
          </ClientOnly>
          <div class="donut__total"><strong>{{ formatCurrency(totalSpend) }}</strong><span>Total</span></div>
        </div>
        <div class="service-list">
          <div v-for="(item, index) in dashboard.serviceSpend" :key="item.service">
            <i :class="`color-${index + 1}`" />
            <span><strong>{{ item.service }}</strong><small>{{ item.percentage }}% del total</small></span>
            <b>{{ formatCurrency(item.amount) }}</b>
          </div>
        </div>
      </article>

      <article class="panel attention-panel">
        <div class="panel__heading">
          <h2>Atención requerida</h2>
          <b class="count">{{ dashboard.attentionItems.length }}</b>
        </div>
        <div class="attention-list">
          <div v-for="item in dashboard.attentionItems" :key="item.id">
            <i :class="`attention-icon attention-icon--${item.severity}`">
              <v-icon
                :icon="item.severity === 'success' ? 'mdi-check' : 'mdi-alert-outline'"
                size="18"
              />
            </i>
            <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
            <b>{{ item.tag }}</b>
          </div>
        </div>
      </article>
      </div>

    </div>
  </section>
</template>

<style scoped>
.dashboard { --blue:#075f99; --orange:#ff791f; min-height:calc(100vh - 126px); margin:-24px; padding:16px 24px 24px; background:#eaf5fa; color:#0c2f4d; font-family:Arial,Helvetica,sans-serif; }
.dashboard__heading { position:relative; display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:16px; margin-bottom:16px; padding-left:18px; }
.dashboard__heading::before { position:absolute; top:2px; bottom:2px; left:0; width:5px; border-radius:99px; background:linear-gradient(180deg,#ff963e,#ff6f1a); box-shadow:0 3px 9px rgb(255 111 26 / 22%); content:''; }
.dashboard__heading p { margin:0 0 4px; color:var(--orange); font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
.dashboard__heading h1 { margin:0; color:#123c56; font-size:clamp(1.28rem,1.8vw,1.6rem); font-weight:600; letter-spacing:-.02em; line-height:1.2; }
.dashboard__heading div > span { display:block; margin-top:3px; color:#506f82; font-size:11px; }
.dashboard__heading > small { display:flex; align-items:center; gap:7px; color:#42677d; font-weight:700; }
.filters-panel { display:grid; grid-template-columns:minmax(190px,.85fr) minmax(190px,.85fr) minmax(240px,1.4fr); gap:12px; padding:13px 15px; margin-bottom:14px; border-left:5px solid var(--orange); border-radius:13px; background:linear-gradient(110deg,#d8eaf4,#edf6fa); box-shadow:0 5px 16px rgba(22,76,111,.07); }
.filters-panel label > span { display:block; margin:0 0 5px 2px; color:#34556e; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.filters-panel select,.filters-panel button { width:100%; min-height:38px; border:1px solid #b3cfdf; border-radius:9px; background:rgba(255,255,255,.84); color:#183f5d; font:inherit; font-size:.8rem; font-weight:600; }
.filters-panel select { padding:0 14px; outline:none; }
.filters-panel select:focus { border-color:#5598c1; box-shadow:0 0 0 3px rgba(34,129,186,.14); }
.filters-panel button { align-self:end; display:flex; align-items:center; justify-content:center; gap:9px; color:#0766a2; cursor:pointer; transition:.15s ease; }
.filters-panel button:hover { transform:translateY(-1px); box-shadow:0 7px 18px rgba(26,98,143,.12); }
.metrics { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-bottom:14px; }
.metric,.panel { overflow:hidden; border:1px solid #dce8ef; border-radius:13px; background:rgba(255,255,255,.92); box-shadow:0 6px 18px rgba(23,70,101,.07); }
.metric { --accent:#0878b8; position:relative; min-height:94px; padding:15px 18px; border-top:4px solid var(--accent); }
.metric::after { position:absolute; top:-58px; right:-38px; width:150px; height:150px; border-radius:50%; background:color-mix(in srgb,var(--accent) 8%,transparent); content:''; }
.metric--yellow { --accent:#e9b224; }
.metric > span { color:#5f7789; font-size:.8rem; }
.metric > strong { display:block; margin:6px 0 0; font-size:1.55rem; font-weight:700; line-height:1; }
.metric small { display:flex; align-items:center; gap:5px; color:#a85b23; font-size:9px; }
.metric small.positive { color:#258262; }
.dashboard-grid { display:grid; grid-template-columns:minmax(0,1.75fr) minmax(340px,.85fr); gap:10px 14px; }
.dashboard-column { display:flex; min-width:0; flex-direction:column; gap:10px; }
.panel { padding:14px 18px; border-top:4px solid #1684bc; }
.distribution-panel,.attention-panel { border-top-color:var(--orange); }
.budget-panel { border-top-color:#e9b224; }
.trend-panel,.distribution-panel { height:fit-content; }
.trend-panel :deep(.apexcharts-canvas),
.trend-panel :deep(.apexcharts-svg) { max-height:230px !important; }
.panel__heading { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:2px; }
.panel__heading h2 { margin:0; color:#0b416c; font-size:1rem; font-weight:700; }
.panel__heading p { margin:1px 0 0; color:#74899a; font-size:10px; }
.donut { position:relative; max-width:280px; margin:0 auto; }
.donut__total { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
.donut__total strong { max-width:90px; font-size:14px; } .donut__total span { color:#758b9c; font-size:9px; }
.service-list > div,.attention-list > div { display:grid; align-items:center; border-bottom:1px solid #e4edf2; }
.service-list > div { grid-template-columns:9px 1fr auto; gap:10px; padding:5px 0; }
.service-list > div:last-child,.attention-list > div:last-child { border-bottom:0; }
.service-list i { width:9px; height:9px; border-radius:3px; background:#075f99; }
.service-list i.color-2 { background:#1594bf; } .service-list i.color-3 { background:#f8b923; } .service-list i.color-4 { background:#ff791f; }
.service-list span,.attention-list span { display:flex; flex-direction:column; }
.service-list strong,.attention-list strong { font-size:.8rem; }
.service-list small,.attention-list small { color:#7a8e9d; font-size:.7rem; }
.service-list b { font-size:.8rem; }
.pill,.count { padding:6px 10px; border-radius:99px; background:#e4f2f8; color:#08689e; font-size:10px; }
.branch-list { margin-top:5px; }
.branch { display:grid; grid-template-columns:minmax(120px,.8fr) 1fr 36px; align-items:center; gap:9px; padding:6px 0; border-bottom:1px solid #e4edf2; }
.branch:last-child { border-bottom:0; } .branch > div:first-child { display:flex; flex-direction:column; }
.branch strong { font-size:11px; } .branch span { color:#74899a; font-size:8px; }
.branch > b { color:#176d9c; font-size:10px; text-align:right; }
.progress { overflow:hidden; height:7px; border-radius:99px; background:#e5eef3; }
.progress i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#e7b228,#1685b3); }
.count { display:grid; min-width:28px; min-height:28px; padding:0; place-items:center; background:#fff0e5; color:#d75d0a; }
.attention-list > div { grid-template-columns:28px 1fr auto; gap:7px; padding:5px 0; }
.attention-icon { display:grid; width:25px; height:25px; border-radius:7px; place-items:center; background:#eef5f8; color:#2a789f; }
.attention-icon--critical { background:#fdeaea; color:#bf3f3f; }
.attention-icon--warning { background:#fff4dc; color:#bd7514; }
.attention-icon--success { background:#e4f6ed; color:#27825e; }
.attention-list > div > b { padding:4px 7px; border-radius:6px; background:#f2f6f8; color:#60798b; font-size:9px; }
@media (max-width:1100px) { .dashboard-grid { grid-template-columns:1fr; } }
@media (max-width:800px) {
  .dashboard__heading { align-items:flex-start; flex-direction:column; }
  .filters-panel,.metrics { grid-template-columns:1fr; }
  .panel { padding:20px 17px; }
}
@media (max-width:520px) {
  .branch { grid-template-columns:1fr 40px; gap:8px; }
  .progress { grid-column:1/-1; grid-row:2; }
  .attention-list > div > b { display:none; }
}
</style>
