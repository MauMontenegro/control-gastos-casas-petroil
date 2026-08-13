<script setup lang="ts">
import type { Row, Worksheet } from 'exceljs'
import type { AttentionItem, FundRequest, ServiceSpend, SpendTrendPoint } from '~/types'

const casas = useCasasStore()
const requests = useRequestsStore()
const proofs = useProofsStore()
const selectedCasaId = ref<number | string>('todas')
const selectedPeriod = ref('Este mes')

const demoTrend: SpendTrendPoint[] = [
  { month: 'Mar', actual: 548000, planned: 590000 },
  { month: 'Abr', actual: 622000, planned: 620000 },
  { month: 'May', actual: 598000, planned: 650000 },
  { month: 'Jun', actual: 714000, planned: 680000 },
  { month: 'Jul', actual: 762000, planned: 730000 },
  { month: 'Ago', actual: 684000, planned: 790000 },
]
const demoServices: ServiceSpend[] = [
  { service: 'Hospedaje', amount: 282400, percentage: 41 },
  { service: 'Alimentación', amount: 165800, percentage: 24 },
  { service: 'Limpieza', amount: 110600, percentage: 16 },
  { service: 'Mantenimiento', amount: 75900, percentage: 11 },
  { service: 'Servicios', amount: 55300, percentage: 8 },
]
const demoAttention: AttentionItem[] = [
  { id: '1', title: 'Solicitud pendiente de autorización', description: 'Hospedaje · Casa Campestre', tag: 'Alta', severity: 'critical', actionLabel: 'Revisar' },
  { id: '2', title: 'Comprobaciones pendientes', description: '6 movimientos superan las 72 horas', tag: 'Hoy', severity: 'warning', actionLabel: 'Atender' },
  { id: '3', title: 'Pago próximo a vencer', description: 'Servicio de energía · Casa Centro', tag: '2 días', severity: 'info', actionLabel: 'Ver pago' },
]

const trend = computed(() => {
  if (!requests.loaded) return demoTrend
  const formatter = new Intl.DateTimeFormat('es-MX', { month: 'short' })
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: formatter.format(date).replace('.', '') }
  })
  return months.map(({ key, label }) => {
    const monthRequests = filteredRequests.value.filter((item) => item.requiredDate.startsWith(key))
    return {
      month: label.charAt(0).toUpperCase() + label.slice(1),
      actual: monthRequests.reduce((sum, item) => sum + item.total, 0),
      planned: monthRequests.filter((item) => item.status === 'autorizada').reduce((sum, item) => sum + item.total, 0),
    }
  })
})
const services = computed(() => {
  if (!requests.loaded) return demoServices
  const totals = new Map<string, number>()
  requestConcepts.value.forEach((item) => totals.set(item.expenseType || 'Sin categoría', (totals.get(item.expenseType || 'Sin categoría') ?? 0) + item.amount))
  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0)
  return [...totals.entries()].map(([service, amount]) => ({ service, amount, percentage: total ? Math.round((amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount)
})
const attention = computed(() => {
  if (!requests.loaded) return demoAttention
  return filteredRequests.value
    .filter((item) => item.status !== 'autorizada')
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      title: `${item.folio} · ${item.concepts[0]?.provider || 'Sin proveedor'}`,
      description: `${item.concepts[0]?.casa || 'Sin casa'} · ${formatCurrency(item.total)}`,
      tag: item.status === 'correccion' ? 'Corrección' : 'Revisión',
      severity: item.status === 'correccion' ? 'critical' as const : 'warning' as const,
      actionLabel: 'Revisar',
    }))
})
const totalSpend = computed(() => services.value.reduce((sum, item) => sum + item.amount, 0))
const selectedCasaLabel = computed(() => filterCasaOptions.value.find((item) => item.value === selectedCasaId.value)?.title ?? 'Todas las casas')
const casaOptions = computed(() => [
  { title: 'Todas las casas', value: 'todas' as const },
  ...casas.items.map((casa) => ({ title: `${casa.nombre}${casa.empresa ? ` · ${casa.empresa}` : ''}`, value: casa.id })),
])
const filterCasaOptions = computed(() => {
  const options = new Map<number | string, string>()
  casaOptions.value.slice(1).forEach((item) => options.set(item.value, item.title))
  requests.items.flatMap((request) => request.concepts).forEach((concept) => {
    const name = concept.casa.trim()
    if (name) options.set(`request:${name.toLowerCase()}`, name)
  })
  return [{ title: 'Todas las casas', value: 'todas' }, ...[...options.entries()].map(([value, title]) => ({ title, value }))]
})

const usingDemoData = computed(() => requests.loaded && requests.items.length === 0 && casas.items.length > 0)
const sourceRequests = computed<FundRequest[]>(() => {
  if (requests.items.length || !casas.items.length) return requests.items
  const providers = ['CFE', 'Telmex', 'JMAS', 'Gas Natural', 'Servicios del Norte', 'Megacable']
  const services = ['Energía eléctrica', 'Internet', 'Agua', 'Gas', 'Limpieza', 'Mantenimiento']
  const statuses: FundRequest['status'][] = ['autorizada', 'en-revision', 'autorizada', 'correccion']
  const now = new Date()
  return casas.items.flatMap((casa, casaIndex) =>
    Array.from({ length: 12 }, (_, requestIndex) => {
      const index = casaIndex * 12 + requestIndex
      const monthOffset = requestIndex % 6
      const firstProviderIndex = (casaIndex * 2 + requestIndex) % providers.length
      const secondProviderIndex = (firstProviderIndex + 2 + (casaIndex % 3)) % providers.length
      const firstAmount = 3200 + casa.ocupacionMaxima * 680 + casaIndex * 930 + (requestIndex % 5) * 1450
      const secondAmount = 1800 + casa.ocupacionDisponible * 420 + casaIndex * 510 + (requestIndex % 4) * 870
      const amount = firstAmount + secondAmount
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 3 + ((casaIndex * 3 + requestIndex * 2) % 24))
      const status = statuses[(casaIndex + requestIndex) % statuses.length]!
      const id = `demo-${casa.id}-${requestIndex}`
      return {
        id,
        folio: `DEMO-${String(index + 1).padStart(3, '0')}`,
        requiredDate: date.toISOString().slice(0, 10),
        card: `Casa ${casa.id}`,
        total: amount,
        status,
        sippStatus: status === 'autorizada' ? 'enviada' : 'no-enviada',
        concepts: [
          {
            id: `${id}-concept-1`,
            expenseType: services[firstProviderIndex]!,
            incrementType: 'Gasto operativo',
            casa: casa.nombre,
            provider: providers[firstProviderIndex]!,
            amount: firstAmount,
            documentName: status === 'autorizada' ? `comprobante-${index + 1}-a.pdf` : '',
            documentUrl: '',
            comprobacionStatus: status === 'autorizada' ? 'autorizada' : status === 'correccion' ? 'rechazada' : 'pendiente',
          },
          {
            id: `${id}-concept-2`,
            expenseType: services[secondProviderIndex]!,
            incrementType: 'Servicio recurrente',
            casa: casa.nombre,
            provider: providers[secondProviderIndex]!,
            amount: secondAmount,
            documentName: status === 'autorizada' ? `comprobante-${index + 1}-b.pdf` : '',
            documentUrl: '',
            comprobacionStatus: status === 'autorizada' ? 'autorizada' : requestIndex % 3 === 0 ? 'rechazada' : 'pendiente',
          },
        ],
      }
    }),
  )
})

const filteredRequests = computed(() => {
  const now = new Date()
  const cutoff = selectedPeriod.value === 'Año'
    ? new Date(now.getFullYear(), 0, 1)
    : selectedPeriod.value === 'Trimestre'
      ? new Date(now.getFullYear(), now.getMonth() - 2, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1)
  return sourceRequests.value.filter((request) => {
    const inPeriod = new Date(request.requiredDate) >= cutoff
    const selectedHouse = selectedCasaLabel.value.split('·')[0]!.trim().toLowerCase()
    const inHouse = selectedCasaId.value === 'todas' || request.concepts.some((concept) =>
      concept.casa.trim().toLowerCase().includes(selectedHouse),
    )
    return inPeriod && inHouse
  })
})
const requestConcepts = computed(() => filteredRequests.value.flatMap((request) => request.concepts))
const demoProviders = [
  { name: 'CFE', amount: 142000 }, { name: 'Telmex', amount: 96800 },
  { name: 'Servicios del Norte', amount: 89400 }, { name: 'JMAS', amount: 77500 },
  { name: 'Gas Natural', amount: 38300 },
]
const providerSpend = computed(() => {
  if (!requests.loaded) return demoProviders
  const totals = new Map<string, number>()
  requestConcepts.value.forEach((item) => totals.set(item.provider || 'Sin proveedor', (totals.get(item.provider || 'Sin proveedor') ?? 0) + item.amount))
  return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
})
const requestStats = computed(() => ({
  total: requests.loaded ? filteredRequests.value.length : 48,
  review: requests.loaded ? filteredRequests.value.filter((item) => item.status === 'en-revision').length : 14,
  approved: requests.loaded ? filteredRequests.value.filter((item) => item.status === 'autorizada').length : 27,
  correction: requests.loaded ? filteredRequests.value.filter((item) => item.status === 'correccion').length : 7,
  amount: requests.loaded ? filteredRequests.value.reduce((sum, item) => sum + item.total, 0) : 899000,
}))
const proofStats = computed(() => {
  const concepts = requestConcepts.value.filter((item) => item.comprobacionStatus)
  if (concepts.length) {
    const complete = concepts.filter((item) => item.comprobacionStatus === 'autorizada').length
    return { total: concepts.length, complete, pending: concepts.length - complete }
  }
  if (!requests.loaded && proofs.items.length) return { total: proofs.items.length, complete: proofs.completeCount, pending: proofs.pendingCount }
  return { total: 0, complete: 0, pending: 0 }
})
const comprobationRate = computed(() => Math.round((proofStats.value.complete / Math.max(proofStats.value.total, 1)) * 100))
const houseActivity = computed(() => casas.items
  .filter((casa) => selectedCasaId.value === 'todas' || casa.id === selectedCasaId.value || casa.nombre === selectedCasaLabel.value)
  .map((casa) => {
    const houseRequests = filteredRequests.value.filter((request) => request.concepts.some((concept) => concept.casa.trim().toLowerCase() === casa.nombre.trim().toLowerCase()))
    const concepts = houseRequests.flatMap((request) => request.concepts)
    return {
      ...casa,
      occupied: Math.max(casa.ocupacionMaxima - casa.ocupacionDisponible, 0),
      requests: houseRequests.length,
      amount: houseRequests.reduce((sum, request) => sum + request.total, 0),
      completed: concepts.filter((concept) => concept.comprobacionStatus === 'autorizada').length,
      providers: new Set(concepts.map((concept) => concept.provider)).size,
    }
  }))

const efficiencyChart = computed(() => ({
  series: [{
    name: 'Solicitudes',
    data: Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - (5 - index))
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return filteredRequests.value.filter((item) => item.requiredDate.startsWith(key)).length
    }),
  }],
  options: {
    chart: { type: 'area', sparkline: { enabled: true }, fontFamily: 'inherit' },
    colors: ['#e9824e'],
    stroke: { width: 3, curve: 'smooth', lineCap: 'round' },
    fill: { type: 'gradient', gradient: { opacityFrom: .34, opacityTo: .04 } },
    markers: { size: 4, colors: ['#fff'], strokeColors: '#e9824e', strokeWidth: 3, hover: { size: 5 } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (value: number) => `${value} solicitudes` } },
  },
}))

const houseCostChart = computed(() => ({
  series: [{ name: 'Gasto', data: services.value.map((item) => item.amount) }],
  options: {
    chart: { type: 'area', sparkline: { enabled: true }, fontFamily: 'inherit' },
    colors: ['#159bc3'], stroke: { width: 3, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { opacityFrom: .42, opacityTo: .04 } },
    tooltip: { y: { formatter: (value: number) => formatCurrency(value) } },
  },
}))

const comprobationChart = computed(() => ({
  series: [comprobationRate.value],
  options: {
    chart: { type: 'radialBar', sparkline: { enabled: true }, fontFamily: 'inherit' },
    colors: [comprobationRate.value >= 85 ? '#35aa79' : '#f29a32'],
    plotOptions: { radialBar: { hollow: { size: '62%' }, track: { background: '#e8eff2' }, dataLabels: { name: { show: false }, value: { offsetY: 5, fontSize: '20px', fontWeight: 800, color: '#0a3857', formatter: (value: number) => `${Math.round(value)}%` } } } },
  },
}))

const requestStatusChart = computed(() => ({
  series: [
    { name: 'Monto', data: providerSpend.value.slice(0, 7).map((item) => item.amount) },
  ],
  options: {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#0878b8'],
    plotOptions: { bar: { horizontal: true, borderRadius: 8, barHeight: '64%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#dbe8ed', strokeDashArray: 4 },
    xaxis: {
      categories: providerSpend.value.slice(0, 7).map((item) => item.name),
      labels: { formatter: (value: number) => `$${Math.round(value / 1000)} mil`, style: { colors: '#4e6d7c', fontSize: '12px', fontWeight: 600 } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: '#153f54', fontSize: '12px', fontWeight: 750 }, maxWidth: 145 } },
    legend: { show: false },
    tooltip: { y: { formatter: (value: number) => formatCurrency(value) } },
  },
}))

const trendChart = computed(() => ({
  series: [
    { name: 'Monto solicitado', type: 'area', data: trend.value.map((item) => item.actual) },
    { name: 'Monto comprobado', type: 'line', data: trend.value.map((item) => item.planned) },
  ],
  options: {
    chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
    colors: ['#0878b8', '#ff8a34'],
    stroke: { width: [3, 3], curve: 'smooth', dashArray: [0, 7] },
    fill: { type: ['gradient', 'solid'], gradient: { opacityFrom: 0.35, opacityTo: 0.03 } },
    dataLabels: { enabled: false },
    markers: { size: [4, 0], strokeWidth: 3, strokeColors: '#fff' },
    grid: { borderColor: '#c8dce5', strokeDashArray: 4, padding: { left: 8, right: 8 } },
    xaxis: {
      categories: trend.value.map((item) => item.month),
      axisBorder: { show: false }, axisTicks: { show: false },
      labels: { style: { colors: '#547383', fontSize: '12px', fontWeight: 600 } },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `$${Math.round(value / 1000)} mil`,
        style: { colors: '#547383', fontSize: '11px', fontWeight: 600 },
      },
    },
    legend: {
      position: 'top', horizontalAlign: 'right', fontSize: '12px', fontWeight: 700,
      labels: { colors: '#365d70' }, markers: { size: 6 }, itemMargin: { horizontal: 12 },
    },
    tooltip: { y: { formatter: (value: number) => formatCurrency(value) } },
  },
}))

const donutChart = computed(() => ({
  series: services.value.map((item) => item.amount),
  options: {
    chart: { fontFamily: 'inherit' }, labels: services.value.map((item) => item.service),
    colors: ['#075f99', '#19a0c5', '#f6b82a', '#ff7d2c', '#65a66b'], stroke: { width: 0 },
    dataLabels: { enabled: false }, legend: { show: false },
    plotOptions: { pie: { donut: { size: '72%' } } },
    tooltip: { y: { formatter: (value: number) => formatCurrency(value) } },
  },
}))

onMounted(() => void Promise.all([casas.fetchCasas(), requests.fetchRequests(), proofs.fetchProofs()]))

async function exportDashboard() {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Control de Gastos Petroil'
  workbook.created = new Date()

  const navy = '0B5B87'
  const blue = '1689B8'
  const green = '3D9A72'
  const lightBlue = 'EAF4F8'
  const lightGray = 'F4F8FA'
  const darkText = '123C52'
  const moneyFormat = '$#,##0.00'

  function styleTitle(sheet: Worksheet, title: string, subtitle: string, columns: number) {
    sheet.mergeCells(1, 1, 1, columns)
    const titleCell = sheet.getCell(1, 1)
    titleCell.value = title
    titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${navy}` } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    sheet.getRow(1).height = 34
    sheet.mergeCells(2, 1, 2, columns)
    const subtitleCell = sheet.getCell(2, 1)
    subtitleCell.value = subtitle
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF557786' } }
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightBlue}` } }
    sheet.getRow(2).height = 23
  }

  function styleHeader(row: Row) {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${blue}` } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } } }
    })
    row.height = 24
  }

  function stripeRows(sheet: Worksheet, start: number, end: number) {
    for (let rowNumber = start; rowNumber <= end; rowNumber += 1) {
      const row = sheet.getRow(rowNumber)
      if ((rowNumber - start) % 2 === 1) {
        row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${lightGray}` } } })
      }
      row.eachCell((cell) => {
        cell.font = { ...cell.font, color: { argb: `FF${darkText}` } }
        cell.alignment = { vertical: 'middle' }
      })
    }
  }

  const filterSummary = `Filtros: ${selectedCasaLabel.value} · Periodo: ${selectedPeriod.value} · ${usingDemoData.value ? 'Datos demostrativos basados en casas reales' : 'Datos reales'} · Generado: ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}`
  const summary = workbook.addWorksheet('Resumen ejecutivo', { views: [{ state: 'frozen', ySplit: 3 }] })
  styleTitle(summary, 'CONTROL DE GASTOS · RESUMEN EJECUTIVO', filterSummary, 4)
  summary.columns = [{ width: 30 }, { width: 20 }, { width: 26 }, { width: 30 }]
  summary.addRow([])
  const summaryHeader = summary.addRow(['Indicador', 'Resultado', 'Referencia', 'Lectura ejecutiva'])
  styleHeader(summaryHeader)
  const summaryRows = [
    ['Gasto total del periodo', totalSpend.value, selectedPeriod.value, 'Importe registrado en las categorías visibles'],
    ['Solicitudes registradas', requestStats.value.total, selectedPeriod.value, `${requestStats.value.review} en revisión`],
    ['Monto solicitado', requestStats.value.amount, selectedCasaLabel.value, 'Importe acumulado de las solicitudes'],
    ['Solicitudes autorizadas', requestStats.value.approved, 'Estado actual', `${requestStats.value.correction} requieren corrección`],
    ['Gasto promedio por solicitud', requestStats.value.amount / Math.max(requestStats.value.total, 1), `${requestStats.value.total} solicitudes`, 'Importe promedio solicitado'],
    ['Tasa de comprobación', comprobationRate.value / 100, 'Meta: mínimo 85%', comprobationRate.value >= 85 ? 'Dentro de la meta' : 'Debajo de la meta'],
    ['Comprobaciones pendientes', proofStats.value.pending, `${proofStats.value.total} comprobaciones`, 'Pendientes de completar'],
  ]
  summary.addRows(summaryRows)
  stripeRows(summary, 5, 4 + summaryRows.length)
  ;[5, 7, 9].forEach((row) => { summary.getCell(row, 2).numFmt = moneyFormat })
  summary.getCell(10, 2).numFmt = '0%'
  summary.autoFilter = { from: 'A4', to: 'D11' }

  const trendSheet = workbook.addWorksheet('Tendencia mensual', { views: [{ state: 'frozen', ySplit: 4 }] })
  styleTitle(trendSheet, 'EVOLUCIÓN DEL GASTO', filterSummary, 5)
  trendSheet.columns = [{ width: 15 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 18 }]
  trendSheet.addRow([])
  styleHeader(trendSheet.addRow(['Periodo', 'Monto solicitado', 'Monto comprobado', 'Pendiente por comprobar', 'Tasa de comprobación']))
  trend.value.forEach((item) => trendSheet.addRow([item.month, item.actual, item.planned, item.actual - item.planned, item.actual / item.planned]))
  stripeRows(trendSheet, 5, 4 + trend.value.length)
  for (let row = 5; row <= 4 + trend.value.length; row += 1) {
    ;[2, 3, 4].forEach((column) => { trendSheet.getCell(row, column).numFmt = moneyFormat })
    trendSheet.getCell(row, 5).numFmt = '0.0%'
    const variance = Number(trendSheet.getCell(row, 4).value)
    trendSheet.getCell(row, 4).font = { bold: true, color: { argb: variance > 0 ? 'FFB74740' : `FF${green}` } }
  }
  trendSheet.autoFilter = { from: 'A4', to: `E${4 + trend.value.length}` }

  const categorySheet = workbook.addWorksheet('Gasto por categoría', { views: [{ state: 'frozen', ySplit: 4 }] })
  styleTitle(categorySheet, 'DISTRIBUCIÓN DEL GASTO', filterSummary, 4)
  categorySheet.columns = [{ width: 27 }, { width: 20 }, { width: 18 }, { width: 28 }]
  categorySheet.addRow([])
  styleHeader(categorySheet.addRow(['Categoría', 'Importe', 'Participación', 'Lectura']))
  services.value.forEach((item) => categorySheet.addRow([item.service, item.amount, item.percentage / 100, item.percentage >= 30 ? 'Categoría principal' : 'Participación secundaria']))
  stripeRows(categorySheet, 5, 4 + services.value.length)
  for (let row = 5; row <= 4 + services.value.length; row += 1) { categorySheet.getCell(row, 2).numFmt = moneyFormat; categorySheet.getCell(row, 3).numFmt = '0.0%' }
  categorySheet.autoFilter = { from: 'A4', to: `D${4 + services.value.length}` }

  const providerSheet = workbook.addWorksheet('Gasto por proveedor', { views: [{ state: 'frozen', ySplit: 4 }] })
  styleTitle(providerSheet, 'GASTO POR PROVEEDOR', filterSummary, 4)
  providerSheet.columns = [{ width: 10 }, { width: 32 }, { width: 22 }, { width: 20 }]
  providerSheet.addRow([])
  styleHeader(providerSheet.addRow(['Posición', 'Proveedor', 'Importe acumulado', 'Participación']))
  const providerTotal = providerSpend.value.reduce((sum, item) => sum + item.amount, 0)
  providerSpend.value.forEach((item, index) => providerSheet.addRow([index + 1, item.name, item.amount, item.amount / providerTotal]))
  stripeRows(providerSheet, 5, 4 + providerSpend.value.length)
  for (let row = 5; row <= 4 + providerSpend.value.length; row += 1) { providerSheet.getCell(row, 3).numFmt = moneyFormat; providerSheet.getCell(row, 4).numFmt = '0.0%' }
  providerSheet.autoFilter = { from: 'A4', to: `D${4 + providerSpend.value.length}` }

  const houseSheet = workbook.addWorksheet('Detalle por casa', { views: [{ state: 'frozen', ySplit: 4 }] })
  styleTitle(houseSheet, 'ACTIVIDAD POR CASA', filterSummary, 9)
  houseSheet.columns = [
    { width: 32 }, { width: 24 }, { width: 22 }, { width: 16 }, { width: 16 },
    { width: 16 }, { width: 20 }, { width: 18 }, { width: 16 },
  ]
  houseSheet.addRow([])
  styleHeader(houseSheet.addRow(['Casa', 'Empresa', 'Sucursal', 'Ocupacion', 'Disponibles', 'Solicitudes', 'Monto solicitado', 'Comprobadas', 'Proveedores']))
  houseActivity.value.forEach((house) => houseSheet.addRow([
    house.nombre,
    house.empresa,
    house.sucursal,
    `${house.occupied} de ${house.ocupacionMaxima}`,
    house.ocupacionDisponible,
    house.requests,
    house.amount,
    house.completed,
    house.providers,
  ]))
  stripeRows(houseSheet, 5, 4 + houseActivity.value.length)
  for (let row = 5; row <= 4 + houseActivity.value.length; row += 1) houseSheet.getCell(row, 7).numFmt = moneyFormat
  houseSheet.autoFilter = { from: 'A4', to: `I${4 + houseActivity.value.length}` }

  const attentionSheet = workbook.addWorksheet('Prioridades', { views: [{ state: 'frozen', ySplit: 4 }] })
  styleTitle(attentionSheet, 'PRIORIDADES Y ALERTAS', filterSummary, 5)
  attentionSheet.columns = [{ width: 14 }, { width: 30 }, { width: 46 }, { width: 16 }, { width: 22 }]
  attentionSheet.addRow([])
  styleHeader(attentionSheet.addRow(['Severidad', 'Prioridad', 'Descripción', 'Etiqueta', 'Acción recomendada']))
  attention.value.forEach((item) => attentionSheet.addRow([item.severity === 'critical' ? 'Crítica' : item.severity === 'warning' ? 'Vigilancia' : 'Informativa', item.title, item.description, item.tag, item.actionLabel]))
  stripeRows(attentionSheet, 5, 4 + attention.value.length)
  attentionSheet.autoFilter = { from: 'A4', to: `E${4 + attention.value.length}` }

  workbook.eachSheet((sheet) => {
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .25, right: .25, top: .5, bottom: .5, header: .2, footer: .2 } }
    sheet.properties.defaultRowHeight = 20
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  link.download = `reporte-gastos-petroil-${new Date().toISOString().slice(0, 10)}.xlsx`
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <section class="executive-dashboard">
    <header class="hero">
      <div>
        <span class="eyebrow">Centro de control financiero</span>
        <h1>Panorama ejecutivo</h1>
        <p>Decisiones claras, gastos bajo control y prioridades en un solo lugar.</p>
      </div>
      <div class="hero__status"><i /> {{ usingDemoData ? 'Demostración con casas reales' : 'Datos actualizados' }}</div>
    </header>

    <div class="control-bar">
      <v-select v-model="selectedCasaId" :items="filterCasaOptions" density="compact" hide-details prepend-inner-icon="mdi-home-city-outline" />
      <div class="period-switch">
        <button v-for="period in ['Este mes', 'Trimestre', 'Año']" :key="period" :class="{ active: selectedPeriod === period }" @click="selectedPeriod = period">{{ period }}</button>
      </div>
      <button class="export-button" @click="exportDashboard"><v-icon icon="mdi-tray-arrow-down" size="18" /> Exportar reporte</button>
    </div>

    <div class="statistics-grid">
      <article class="stat-card stat-card--efficiency">
        <div class="stat-copy">
          <span>Solicitudes registradas</span>
          <strong>{{ requestStats.total }}</strong>
          <small><v-icon icon="mdi-file-document-multiple-outline" size="14" />{{ requestStats.review }} en revisión · {{ requestStats.approved }} autorizadas</small>
        </div>
        <div class="stat-visual stat-visual--bars">
          <ClientOnly><apexchart type="area" height="82" :options="efficiencyChart.options" :series="efficiencyChart.series" /></ClientOnly>
          <div class="month-labels"><span v-for="item in trend" :key="item.month">{{ item.month }}</span></div>
        </div>
      </article>

      <article class="stat-card stat-card--cost">
        <div class="stat-copy">
          <span>Gasto promedio por solicitud</span>
          <strong>{{ formatCurrency(requestStats.amount / requestStats.total) }}</strong>
          <small><v-icon icon="mdi-cash-multiple" size="14" />{{ formatCurrency(requestStats.amount) }} solicitado en total</small>
        </div>
        <div class="stat-visual">
          <ClientOnly><apexchart type="area" height="90" :options="houseCostChart.options" :series="houseCostChart.series" /></ClientOnly>
        </div>
      </article>

      <article class="stat-card stat-card--rate">
        <div class="stat-copy">
          <span>Comprobaciones completas</span>
          <strong>{{ proofStats.complete }} de {{ proofStats.total }}</strong>
          <small :class="{ warning: proofStats.pending > 0 }"><v-icon icon="mdi-receipt-text-check-outline" size="14" />{{ proofStats.pending }} pendientes de completar</small>
        </div>
        <div class="radial-visual"><ClientOnly><apexchart type="radialBar" height="105" :options="comprobationChart.options" :series="comprobationChart.series" /></ClientOnly></div>
      </article>
    </div>

    <div class="main-grid">
      <article class="card trend-card">
        <div class="card-heading">
          <div><span class="card-kicker">Movimiento financiero</span><h2>Solicitado vs. comprobado</h2></div>
          <span class="forecast"><v-icon icon="mdi-receipt-text-check-outline" size="16" /> {{ comprobationRate }}% comprobado</span>
        </div>
        <ClientOnly><apexchart type="line" height="285" :options="trendChart.options" :series="trendChart.series" /></ClientOnly>
        <div class="insight"><v-icon icon="mdi-lightbulb-on-outline" size="19" /><span><b>Resultado:</b> hay {{ proofStats.pending }} comprobaciones pendientes; el monto solicitado del periodo es {{ formatCurrency(requestStats.amount) }}.</span></div>
      </article>

      <article class="card distribution-card">
        <div class="card-heading"><div><span class="card-kicker">Composición</span><h2>¿En qué gastamos?</h2></div><button aria-label="Más opciones">•••</button></div>
        <div class="donut-wrap">
          <ClientOnly><apexchart type="donut" height="220" :options="donutChart.options" :series="donutChart.series" /></ClientOnly>
          <div class="donut-label"><strong>{{ formatCurrency(totalSpend) }}</strong><span>Total ejercido</span></div>
        </div>
        <div class="legend">
          <div v-for="(item, index) in services" :key="item.service"><i :class="`dot-${index}`" /><span>{{ item.service }}</span><b>{{ item.percentage }}%</b></div>
        </div>
      </article>

      <article
        class="ranking-card"
        style="border: 0 !important; background: transparent !important; box-shadow: none !important; outline: 0 !important;"
      >
        <div class="card-heading ranking-heading"><div><span class="card-kicker">Concentración del gasto</span><h2>Gasto por proveedor</h2></div><span class="subtle">{{ providerSpend.length }} proveedores</span></div>
        <div class="ranking-list">
          <div v-for="(item, index) in providerSpend.slice(0, 5)" :key="item.name" class="rank-row provider-row">
            <span class="rank-number">{{ index + 1 }}</span>
            <div class="rank-house"><strong>{{ item.name }}</strong><small>{{ formatCurrency(item.amount) }} acumulado</small></div>
            <div class="budget-meter">
              <div class="bar"><i :style="{ width: `${Math.round((item.amount / providerSpend[0]!.amount) * 100)}%` }" /></div>
              <small>Participación: <b>{{ Math.round((item.amount / providerSpend.reduce((sum, provider) => sum + provider.amount, 0)) * 100) }}%</b></small>
            </div>
            <strong class="rank-percent">{{ formatCurrency(item.amount) }}</strong>
          </div>
        </div>
      </article>

      <article class="card pipeline-card">
        <div class="card-heading money-heading">
          <div><span class="card-kicker">Resultado de operación</span><h2>Solicitudes y gasto por proveedor</h2></div>
          <span class="subtle">Datos del periodo</span>
        </div>
        <div class="money-result-strip">
          <div><span>Solicitudes totales</span><strong>{{ requestStats.total }}</strong></div>
          <div><span>Monto solicitado</span><strong>{{ formatCurrency(requestStats.amount) }}</strong></div>
          <div><span>Autorizadas</span><strong>{{ requestStats.approved }}</strong></div>
          <div :class="{ 'result-risk': requestStats.correction > 0 }"><span>En corrección</span><strong>{{ requestStats.correction }}</strong></div>
        </div>
        <ClientOnly><apexchart type="bar" height="285" :options="requestStatusChart.options" :series="requestStatusChart.series" /></ClientOnly>
      </article>

      <article class="card attention-card">
        <div class="card-heading"><div><span class="card-kicker">Prioridades</span><h2>Requiere atención</h2></div><span class="alert-count">{{ attention.length }}</span></div>
        <div class="attention-list">
          <div v-for="item in attention" :key="item.id" :class="`attention attention--${item.severity}`">
            <i><v-icon :icon="item.severity === 'critical' ? 'mdi-alert' : item.severity === 'warning' ? 'mdi-clock-alert-outline' : 'mdi-information-outline'" size="19" /></i>
            <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
            <button>{{ item.actionLabel }}</button>
          </div>
        </div>
        <NuxtLink to="/comprobaciones" class="all-link">Ver todas las prioridades <v-icon icon="mdi-arrow-right" size="16" /></NuxtLink>
      </article>

    </div>
  </section>
</template>

<style scoped>
.executive-dashboard{--navy:#092f49;--blue:#0794d1;--muted:#6f8492;min-height:calc(100vh - 126px);margin:-24px;padding:14px 18px 18px;background:radial-gradient(circle at 85% 0,#cceaf4 0,transparent 24%),linear-gradient(135deg,#eaf5f8,#f5fafb 52%,#e2f1f6);color:var(--navy);font-family:Arial,Helvetica,sans-serif}.hero{display:flex;min-height:52px;align-items:center;justify-content:space-between;margin-bottom:9px}.eyebrow,.card-kicker{color:#ff8c3a;font-size:.59rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.hero h1{margin:2px 0;font-size:1.5rem;letter-spacing:-.04em}.hero p{margin:0;color:var(--muted);font-size:.7rem}.hero__status{display:flex;align-items:center;gap:7px;color:#567181;font-size:.66rem;font-weight:700}.hero__status i{width:7px;height:7px;border-radius:50%;background:#38b77e;box-shadow:0 0 0 4px #cdeedf,0 0 16px #38b77e}.control-bar{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;align-items:center;gap:10px;padding:7px 9px;margin-bottom:10px;border:1px solid rgba(255,255,255,.9);border-radius:12px;background:rgba(255,255,255,.72);box-shadow:0 7px 22px rgba(15,63,88,.06)}.control-bar :deep(.v-field){border-radius:9px;background:#eaf3f6;font-size:.72rem}.control-bar :deep(.v-field__outline){display:none}.period-switch{display:flex;padding:3px;border-radius:9px;background:#e7f0f3}.period-switch button,.export-button{border:0;font:inherit;cursor:pointer}.period-switch button{padding:6px 12px;border-radius:7px;background:transparent;color:#708390;font-size:.65rem;font-weight:700}.period-switch button.active{background:#fff;color:#086b9f;box-shadow:0 2px 8px rgba(24,70,95,.1)}.export-button{display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:9px;background:linear-gradient(135deg,#08689e,#06486f);color:white;font-size:.68rem;font-weight:800;box-shadow:0 7px 17px rgba(7,95,153,.2)}.kpi-grid{display:grid;grid-template-columns:1.18fr 1fr 1fr .9fr;gap:9px;margin-bottom:10px}.kpi,.card{border:1px solid rgba(203,222,231,.9);background:rgba(255,255,255,.92);box-shadow:0 7px 20px rgba(15,62,88,.065)}.kpi{--accent:#0794d1;position:relative;overflow:hidden;min-height:104px;padding:12px 14px;border-radius:13px}.kpi--green{--accent:#38a875;background:linear-gradient(140deg,#f7fffb,#e8f7f0)}.kpi--orange{--accent:#f09032}.kpi--red{--accent:#e05757;background:linear-gradient(140deg,#fff,#fff1ef)}.kpi::before{position:absolute;inset:0 auto 0 0;width:4px;background:var(--accent);box-shadow:0 0 18px var(--accent);content:''}.kpi__top{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:.65rem;font-weight:700}.kpi__top i{display:grid;width:29px;height:29px;border-radius:9px;place-items:center;background:color-mix(in srgb,var(--accent) 13%,white);color:var(--accent);box-shadow:0 0 13px color-mix(in srgb,var(--accent) 20%,transparent)}.kpi>strong{display:block;margin:5px 0 3px;font-size:1.25rem;letter-spacing:-.04em}.kpi small{color:#83939d;font-size:.57rem}.kpi small b{color:var(--accent)}.spark{position:absolute;right:10px;bottom:9px;display:flex;width:62px;height:20px;align-items:end;gap:3px;opacity:.25}.spark i{width:5px;border-radius:4px 4px 0 0;background:var(--accent)}.main-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(300px,.85fr);grid-template-rows:auto auto;gap:10px}.card{padding:13px 15px;border-radius:14px}.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.card-heading h2{margin:2px 0 0;font-size:.91rem;letter-spacing:-.02em}.card-heading>button{border:0;background:transparent;color:#91a0a9;cursor:pointer}.trend-card{position:relative;overflow:hidden;border-color:#174e6c;background:linear-gradient(145deg,#082f49,#0b4967);color:#eaf8fd;box-shadow:0 13px 30px rgba(7,47,74,.2)}.trend-card::after{position:absolute;top:-90px;right:-70px;width:220px;height:220px;border-radius:50%;background:rgba(21,174,222,.12);filter:blur(3px);content:'';pointer-events:none}.trend-card .card-kicker{color:#58d4ff}.trend-card .card-heading h2{color:#fff}.forecast{display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid rgba(91,224,174,.18);border-radius:99px;background:rgba(69,190,139,.15);color:#81e0b8;font-size:.57rem;font-weight:800}.insight{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(126,198,226,.12);border-radius:9px;background:rgba(255,255,255,.07);color:#bfdae6;font-size:.61rem}.insight .v-icon{color:#ffb45c}.distribution-card{background:linear-gradient(155deg,#fff 55%,#edf9fc)}.donut-wrap{position:relative;margin:-5px 0}.donut-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}.donut-label strong{font-size:.9rem}.donut-label span{color:#81929c;font-size:.54rem}.legend{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px}.legend>div{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:6px;font-size:.62rem}.legend i{width:7px;height:7px;border-radius:50%;background:#075f99;box-shadow:0 0 7px currentColor}.legend .dot-1{background:#19a0c5}.legend .dot-2{background:#f6b82a}.legend .dot-3{background:#ff7d2c}.legend .dot-4{background:#65a66b}.legend b{font-size:.61rem}.ranking-list{display:grid;margin-top:8px}.rank-row{display:grid;grid-template-columns:22px minmax(120px,.75fr) 1fr 35px;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #e9f0f3}.rank-row:last-child{border-bottom:0}.rank-number{display:grid;width:20px;height:20px;border-radius:7px;place-items:center;background:#e7f3f7;color:#39718e;font-size:.57rem;font-weight:900}.rank-row>div:nth-child(2){display:flex;flex-direction:column}.rank-row strong{font-size:.65rem}.rank-row small,.subtle{color:#82939d;font-size:.53rem}.bar{overflow:hidden;height:6px;border-radius:99px;background:#e8eff2}.bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#08a5d5,#53b886);box-shadow:0 0 10px #53b886}.bar i.warning{background:linear-gradient(90deg,#f0be2b,#f07928);box-shadow:0 0 10px rgba(240,121,40,.35)}.rank-row>b{font-size:.63rem;text-align:right}.pipeline-card{grid-column:1;background:linear-gradient(115deg,#fff,#edf8fb)}.pipeline{display:grid;grid-template-columns:repeat(4,1fr);align-items:end;gap:5px;margin-top:10px}.pipeline-step{position:relative;display:flex;justify-content:center}.pipeline-step>div{display:flex;min-height:70px;flex-direction:column;align-items:center;justify-content:center;border-radius:9px;background:color-mix(in srgb,var(--step-color) 12%,white);border-bottom:3px solid var(--step-color);box-shadow:inset 0 -8px 18px color-mix(in srgb,var(--step-color) 5%,transparent)}.pipeline-step strong{font-size:1.05rem}.pipeline-step span{font-size:.59rem;font-weight:800}.pipeline-step small{margin-top:2px;color:#7b8d98;font-size:.52rem}.pipeline-step>b{position:absolute;z-index:2;top:36%;right:-10px;padding:2px;border-radius:4px;background:#fff;color:#84949e;font-size:.5rem}.attention-card{grid-column:2;grid-row:2/4;border-color:#183f59;background:linear-gradient(160deg,#0b344f,#0b4561);color:#eaf7fb;box-shadow:0 12px 28px rgba(7,47,74,.18)}.attention-card .card-kicker{color:#ffad67}.attention-card .card-heading h2{color:#fff}.attention-list{display:grid;gap:6px;margin:9px 0}.attention{display:grid;grid-template-columns:29px 1fr auto;align-items:center;gap:7px;padding:8px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.07)}.attention>i{display:grid;width:27px;height:27px;border-radius:8px;place-items:center;background:rgba(48,167,214,.16);color:#64d1fa}.attention--critical>i{background:rgba(237,87,87,.17);color:#ff9292}.attention--warning>i{background:rgba(255,180,61,.15);color:#ffc875}.attention span{display:flex;min-width:0;flex-direction:column}.attention strong{color:#f3fbfe;font-size:.61rem}.attention small{overflow:hidden;color:#9fc0ce;font-size:.52rem;text-overflow:ellipsis;white-space:nowrap}.attention button{border:0;background:transparent;color:#65d3fb;font-size:.54rem;font-weight:900;cursor:pointer}.alert-count{display:grid;width:23px;height:23px;border-radius:8px;place-items:center;background:rgba(255,102,89,.18);color:#ff9b91;font-size:.61rem;font-weight:900}.all-link{display:flex;align-items:center;justify-content:center;gap:5px;padding-top:7px;border-top:1px solid rgba(255,255,255,.1);color:#72d6fa;font-size:.58rem;font-weight:800;text-decoration:none}@media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.main-grid{grid-template-columns:1fr}.attention-card,.pipeline-card{grid-column:auto;grid-row:auto}}@media(max-width:700px){.executive-dashboard{padding:12px}.hero{align-items:flex-start;flex-direction:column;gap:8px}.control-bar{grid-template-columns:1fr}.kpi-grid{grid-template-columns:1fr}.pipeline{grid-template-columns:repeat(2,1fr)}.rank-row{grid-template-columns:22px 1fr 35px}.rank-row .bar{grid-column:2/4}.period-switch{justify-content:space-between}.period-switch button{flex:1}}
.executive-dashboard{font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif}.main-grid{align-items:start}.ranking-card,.attention-card{height:100%}.attention-card{grid-column:2;grid-row:2;align-self:stretch}.pipeline-card{grid-column:1/-1;grid-row:3}.attention-list{align-content:start}.attention{grid-template-columns:30px minmax(0,1fr) max-content;min-height:46px}.attention strong{font-size:.66rem;line-height:1.25}.attention small{margin-top:2px;font-size:.55rem;line-height:1.3}.attention button{padding:5px 0 5px 8px;white-space:nowrap}.all-link{margin-top:auto}.pipeline-step>b{top:5px;right:5px;padding:2px 4px;border:1px solid #d9e7ec;border-radius:5px;background:rgba(255,255,255,.9);color:#577482}.card-heading h2{font-weight:750;line-height:1.25}.stat-copy>span,.rank-row strong,.pipeline-step span{letter-spacing:.005em}.stat-copy>strong{font-weight:760}.hero h1{font-weight:760}.control-bar,.statistics-grid,.main-grid{width:100%}.distribution-card{display:flex;min-height:355px;flex-direction:column;border:0;background:transparent;box-shadow:none}.distribution-card .card-heading{position:relative;z-index:2;padding:0 12px}.distribution-card .donut-wrap{width:250px;height:250px;align-self:center;margin:-8px auto -14px;border:1px solid rgba(255,255,255,.9);border-radius:50%;background:radial-gradient(circle at 38% 32%,#fff 0,#f5fbfd 58%,#dceff5 100%);box-shadow:0 18px 35px rgba(14,83,113,.14),inset 0 0 0 9px rgba(255,255,255,.4)}.distribution-card .donut-label strong{font-size:1rem}.distribution-card .legend{position:relative;z-index:2;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px;border:1px solid #dceaf0;border-radius:14px;background:rgba(255,255,255,.82);box-shadow:0 8px 20px rgba(16,74,101,.08);backdrop-filter:blur(8px)}.distribution-card .legend>div{padding:4px 5px;border-radius:8px;background:#f3f8fa}.stat-card--rate{position:relative;overflow:visible;border:0;background:transparent;box-shadow:none}.stat-card--rate .stat-copy{padding:14px 82px 14px 14px;border:1px solid #f0dfbd;border-radius:18px 50px 50px 18px;background:linear-gradient(135deg,#fff,#fff7e7);box-shadow:0 8px 20px rgba(122,88,24,.08)}.stat-card--rate .radial-visual{position:absolute;right:0;width:108px;height:108px;margin:0;border:7px solid #f7fafb;border-radius:50%;background:#fff;box-shadow:0 12px 25px rgba(35,83,104,.16),0 0 0 1px #e0eaee}@media(max-width:1100px){.attention-card,.pipeline-card{grid-column:auto;grid-row:auto}.ranking-card,.attention-card{height:auto}}@media(max-width:700px){.attention{grid-template-columns:30px minmax(0,1fr)}.attention button{grid-column:2;justify-self:start;padding-left:0}.distribution-card{min-height:340px}.stat-card--rate{grid-template-columns:1fr}.stat-card--rate .stat-copy{padding-right:72px}}
</style>

<style scoped>
/* Ranking y prioridades más compactos, sin perder información. */
.ranking-card,
.attention-card {
  padding: 14px 17px !important;
}

.ranking-heading {
  padding-bottom: 8px;
}

.ranking-heading .card-kicker,
.attention-card .card-kicker {
  font-size: 0.58rem !important;
}

.ranking-heading h2,
.attention-card .card-heading h2 {
  margin-top: 1px;
  font-size: 0.94rem !important;
}

.ranking-summary {
  gap: 5px;
}

.ranking-summary span {
  padding: 4px 7px;
  font-size: 0.52rem;
}

.ranking-list {
  gap: 5px;
  padding-top: 4px;
}

.rank-row {
  min-height: 46px;
  padding: 6px 8px !important;
  border-radius: 9px;
}

.rank-number {
  width: 22px;
  height: 22px;
  font-size: 0.58rem;
}

.rank-house strong {
  font-size: 0.67rem !important;
}

.rank-house small,
.budget-meter small {
  margin-top: 1px;
  font-size: 0.52rem !important;
}

.bar {
  height: 6px !important;
}

.rank-percent {
  font-size: 0.7rem !important;
}

.health-badge {
  min-width: 58px;
  padding: 4px 6px;
  font-size: 0.5rem;
}

.attention-card .card-heading {
  margin-bottom: 6px;
}

.attention-list {
  gap: 5px;
  margin: 6px 0;
}

.attention {
  min-height: 43px;
  grid-template-columns: 29px minmax(0, 1fr) max-content;
  gap: 7px;
  padding: 6px 8px;
  border-radius: 9px;
}

.attention > i {
  width: 27px;
  height: 27px;
}

.attention strong {
  font-size: 0.66rem;
}

.attention small {
  margin-top: 1px;
  font-size: 0.55rem;
  line-height: 1.2;
}

.attention button {
  padding: 3px 0 3px 7px;
  font-size: 0.57rem;
}

.alert-count {
  width: 22px;
  height: 22px;
}

.all-link {
  padding-top: 6px;
  font-size: 0.58rem;
}
</style>

<style scoped>
.ranking-card {
  overflow: visible !important;
  padding: 17px 19px 20px !important;
}
.ranking-heading h2 {
  font-size: 1.08rem !important;
}
.ranking-heading .card-kicker {
  font-size: .64rem !important;
}
.ranking-summary span {
  padding: 6px 10px;
  font-size: .59rem;
  box-shadow: 0 8px 16px rgba(22,68,88,.09);
}
.ranking-list {
  gap: 10px;
  padding: 10px 2px 2px;
}
.rank-row {
  min-height: 62px;
  padding: 10px 13px !important;
  border: 0 !important;
  border-radius: 15px;
  background: #f8fbfc;
  box-shadow:
    0 12px 24px rgba(20,67,87,.11),
    0 2px 5px rgba(20,67,87,.05),
    inset 0 1px #fff;
}
.rank-row:hover {
  transform: translateY(-4px);
  box-shadow: 0 17px 30px rgba(20,67,87,.16),0 4px 8px rgba(20,67,87,.06);
}
.rank-number {
  width: 29px;
  height: 29px;
  border-radius: 9px;
  font-size: .7rem;
}
.rank-house strong {
  font-size: .78rem !important;
  line-height: 1.25;
}
.rank-house small,
.budget-meter small {
  margin-top: 4px;
  font-size: .61rem !important;
  line-height: 1.25;
}
.budget-meter {
  gap: 7px;
}
.budget-meter small b {
  font-size: .64rem;
}
.bar {
  height: 8px !important;
}
.rank-percent {
  font-size: .86rem !important;
  font-weight: 850;
}
.health-badge {
  min-width: 70px;
  padding: 7px 9px;
  border-radius: 9px;
  font-size: .59rem;
}
@media(max-width:800px){.rank-row{min-height:74px}}
</style>

<style scoped>
.pipeline-card {
  padding: 22px 25px 20px !important;
  border-top: 4px solid #1689b8 !important;
  box-shadow: 0 16px 34px rgba(20,68,89,.12) !important;
}
.money-heading .card-kicker {
  font-size: .7rem !important;
  letter-spacing: .15em;
}
.money-heading h2 {
  margin-top: 4px !important;
  font-size: 1.2rem !important;
  font-weight: 780;
}
.money-heading .subtle {
  padding: 6px 10px;
  border-radius: 99px;
  background: #edf5f8;
  color: #496b7b !important;
  font-size: .68rem;
  font-weight: 700;
}
.money-result-strip {
  gap: 13px;
  margin: 18px 0 8px;
}
.money-result-strip>div {
  min-height: 78px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  padding: 13px 16px;
  overflow: hidden;
  border: 0;
  border-radius: 15px;
  background: linear-gradient(145deg,#f8fbfc,#edf5f8);
  box-shadow: 0 12px 24px rgba(20,68,89,.11),inset 0 1px #fff;
  transition: transform .16s ease,box-shadow .16s ease;
}
.money-result-strip>div:hover {
  transform: translateY(-3px);
  box-shadow: 0 17px 29px rgba(20,68,89,.16),0 0 18px rgba(22,137,184,.08);
}
.money-result-strip>div::before {
  width: 5px;
  box-shadow: 0 0 15px currentColor;
}
.money-result-strip span {
  color: #4d6d7c;
  font-size: .67rem;
  font-weight: 750;
}
.money-result-strip strong {
  margin-top: 7px;
  color: #0b3852;
  font-size: 1.14rem;
  font-weight: 820;
  letter-spacing: -.025em;
}
.money-result-strip .result-risk strong { color:#b74740; }
.pipeline-card :deep(.apexcharts-bar-area) {
  filter: drop-shadow(0 6px 5px rgba(25,77,98,.13));
}
.pipeline-card :deep(.apexcharts-legend-text) {
  color:#365d70 !important;
  font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif !important;
}
.pipeline-card :deep(.apexcharts-xaxis-label),
.pipeline-card :deep(.apexcharts-yaxis-label) {
  font-family:"Segoe UI Variable","Segoe UI",Arial,sans-serif !important;
}
@media(prefers-reduced-motion:reduce){.money-result-strip>div{transition:none}.money-result-strip>div:hover{transform:none}}
</style>

<style scoped>
.ranking-card,
.ranking-card:hover {
  padding: 10px 4px 12px !important;
  overflow: visible !important;
  border: 0 !important;
  border-top: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transform: none !important;
}
.ranking-card::before,
.ranking-card::after { display:none !important; }
.ranking-heading {
  padding: 0 8px 9px;
  border-bottom: 0;
}
.ranking-summary span {
  background: rgba(255,255,255,.72);
  box-shadow: 0 9px 18px rgba(22,68,88,.11);
  backdrop-filter: blur(8px);
}
.ranking-list {
  gap: 12px;
  padding: 7px 0 2px;
}
.rank-row {
  min-height: 66px;
  padding: 11px 15px !important;
  background: rgba(255,255,255,.91);
  box-shadow:
    0 15px 28px rgba(20,67,87,.13),
    0 3px 7px rgba(20,67,87,.05),
    inset 0 1px rgba(255,255,255,.9);
  backdrop-filter: blur(10px);
}
.rank-row:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 34px rgba(20,67,87,.18),0 5px 10px rgba(20,67,87,.07);
}
</style>

<style scoped>
.provider-row {
  grid-template-columns: 29px minmax(150px,.8fr) minmax(210px,1.25fr) minmax(100px,.55fr) !important;
}
.provider-row .rank-percent {
  white-space: nowrap;
}
@media(max-width:800px){.provider-row{grid-template-columns:29px 1fr auto!important}.provider-row .budget-meter{grid-column:2/4}}
</style>

<style scoped>
.ranking-card,
.ranking-card:hover,
.ranking-card:focus,
.ranking-card:focus-within {
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transform: none !important;
}
.ranking-heading {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.provider-row {
  background: rgba(255,255,255,.9) !important;
}
</style>

<style scoped>
.ranking-card {
  position: relative;
  align-self: start;
  width: 100%;
  min-width: 0;
  color: #103b53;
}
</style>

<style scoped>
/* Regreso a la versión clara, limpia y funcional. */
.executive-dashboard {
  --navy: #0a3857;
  --muted: #6f8492;
  background: radial-gradient(circle at 90% -8%, #d8edf5 0, transparent 28%), #edf6f9;
  color: #0a3857;
}
.hero h1 { color: #0a3857; }
.hero p,.hero__status { color: #637e8d; }

.control-bar {
  overflow: hidden;
  border: 1px solid #d9e7ed;
  border-radius: 14px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 7px 22px rgba(15,63,88,.07);
}
.control-bar::after { display: none; }
.control-bar :deep(.v-field),.period-switch { background: #edf4f6; }
.control-bar :deep(.v-field__input),.control-bar :deep(.v-icon),.period-switch button { color: #567282; }
.period-switch button.active { background: #fff; color: #086b9f; box-shadow: 0 2px 8px rgba(24,70,95,.1); }
.export-button { background: #075f99; box-shadow: 0 7px 17px rgba(7,95,153,.18); }

.statistics-grid { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 11px; }
.stat-card,.stat-card--efficiency,.stat-card--cost {
  min-height: 124px;
  padding: 13px 15px;
  overflow: hidden;
  border: 1px solid #d6e5ec;
  border-left: 4px solid #2fa67b;
  border-radius: 15px;
  background: rgba(255,255,255,.95);
  box-shadow: 0 8px 22px rgba(15,62,88,.07);
}
.stat-card::before { display: none; }
.stat-card--cost { border-left-color: #159bc3; background: linear-gradient(135deg,#fff,#eef9fc); }
.stat-copy>span { color: #647d8d; font-size: .7rem; }
.stat-copy>strong { color: #0b3b58; font-size: 1.4rem; }
.stat-copy small { color: #388d6d; font-size: .57rem; }
.stat-copy small.warning { color: #b87522; }
.month-labels { color: #8096a3; font-size: .48rem; }
.stat-card--rate { min-height: 124px; padding: 0 43px 0 0; background: transparent; box-shadow: none; }
.stat-card--rate .stat-copy {
  min-height: 104px;
  padding: 14px 94px 14px 16px;
  border: 1px solid #efdfbe;
  border-radius: 18px 58px 58px 18px;
  background: linear-gradient(135deg,#fff,#fff6e5);
  box-shadow: 0 8px 20px rgba(122,88,24,.08);
}
.stat-card--rate .radial-visual {
  right: 0;
  width: 114px;
  height: 114px;
  overflow: hidden;
  border: 7px solid #f7fafb;
  background: #fff;
  box-shadow: 0 12px 25px rgba(35,83,104,.16),0 0 0 1px #dce8ed;
}

.main-grid { gap: 12px; }
.card,.ranking-card,.attention-card,.trend-card,.pipeline-card {
  padding: 16px 18px;
  overflow: hidden;
  border: 1px solid #dbe8ee;
  border-radius: 16px;
  background: rgba(255,255,255,.95);
  box-shadow: 0 8px 24px rgba(15,62,88,.07);
  color: #0a3857;
}
.card::after,.card::before { display: none; }
.card:hover { transform: none; border-color: #dbe8ee; box-shadow: 0 8px 24px rgba(15,62,88,.07); }
.card-heading h2,.ranking-card .card-heading h2,.pipeline-card .card-heading h2 { color: #0b416c; }
.card-kicker { color: #ec7628; }
.subtle,.ranking-card .subtle,.pipeline-card .subtle { color: #82939d; }

.trend-card { background: #fff; color: #0a3857; }
.trend-card .card-kicker { color: #ec7628; }
.trend-card .card-heading h2 { color: #0b416c; }
.forecast { background: #e7f5ed; color: #31805f; }
.insight { border: 0; background: #eef7fb; color: #527486; }

.distribution-card { padding: 16px 18px; background: #fff; box-shadow: 0 8px 24px rgba(15,62,88,.07); }
.distribution-card .card-heading { padding: 0; }
.distribution-card .card-heading h2,.distribution-card .donut-label strong { color: #0b416c; }
.distribution-card .donut-label span { color: #81929c; }
.distribution-card .donut-wrap { width: 250px; height: 220px; background: transparent!important; box-shadow: none!important; }
.distribution-card .donut-wrap :deep(.apexcharts-pie-series path) { filter: none; }
.distribution-card .legend { border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.distribution-card .legend>div { background: transparent; }
.distribution-card .legend span,.distribution-card .legend b { color: #24495d; }

.rank-row { padding: 8px 0; border-bottom-color: #e9f0f3; }
.rank-number { background: #e7f3f7; color: #39718e; }
.rank-row strong { color: #173f55; font-size: .7rem; }
.rank-row small { color: #82939d; font-size: .57rem; }
.rank-row>b { color: #456b7c; }
.bar { height: 7px; background: #e8eff2; }

.attention-card { background: #fff; }
.attention-card .card-kicker { color: #ec7628; }
.attention-card .card-heading h2 { color: #0b416c; }
.attention { min-height: 49px; border-color: #e4edf1; background: #f4f8fa; }
.attention:hover { background: #edf5f8; }
.attention strong { color: #173f55; }
.attention small { color: #81919a; }
.attention button,.all-link { color: #0b73aa; }
.all-link { border-top-color: #e8eff2; }

.pipeline-card { background: #fff; }
.pipeline { grid-template-columns: repeat(4,minmax(0,1fr)); gap: 38px; padding: 10px 0 0; }
.pipeline-step>div {
  width: 100%;
  height: auto;
  min-height: 84px;
  flex-basis: auto;
  border: 1px solid color-mix(in srgb,var(--step-color) 20%,white);
  border-bottom: 4px solid var(--step-color);
  border-radius: 11px;
  background: color-mix(in srgb,var(--step-color) 11%,white);
  box-shadow: none;
}
.pipeline-step>div:hover { transform: none; box-shadow: none; }
.pipeline-step strong { color: #0a3b57; font-size: 1.25rem; }
.pipeline-step span { color: #164b65; font-size: .66rem; }
.pipeline-step small { color: #6d8794; font-size: .56rem; }
.pipeline-step>div::after { right: -29px; width: 19px; background: #bdd2dc; }
.pipeline-step>div::before { right: -30px; border-color: #8cabb9; }
.pipeline-step>b { top: 5px; right: -34px; min-width: 29px; padding: 3px 4px; border: 1px solid #cfe0e7; background: #fff; color: #557889; font-size: .52rem; }

@media(max-width:1100px){.statistics-grid{grid-template-columns:1fr 1fr}.stat-card--rate{grid-column:1/-1}.pipeline{grid-template-columns:repeat(2,1fr)}.pipeline-step>b,.pipeline-step>div::before,.pipeline-step>div::after{display:none}}
@media(max-width:700px){.statistics-grid{grid-template-columns:1fr}.stat-card--rate{grid-column:auto}.pipeline{grid-template-columns:1fr}}
</style>

<style scoped>
/* Superficie única solicitada: azul petróleo #2b586a. */
.control-bar,
.stat-card,
.stat-card--cost,
.stat-card--rate .stat-copy,
.card,
.trend-card,
.ranking-card,
.pipeline-card,
.attention-card,
.distribution-card .legend {
  border-color: rgba(190, 225, 238, 0.13);
  background: #2b586a;
  box-shadow:
    0 20px 40px rgba(25, 65, 81, 0.2),
    inset 0 1px rgba(255, 255, 255, 0.055);
}

.control-bar::after,
.trend-card::before {
  background: rgba(80, 197, 231, 0.08);
}

.control-bar :deep(.v-field),
.period-switch {
  background: rgba(218, 237, 244, 0.1);
}
.control-bar :deep(.v-field__input),
.control-bar :deep(.v-icon),
.period-switch button { color: #c2dbe5; }
.period-switch button.active {
  background: rgba(118, 190, 216, 0.24);
  color: #f5fbfd;
}

.stat-copy > span,
.card-heading .subtle,
.ranking-card .subtle,
.pipeline-card .subtle { color: #aac8d4; }
.stat-copy > strong,
.card-heading h2,
.ranking-card .card-heading h2,
.pipeline-card .card-heading h2 { color: #f4fbfe; }
.stat-copy small { color: #7de0b7; }
.stat-copy small.warning { color: #ffc778; }
.month-labels { color: #87aebd; }

.stat-card--rate {
  background: transparent;
  box-shadow: none;
}
.stat-card--rate .radial-visual {
  border-color: #376778;
  background: #2b586a;
  box-shadow: 0 18px 34px rgba(23, 61, 76, 0.28), 0 0 24px rgba(242, 154, 50, 0.16);
}

.distribution-card {
  background: transparent;
  box-shadow: none;
}
.distribution-card .card-heading h2,
.distribution-card .donut-label strong { color: #f4fbfe; }
.distribution-card .donut-label span { color: #aac8d4; }
.distribution-card .legend > div { background: rgba(218, 237, 244, 0.07); }
.distribution-card .legend span,
.distribution-card .legend b { color: #ddecf2; }

.rank-row { border-bottom-color: rgba(205, 231, 240, 0.1); }
.rank-number { background: rgba(102, 189, 220, 0.16); color: #85daf6; }
.rank-row strong { color: #eaf6fa; }
.rank-row small { color: #95b7c4; }
.rank-row > b { color: #d5e8ef; }
.bar { background: rgba(218, 237, 244, 0.12); }

.attention { background: rgba(218, 237, 244, 0.07); }
.attention:hover { background: rgba(218, 237, 244, 0.11); }

.pipeline-step > div {
  background: radial-gradient(
    circle at 33% 27%,
    color-mix(in srgb, var(--step-color) 20%, #477487),
    color-mix(in srgb, var(--step-color) 12%, #224c5d)
  );
}
.pipeline-step strong,
.pipeline-step span { color: #f2fbfe; }
.pipeline-step small { color: #a5c4d0; }
.pipeline-step > b { background: #3b6a7c; color: #d8eaf1; }
.pipeline-step > div::after { background: #6c99aa; }
.pipeline-step > div::before { border-color: #8ab3c2; }
</style>

<style scoped>
/* Sistema visual unificado: cápsulas flotantes, luz ambiental y una sola paleta. */
.executive-dashboard {
  --surface-a: #dcebf0;
  --surface-b: #c9dfe7;
  --surface-c: #b8d5df;
  --ink: #123f56;
  --soft-ink: #587787;
  background:
    radial-gradient(circle at 8% 12%, rgba(69, 180, 214, 0.14), transparent 24%),
    radial-gradient(circle at 92% 38%, rgba(255, 154, 69, 0.11), transparent 20%),
    linear-gradient(145deg, #cbdfe6, #e1edf1 46%, #c6dce4);
  color: var(--ink);
}

.hero,
.control-bar,
.statistics-grid,
.main-grid { position: relative; z-index: 1; }

.control-bar {
  overflow: hidden;
  border: 0;
  border-radius: 22px;
  background: linear-gradient(120deg, rgba(224, 238, 242, 0.96), rgba(193, 218, 227, 0.96));
  box-shadow: 0 18px 38px rgba(31, 77, 96, 0.14), inset 0 1px rgba(255, 255, 255, 0.45);
}
.control-bar::after {
  position: absolute;
  z-index: -1;
  top: -70px;
  right: 10%;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: rgba(72, 181, 216, 0.12);
  filter: blur(10px);
  content: '';
}
.control-bar :deep(.v-field),
.period-switch { background: rgba(115, 163, 182, 0.17); }
.export-button {
  border-radius: 99px;
  background: linear-gradient(135deg, #277b9e, #175b79);
  box-shadow: 0 9px 20px rgba(25, 91, 120, 0.24), 0 0 18px rgba(42, 160, 202, 0.12);
}

.statistics-grid { gap: 15px; }
.stat-card {
  position: relative;
  min-height: 128px;
  overflow: visible;
  border: 0;
  border-radius: 25px;
  background: linear-gradient(120deg, rgba(222, 237, 241, 0.98), rgba(190, 216, 225, 0.98));
  box-shadow: 0 19px 36px rgba(31, 77, 96, 0.14), inset 0 1px rgba(255, 255, 255, 0.42);
}
.stat-card::before {
  position: absolute;
  z-index: -1;
  right: -10px;
  bottom: -9px;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: rgba(39, 164, 201, 0.15);
  filter: blur(15px);
  content: '';
}
.stat-card--efficiency { box-shadow: 0 19px 36px rgba(31, 77, 96, 0.14), inset 5px 0 #43ac84; }
.stat-card--cost {
  background: linear-gradient(120deg, #d8eaf0, #b8d7e2);
  box-shadow: 0 19px 36px rgba(31, 77, 96, 0.14), inset 5px 0 #2a9fc5;
}
.stat-copy > span { color: #557484; font-size: 0.68rem; }
.stat-copy > strong { color: #123f56; }
.stat-copy small { color: #347d64; }

.stat-card--rate {
  min-height: 128px;
  padding: 0 48px 0 0;
  background: transparent;
  box-shadow: none;
}
.stat-card--rate::before { display: none; }
.stat-card--rate .stat-copy {
  min-height: 112px;
  padding: 16px 95px 16px 18px;
  border: 0;
  border-radius: 25px 65px 65px 25px;
  background: linear-gradient(110deg, #dcebf0 0%, #d2e3e5 66%, #e2d8c8 100%);
  box-shadow: 0 19px 36px rgba(31, 77, 96, 0.14), inset 0 1px rgba(255, 255, 255, 0.45);
}
.stat-card--rate .radial-visual {
  right: -2px;
  width: 122px;
  height: 122px;
  border: 9px solid #dce9ed;
  background: #dce9ed;
  box-shadow: 0 18px 34px rgba(31, 77, 96, 0.2), 0 0 24px rgba(242, 154, 50, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}

.main-grid { gap: 16px; }
.card {
  position: relative;
  overflow: visible;
  border: 0;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(216, 233, 239, 0.96), rgba(184, 213, 223, 0.96));
  box-shadow: 0 22px 42px rgba(31, 77, 96, 0.15), inset 0 1px rgba(255, 255, 255, 0.42);
}
.card:hover {
  border-color: transparent;
  box-shadow: 0 26px 48px rgba(31, 77, 96, 0.19), 0 0 26px rgba(35, 145, 185, 0.09);
}
.card-heading h2,
.ranking-card .card-heading h2,
.pipeline-card .card-heading h2 { color: #123f56; }

.trend-card {
  overflow: hidden;
  background: linear-gradient(145deg, #315f74, #244f64);
  box-shadow: 0 24px 46px rgba(26, 66, 83, 0.22), 0 0 28px rgba(27, 142, 184, 0.1);
}
.trend-card::before {
  position: absolute;
  right: -60px;
  bottom: -90px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: rgba(72, 202, 237, 0.1);
  filter: blur(6px);
  content: '';
}

.distribution-card {
  padding-inline: 10px;
  background: transparent;
  box-shadow: none;
}
.distribution-card:hover { box-shadow: none; transform: none; }
.distribution-card .donut-wrap {
  width: 260px;
  height: 238px;
  background: transparent !important;
}
.distribution-card .donut-wrap :deep(.apexcharts-pie-series path) {
  filter: drop-shadow(0 10px 9px rgba(27, 71, 89, 0.2));
}
.distribution-card .legend {
  border: 0;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(207, 227, 234, 0.95), rgba(174, 207, 219, 0.95));
  box-shadow: 0 17px 32px rgba(31, 77, 96, 0.14);
}

.ranking-card { background: linear-gradient(135deg, #d9e9ee, #b9d6e0); }
.ranking-card::after,
.attention-card::after {
  position: absolute;
  z-index: -1;
  right: 20px;
  bottom: -12px;
  width: 62%;
  height: 45px;
  border-radius: 50%;
  background: rgba(37, 93, 115, 0.2);
  filter: blur(20px);
  content: '';
}

.attention-card {
  background: linear-gradient(150deg, #47798c, #37687b);
  box-shadow: 0 24px 44px rgba(29, 67, 83, 0.2), 0 0 26px rgba(51, 164, 201, 0.09);
}
.attention { background: rgba(205, 231, 239, 0.1); }

.pipeline-card {
  padding: 18px 24px 24px;
  background: linear-gradient(135deg, #d5e7ed, #b7d4df);
  box-shadow: 0 22px 42px rgba(31, 77, 96, 0.15);
}
.pipeline { padding-top: 13px; }
.pipeline-step > div {
  border: 0;
  background: radial-gradient(
    circle at 32% 25%,
    color-mix(in srgb, var(--step-color) 8%, #e3eff2),
    color-mix(in srgb, var(--step-color) 24%, #accdd8)
  );
  box-shadow:
    0 18px 32px rgba(31, 77, 96, 0.18),
    0 0 25px color-mix(in srgb, var(--step-color) 15%, transparent),
    inset 0 1px rgba(255, 255, 255, 0.55);
}
.pipeline-step > div:hover {
  box-shadow: 0 23px 38px rgba(31, 77, 96, 0.22), 0 0 32px color-mix(in srgb, var(--step-color) 20%, transparent);
  transform: translateY(-4px) scale(1.025);
}
.pipeline-step > b {
  border: 0;
  border-radius: 99px;
  background: #b1d0db;
  box-shadow: 0 8px 16px rgba(31, 77, 96, 0.14);
}

@media (prefers-reduced-motion: no-preference) {
  .pipeline-step > div { transition: transform 180ms ease, box-shadow 180ms ease; }
}
</style>

<style scoped>
/* Paleta continua: azul medio, sin tarjetas blancas ni bases detrás de las gráficas. */
.executive-dashboard {
  background:
    radial-gradient(circle at 86% 4%, rgba(104, 191, 218, 0.16), transparent 26%),
    linear-gradient(145deg, #c4dce5 0%, #d3e6ec 50%, #bfd8e2 100%);
}

.control-bar,
.stat-card,
.ranking-card,
.pipeline-card {
  border-color: rgba(255, 255, 255, 0.28);
  background: linear-gradient(145deg, rgba(190, 216, 226, 0.94), rgba(170, 204, 217, 0.94));
  box-shadow: 0 15px 30px rgba(39, 82, 99, 0.13), inset 0 1px rgba(255, 255, 255, 0.28);
}

.control-bar :deep(.v-field),
.period-switch {
  background: rgba(142, 184, 201, 0.28);
}

.period-switch button.active {
  background: #6e9eb2;
  color: #f4fbfd;
}

.stat-card--cost {
  background: linear-gradient(145deg, #bedae4, #a9cfdd);
}

.stat-card--rate .stat-copy {
  background: linear-gradient(135deg, #bdd7df, #c8d8d5);
}

.trend-card {
  background: linear-gradient(145deg, #37697d, #2b5b70);
  box-shadow: 0 18px 34px rgba(29, 68, 84, 0.2);
}

.attention-card {
  background: linear-gradient(155deg, #46778a, #38697d);
  box-shadow: 0 18px 34px rgba(29, 68, 84, 0.18);
}

.distribution-card {
  background: transparent;
  box-shadow: none;
}

.distribution-card .donut-wrap {
  width: 250px;
  height: 230px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: none !important;
  box-shadow: none !important;
}

.distribution-card .donut-wrap :deep(.apexcharts-canvas),
.distribution-card .donut-wrap :deep(.apexcharts-svg),
.distribution-card .donut-wrap :deep(.apexcharts-inner) {
  overflow: visible !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.distribution-card .donut-wrap :deep(.apexcharts-pie-series path) {
  filter: drop-shadow(0 7px 7px rgba(35, 76, 93, 0.16));
}

.distribution-card .donut-label strong { color: #244f62; }
.distribution-card .donut-label span { color: #57798a; }

.distribution-card .legend {
  border-color: rgba(255, 255, 255, 0.25);
  background: linear-gradient(145deg, rgba(181, 211, 222, 0.92), rgba(164, 199, 212, 0.92));
  box-shadow: 0 12px 24px rgba(39, 82, 99, 0.12);
}

.distribution-card .legend > div {
  background: rgba(122, 169, 188, 0.17);
}

.ranking-card .bar { background: rgba(79, 128, 148, 0.2); }
.ranking-card .rank-row { border-bottom-color: rgba(74, 121, 140, 0.16); }

.pipeline-step > div {
  background: radial-gradient(
    circle at 34% 28%,
    color-mix(in srgb, var(--step-color) 10%, #c8dfe7),
    color-mix(in srgb, var(--step-color) 20%, #abcdd9)
  );
}

.pipeline-step > b { background: #b4d1dc; }
</style>

<style scoped>
/* Acabado tonal: superficies medias y gráficas circulares sin disco de fondo. */
.executive-dashboard {
  background:
    radial-gradient(circle at 88% 2%, rgba(91, 188, 219, 0.14), transparent 25%),
    linear-gradient(145deg, #dcecf2 0%, #eaf4f7 52%, #d8e9ef 100%);
}

.control-bar,
.stat-card,
.ranking-card {
  background: rgba(237, 246, 249, 0.84);
  box-shadow: 0 14px 28px rgba(34, 85, 106, 0.1);
}

.stat-card--cost {
  background: linear-gradient(145deg, #eaf5f8, #dceff4);
}

.trend-card {
  background: linear-gradient(145deg, #164b64, #103d55);
}

.attention-card {
  background: linear-gradient(155deg, #20546a, #17465d);
  box-shadow: 0 18px 34px rgba(26, 70, 91, 0.18);
}

.distribution-card .donut-wrap {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.distribution-card .legend {
  background: rgba(229, 241, 246, 0.9);
  box-shadow: 0 10px 22px rgba(37, 84, 104, 0.1);
}

.distribution-card .legend > div {
  background: rgba(255, 255, 255, 0.34);
}

.stat-card--rate .stat-copy {
  background: linear-gradient(135deg, #e9f3f5, #eee9dc);
  box-shadow: 0 13px 26px rgba(66, 86, 87, 0.1);
}

.stat-card--rate .radial-visual {
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.pipeline-card {
  border: 1px solid rgba(255, 255, 255, 0.55);
  background: linear-gradient(135deg, rgba(218, 237, 244, 0.92), rgba(229, 242, 246, 0.9));
  box-shadow: 0 16px 32px rgba(37, 85, 105, 0.11);
}

.pipeline-card:hover {
  box-shadow: 0 18px 36px rgba(37, 85, 105, 0.13);
}

.pipeline-step > div {
  border: 0;
  background: radial-gradient(
    circle at 34% 28%,
    color-mix(in srgb, var(--step-color) 10%, #e9f3f6),
    color-mix(in srgb, var(--step-color) 24%, #d4e8ee)
  );
  box-shadow:
    0 16px 28px rgba(42, 88, 106, 0.13),
    0 0 18px color-mix(in srgb, var(--step-color) 10%, transparent),
    inset 0 -5px 12px rgba(42, 88, 106, 0.05);
}

.pipeline-step strong { color: #17465d; }
.pipeline-step span { color: #315f72; }
.pipeline-step small { color: #708994; }

.pipeline-step > b {
  background: #e8f2f5;
  color: #587887;
  box-shadow: 0 5px 12px rgba(41, 83, 101, 0.1);
}
</style>

<style scoped>
.executive-dashboard {
  --navy: #eefaff;
  --muted: #91afbd;
  background:
    radial-gradient(circle at 8% 8%, rgba(14, 145, 190, 0.18), transparent 25%),
    radial-gradient(circle at 92% 26%, rgba(255, 127, 52, 0.1), transparent 22%),
    linear-gradient(145deg, #041a29 0%, #072538 48%, #051d2c 100%);
  color: #eaf8fd;
}

.hero h1 { color: #f3fbff; }
.hero p,
.hero__status { color: #94b3c1; }
.hero__status i { box-shadow: 0 0 0 4px rgba(56, 183, 126, 0.14), 0 0 18px #38b77e; }

.control-bar {
  border-color: rgba(134, 202, 227, 0.14);
  background: rgba(8, 45, 65, 0.7);
  box-shadow: 0 16px 35px rgba(0, 8, 15, 0.3);
  backdrop-filter: blur(14px);
}

.control-bar :deep(.v-field) {
  background: rgba(255, 255, 255, 0.07);
  color: #e8f8fd;
}

.control-bar :deep(.v-field__input),
.control-bar :deep(.v-icon) { color: #d9eef6; }
.period-switch { background: rgba(0, 12, 20, 0.3); }
.period-switch button { color: #91afbd; }
.period-switch button.active {
  background: linear-gradient(135deg, #127ba8, #0b587c);
  color: #fff;
  box-shadow: 0 5px 14px rgba(7, 119, 163, 0.3);
}

.stat-card,
.card {
  border: 1px solid rgba(126, 199, 225, 0.14);
  background: linear-gradient(145deg, rgba(16, 61, 82, 0.88), rgba(8, 42, 61, 0.9));
  box-shadow: 0 18px 38px rgba(0, 8, 14, 0.28), inset 0 1px rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(12px);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.stat-card:hover,
.card:hover {
  border-color: rgba(80, 200, 239, 0.3);
  box-shadow: 0 22px 44px rgba(0, 8, 14, 0.34), 0 0 24px rgba(22, 151, 195, 0.08);
  transform: translateY(-2px);
}

.stat-card {
  border-left: 0;
  border-radius: 20px;
}

.stat-card--efficiency { box-shadow: 0 18px 38px rgba(0, 8, 14, 0.28), inset 0 3px #36b482; }
.stat-card--cost { box-shadow: 0 18px 38px rgba(0, 8, 14, 0.28), inset 0 3px #21a8d0; }
.stat-copy > span { color: #a3c0cc; }
.stat-copy > strong { color: #f2fbff; }
.stat-copy small { color: #67d5a7; }
.stat-copy small.warning { color: #ffc46d; }
.month-labels { color: #7699a8; }

.stat-card--rate {
  background: transparent;
  box-shadow: none;
}

.stat-card--rate:hover { box-shadow: none; }
.stat-card--rate .stat-copy {
  border-color: rgba(245, 170, 67, 0.2);
  background: linear-gradient(135deg, rgba(77, 57, 29, 0.72), rgba(18, 49, 62, 0.92));
  box-shadow: 0 18px 35px rgba(0, 8, 14, 0.28), inset 0 1px rgba(255, 193, 99, 0.08);
}
.stat-card--rate .radial-visual {
  border-color: #0b3044;
  background: #0d354a;
  box-shadow: 0 16px 32px rgba(0, 7, 12, 0.42), 0 0 24px rgba(242, 154, 50, 0.15);
}

.trend-card {
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(10, 55, 77, 0.96), rgba(5, 35, 52, 0.96));
}

.distribution-card {
  color: #eaf8fd;
}
.distribution-card .card-heading h2 { color: #f3fbff; }
.distribution-card .donut-wrap {
  border-color: rgba(107, 210, 241, 0.14);
  background: radial-gradient(circle at 38% 30%, #123f55 0%, #0a2f43 58%, #062335 100%);
  box-shadow: 0 22px 42px rgba(0, 8, 14, 0.38), inset 0 0 0 8px rgba(89, 189, 224, 0.035), 0 0 26px rgba(27, 165, 207, 0.1);
}
.distribution-card .donut-label strong { color: #f4fcff; }
.distribution-card .donut-label span { color: #88a9b7; }
.distribution-card .legend {
  border-color: rgba(118, 195, 222, 0.13);
  background: rgba(7, 38, 55, 0.8);
  box-shadow: 0 14px 28px rgba(0, 8, 14, 0.28);
}
.distribution-card .legend > div { background: rgba(255, 255, 255, 0.045); }

.ranking-card,
.pipeline-card,
.attention-card { border-radius: 22px; }
.ranking-card .card-heading h2,
.pipeline-card .card-heading h2 { color: #f1fbff; }
.ranking-card .subtle,
.pipeline-card .subtle { color: #7799a8; }
.rank-row { border-bottom-color: rgba(139, 195, 215, 0.1); }
.rank-number { background: rgba(49, 166, 204, 0.13); color: #74d5f4; }
.rank-row strong { color: #dff3fa; }
.rank-row small { color: #789aa9; }
.rank-row > b { color: #b8d5e0; }
.bar { background: rgba(255, 255, 255, 0.08); }

.pipeline-card {
  background: linear-gradient(130deg, rgba(12, 53, 73, 0.92), rgba(7, 37, 54, 0.92));
}
.pipeline-step > div {
  border-color: color-mix(in srgb, var(--step-color) 28%, #173d50);
  background: linear-gradient(145deg, color-mix(in srgb, var(--step-color) 13%, #10394c), #092d41);
  box-shadow: 0 12px 24px rgba(0, 8, 14, 0.25), inset 0 1px rgba(255, 255, 255, 0.04);
}
.pipeline-step strong,
.pipeline-step span { color: #eefaff; }
.pipeline-step small { color: #86a8b6; }
.pipeline-step > b {
  border-color: #28566b;
  background: #0a3044;
  color: #9fc3d1;
  box-shadow: 0 5px 12px rgba(0, 8, 14, 0.3);
}
.pipeline-step > div::after { background: #315c70; }
.pipeline-step > div::before { border-color: #5f8da1; }

.attention-card {
  background: linear-gradient(155deg, rgba(12, 58, 80, 0.95), rgba(5, 36, 53, 0.96));
}
.attention {
  border-color: rgba(137, 205, 228, 0.1);
  background: rgba(255, 255, 255, 0.045);
}
.attention:hover { background: rgba(255, 255, 255, 0.075); }

@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .card { transition: none; }
  .stat-card:hover,
  .card:hover { transform: none; }
}
</style>

<style scoped>
.pipeline-card {
  padding: 15px 18px 17px;
}

.pipeline {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 42px;
  margin-top: 14px;
}

.pipeline-step {
  position: relative;
  width: 100%;
}

.pipeline-step > div {
  width: 100%;
  min-height: 88px;
  border: 1px solid color-mix(in srgb, var(--step-color) 22%, white);
  border-bottom: 4px solid var(--step-color);
  border-radius: 12px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--step-color) 7%, white),
    color-mix(in srgb, var(--step-color) 14%, white)
  );
  box-shadow: 0 7px 18px color-mix(in srgb, var(--step-color) 10%, transparent);
}

.pipeline-step > div::after {
  position: absolute;
  top: 50%;
  right: -31px;
  width: 18px;
  height: 2px;
  background: #bdd2dc;
  content: '';
  transform: translateY(-50%);
}

.pipeline-step > div::before {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: -32px;
  width: 7px;
  height: 7px;
  border-top: 2px solid #8cabb9;
  border-right: 2px solid #8cabb9;
  content: '';
  transform: translateY(-50%) rotate(45deg);
}

.pipeline-step:last-child > div::before,
.pipeline-step:last-child > div::after {
  display: none;
}

.pipeline-step > b {
  z-index: 3;
  top: 50%;
  right: -36px;
  min-width: 29px;
  padding: 3px 4px;
  border: 1px solid #cfe0e7;
  border-radius: 7px;
  background: #fff;
  color: #557889;
  box-shadow: 0 3px 8px rgba(22, 73, 96, 0.1);
  font-size: 0.52rem;
  line-height: 1;
  text-align: center;
  transform: translateY(-50%);
}

.pipeline-step strong {
  font-size: 1.25rem;
  line-height: 1;
}

.pipeline-step span {
  margin-top: 5px;
  font-size: 0.66rem;
}

.pipeline-step small {
  margin-top: 5px;
  font-size: 0.56rem;
}

@media (max-width: 800px) {
  .pipeline { grid-template-columns: 1fr; gap: 12px; }
  .pipeline-step > b,
  .pipeline-step > div::before,
  .pipeline-step > div::after { display: none; }
}
</style>

<style scoped>
.statistics-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.9fr;
  width: 100%;
  gap: 10px;
  margin-bottom: 10px;
}

.stat-card {
  display: grid;
  grid-template-columns: minmax(130px, 0.8fr) minmax(160px, 1.2fr);
  min-width: 0;
  min-height: 116px;
  align-items: center;
  padding: 11px 13px;
  overflow: hidden;
  border: 1px solid #d5e5ec;
  border-left: 4px solid #2fa67b;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 22px rgba(15, 62, 88, 0.07);
}

.stat-card--cost {
  border-left-color: #159bc3;
  background: linear-gradient(135deg, #fff, #edf9fc);
}

.stat-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.stat-copy > span {
  color: #647d8d;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-copy > strong {
  margin: 6px 0 5px;
  color: #0b3b58;
  font-size: 1.35rem;
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1;
}

.stat-copy small {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  color: #388d6d;
  font-size: 0.56rem;
  line-height: 1.35;
}

.stat-copy small.danger { color: #d65b50; }
.stat-copy small.warning { color: #b87522; }
.stat-visual { min-width: 0; overflow: hidden; }
.stat-visual--bars { padding: 2px 4px 0; }

.month-labels {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  margin-top: -8px;
  color: #8096a3;
  font-size: 0.48rem;
  text-align: center;
}

.stat-card--rate {
  position: relative;
  display: flex;
  min-height: 116px;
  align-items: center;
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.stat-card--rate .stat-copy {
  width: 100%;
  min-height: 88px;
  justify-content: center;
  padding: 13px 94px 13px 15px;
  border: 1px solid #efdfbe;
  border-radius: 18px 55px 55px 18px;
  background: linear-gradient(135deg, #fff, #fff6e5);
  box-shadow: 0 8px 20px rgba(122, 88, 24, 0.08);
}

.stat-card--rate .radial-visual {
  position: absolute;
  right: 0;
  width: 108px;
  height: 108px;
  overflow: hidden;
  border: 7px solid #f7fafb;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 12px 25px rgba(35, 83, 104, 0.16), 0 0 0 1px #dce8ed;
}

@media (max-width: 1100px) {
  .statistics-grid { grid-template-columns: 1fr 1fr; }
  .stat-card--rate { grid-column: 1 / -1; }
}

@media (max-width: 700px) {
  .statistics-grid { grid-template-columns: 1fr; }
  .stat-card--rate { grid-column: auto; }
  .stat-card { grid-template-columns: 1fr minmax(135px, 1fr); }
}
</style>

<style scoped>
.stat-card {
  border-color: rgba(126, 199, 225, 0.14);
  border-left: 0;
  background: linear-gradient(145deg, rgba(16, 61, 82, 0.9), rgba(8, 42, 61, 0.94));
  box-shadow: 0 18px 38px rgba(0, 8, 14, 0.3), inset 0 1px rgba(255, 255, 255, 0.04);
}
.stat-card--efficiency { box-shadow: 0 18px 38px rgba(0, 8, 14, 0.3), inset 0 3px #36b482; }
.stat-card--cost { box-shadow: 0 18px 38px rgba(0, 8, 14, 0.3), inset 0 3px #21a8d0; }
.stat-copy > span { color: #a3c0cc; }
.stat-copy > strong { color: #f2fbff; }
.stat-copy small { color: #67d5a7; }
.stat-copy small.warning { color: #ffc46d; }
.month-labels { color: #7699a8; }
.stat-card--rate { background: transparent; box-shadow: none; }
.stat-card--rate .stat-copy {
  border-color: rgba(245, 170, 67, 0.2);
  background: linear-gradient(135deg, rgba(77, 57, 29, 0.76), rgba(18, 49, 62, 0.95));
  box-shadow: 0 18px 35px rgba(0, 8, 14, 0.3);
}
.stat-card--rate .radial-visual {
  border-color: #0b3044;
  background: #0d354a;
  box-shadow: 0 16px 32px rgba(0, 7, 12, 0.42), 0 0 24px rgba(242, 154, 50, 0.15);
}
.pipeline-card {
  background: linear-gradient(130deg, rgba(12, 53, 73, 0.94), rgba(7, 37, 54, 0.96));
}
.pipeline-step > div {
  border-color: color-mix(in srgb, var(--step-color) 28%, #173d50);
  background: linear-gradient(145deg, color-mix(in srgb, var(--step-color) 13%, #10394c), #092d41);
  box-shadow: 0 12px 24px rgba(0, 8, 14, 0.28), inset 0 1px rgba(255, 255, 255, 0.04);
}
.pipeline-step strong,
.pipeline-step span { color: #eefaff; }
.pipeline-step small { color: #86a8b6; }
.pipeline-step > b {
  border-color: #28566b;
  background: #0a3044;
  color: #9fc3d1;
}
</style>

<style scoped>
.executive-dashboard {
  --navy: #092f49;
  --muted: #6f8492;
  background:
    radial-gradient(circle at 88% 2%, rgba(91, 188, 219, 0.18), transparent 24%),
    radial-gradient(circle at 4% 42%, rgba(255, 174, 93, 0.09), transparent 20%),
    linear-gradient(145deg, #eaf5f8 0%, #f7fbfc 50%, #e5f2f6 100%);
  color: #092f49;
}

.hero h1 { color: #092f49; }
.hero p,
.hero__status { color: #607c8c; }

.control-bar {
  border-color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 13px 30px rgba(18, 74, 100, 0.1);
}
.control-bar :deep(.v-field) {
  background: #eaf3f6;
  color: #123e56;
}
.control-bar :deep(.v-field__input),
.control-bar :deep(.v-icon) { color: #345d71; }
.period-switch { background: #e5eff3; }
.period-switch button { color: #6e8591; }
.period-switch button.active {
  background: #fff;
  color: #086b9f;
  box-shadow: 0 4px 12px rgba(24, 70, 95, 0.12);
}

.stat-card {
  border: 0;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16px 34px rgba(18, 74, 100, 0.12), inset 0 1px #fff;
}
.stat-card--efficiency { box-shadow: 0 16px 34px rgba(18, 74, 100, 0.12), inset 0 4px #36b482; }
.stat-card--cost {
  background: linear-gradient(145deg, #fff, #eaf8fc);
  box-shadow: 0 16px 34px rgba(18, 74, 100, 0.12), inset 0 4px #21a8d0;
}
.stat-copy > span { color: #647d8d; }
.stat-copy > strong { color: #0b3b58; }
.stat-copy small { color: #388d6d; }
.stat-copy small.warning { color: #b87522; }
.month-labels { color: #8096a3; }
.stat-card--rate { background: transparent; box-shadow: none; }
.stat-card--rate .stat-copy {
  border: 0;
  background: linear-gradient(135deg, #fff, #fff5e2);
  box-shadow: 0 16px 32px rgba(115, 82, 26, 0.12);
}
.stat-card--rate .radial-visual {
  border-color: #f6fbfc;
  background: #fff;
  box-shadow: 0 15px 30px rgba(28, 86, 111, 0.18), 0 0 24px rgba(242, 154, 50, 0.14);
}

.ranking-card {
  border: 0;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 38px rgba(16, 72, 98, 0.12);
}
.ranking-card .card-heading h2 { color: #0b3852; }
.ranking-card .subtle { color: #7a909c; }
.rank-row { border-bottom-color: #e7eff2; }
.rank-number { background: #e6f3f7; color: #27779a; }
.rank-row strong { color: #183f55; }
.rank-row small { color: #8095a0; }
.rank-row > b { color: #456b7c; }
.bar { background: #e6eef2; }

.pipeline-card {
  padding: 16px 20px 20px;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.pipeline-card:hover { box-shadow: none; transform: none; }
.pipeline-card .card-heading { padding: 0 8px; }
.pipeline-card .card-heading h2 { color: #0b3852; }
.pipeline-card .subtle { color: #7b909b; }
.pipeline {
  align-items: center;
  gap: 54px;
  padding: 8px 18px 4px;
}
.pipeline-step { align-items: center; }
.pipeline-step > div {
  width: 132px;
  height: 132px;
  min-height: 132px;
  flex: 0 0 132px;
  border: 7px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background: radial-gradient(
    circle at 34% 28%,
    color-mix(in srgb, var(--step-color) 9%, white),
    color-mix(in srgb, var(--step-color) 20%, white)
  );
  box-shadow:
    0 18px 35px color-mix(in srgb, var(--step-color) 18%, rgba(18, 74, 100, 0.12)),
    0 0 24px color-mix(in srgb, var(--step-color) 15%, transparent),
    inset 0 -7px 16px color-mix(in srgb, var(--step-color) 8%, transparent);
}
.pipeline-step strong { color: #0a3b57; font-size: 1.45rem; }
.pipeline-step span { color: #164b65; font-size: 0.68rem; }
.pipeline-step small { color: #6d8794; font-size: 0.58rem; }
.pipeline-step > div::after {
  right: -48px;
  width: 36px;
  height: 2px;
  background: linear-gradient(90deg, #9bbac7, #69a9c1);
}
.pipeline-step > div::before {
  right: -49px;
  border-color: #69a9c1;
}
.pipeline-step > b {
  top: 13px;
  right: -46px;
  border-color: #d2e4eb;
  background: rgba(255, 255, 255, 0.94);
  color: #4f7586;
  box-shadow: 0 7px 16px rgba(19, 72, 96, 0.13);
  transform: none;
}

.attention-card {
  border: 0;
  border-radius: 26px;
  background: linear-gradient(155deg, #0c3b55, #06283d);
  box-shadow: 0 22px 42px rgba(4, 35, 52, 0.25), 0 0 28px rgba(16, 132, 176, 0.08);
}

@media (max-width: 900px) {
  .pipeline { gap: 14px; padding-inline: 0; }
  .pipeline-step > div { width: 112px; height: 112px; min-height: 112px; flex-basis: 112px; }
}

@media (max-width: 800px) {
  .pipeline-step > div { width: 130px; height: 130px; min-height: 130px; flex-basis: 130px; }
}
</style>

<style scoped>
.control-bar,.stat-card,.stat-card--cost,.stat-card--rate .stat-copy,.card,.trend-card,.ranking-card,.pipeline-card,.attention-card,.distribution-card .legend{border-color:rgba(190,225,238,.13);background:#2b586a;box-shadow:0 20px 40px rgba(25,65,81,.2),inset 0 1px rgba(255,255,255,.055)}
.control-bar :deep(.v-field),.period-switch{background:rgba(218,237,244,.1)}
.control-bar :deep(.v-field__input),.control-bar :deep(.v-icon),.period-switch button{color:#c2dbe5}.period-switch button.active{background:rgba(118,190,216,.24);color:#f5fbfd}
.stat-copy>span,.card-heading .subtle,.ranking-card .subtle,.pipeline-card .subtle{color:#aac8d4}.stat-copy>strong,.card-heading h2,.ranking-card .card-heading h2,.pipeline-card .card-heading h2{color:#f4fbfe}.stat-copy small{color:#7de0b7}.stat-copy small.warning{color:#ffc778}.month-labels{color:#87aebd}
.stat-card--rate{background:transparent;box-shadow:none}.stat-card--rate .radial-visual{border-color:#376778;background:#2b586a;box-shadow:0 18px 34px rgba(23,61,76,.28),0 0 24px rgba(242,154,50,.16)}
.distribution-card{background:transparent;box-shadow:none}.distribution-card .card-heading h2,.distribution-card .donut-label strong{color:#f4fbfe}.distribution-card .donut-label span{color:#aac8d4}.distribution-card .legend>div{background:rgba(218,237,244,.07)}.distribution-card .legend span,.distribution-card .legend b{color:#ddecf2}
.rank-row{border-bottom-color:rgba(205,231,240,.1)}.rank-number{background:rgba(102,189,220,.16);color:#85daf6}.rank-row strong{color:#eaf6fa}.rank-row small{color:#95b7c4}.rank-row>b{color:#d5e8ef}.bar{background:rgba(218,237,244,.12)}
.attention{background:rgba(218,237,244,.07)}.attention:hover{background:rgba(218,237,244,.11)}
.pipeline-step>div{background:radial-gradient(circle at 33% 27%,color-mix(in srgb,var(--step-color) 20%,#477487),color-mix(in srgb,var(--step-color) 12%,#224c5d))}.pipeline-step strong,.pipeline-step span{color:#f2fbfe}.pipeline-step small{color:#a5c4d0}.pipeline-step>b{background:#3b6a7c;color:#d8eaf1}.pipeline-step>div::after{background:#6c99aa}.pipeline-step>div::before{border-color:#8ab3c2}
</style>

<style scoped>
/* Ajuste final de espacio, tipografía y flotación. */
.statistics-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  min-height: 142px;
  padding: 17px 18px;
}
.stat-card--efficiency {
  background: #477789;
  box-shadow: 0 20px 38px rgba(31, 77, 96, 0.2), inset 0 4px #62c3a0;
}
.stat-card--cost {
  background: #568697;
  box-shadow: 0 20px 38px rgba(31, 77, 96, 0.2), inset 0 4px #5bc3e3;
}
.stat-card--rate .stat-copy {
  min-height: 124px;
  background: #6594a3;
  box-shadow: 0 20px 38px rgba(31, 77, 96, 0.2), inset 0 4px #f1ad55;
}
.stat-card--rate .radial-visual {
  right: -5px;
  width: 132px;
  height: 132px;
  border-color: #759fab;
  background: #6594a3;
}
.stat-copy > span {
  color: #d9ebf1;
  font-size: 0.78rem;
  line-height: 1.3;
}
.stat-copy > strong {
  margin: 8px 0 7px;
  font-size: 1.55rem;
}
.stat-copy small {
  max-width: 190px;
  color: #c8f2df;
  font-size: 0.64rem;
  line-height: 1.45;
}
.stat-copy small.warning { color: #ffe0ad; }
.month-labels { font-size: 0.55rem; color: #d0e3ea; }

.card { padding: 19px 21px; }
.card-heading h2 { font-size: 1.05rem; }
.card-kicker { font-size: 0.64rem; }
.forecast,.subtle { font-size: 0.65rem; }
.insight { font-size: 0.7rem; line-height: 1.45; }

.legend { gap: 8px 12px; }
.legend > div { font-size: 0.72rem; }
.legend b { font-size: 0.7rem; }
.rank-row {
  grid-template-columns: 28px minmax(155px, 0.85fr) 1fr 45px;
  gap: 12px;
  padding: 10px 0;
}
.rank-number { width: 25px; height: 25px; font-size: 0.66rem; }
.rank-row strong { font-size: 0.76rem; }
.rank-row small { margin-top: 3px; font-size: 0.62rem; }
.rank-row > b { font-size: 0.72rem; }
.bar { height: 8px; }

.attention { grid-template-columns: 36px minmax(0, 1fr) max-content; min-height: 58px; padding: 11px; }
.attention > i { width: 33px; height: 33px; }
.attention strong { font-size: 0.74rem; }
.attention small { font-size: 0.62rem; white-space: normal; }
.attention button { font-size: 0.64rem; }
.all-link { font-size: 0.67rem; }

.pipeline-card,
.pipeline-card:hover {
  padding: 18px 12px 24px;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.pipeline-card .card-heading { padding: 0 14px; }
.pipeline-card .card-heading h2 { color: #17485e; }
.pipeline-card .card-kicker { color: #e8772f; }
.pipeline-card .subtle { color: #678390; }
.pipeline {
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  justify-items: center;
  gap: 58px;
  padding: 18px 20px 8px;
}
.pipeline-step { width: 100%; }
.pipeline-step > div {
  width: 148px;
  height: 148px;
  min-height: 148px;
  flex-basis: 148px;
  border: 0;
  background: radial-gradient(
    circle at 32% 25%,
    color-mix(in srgb, var(--step-color) 20%, #527f91),
    color-mix(in srgb, var(--step-color) 8%, #285769)
  );
  box-shadow:
    0 24px 38px rgba(30, 75, 93, 0.25),
    0 0 38px color-mix(in srgb, var(--step-color) 35%, transparent),
    0 0 70px color-mix(in srgb, var(--step-color) 16%, transparent),
    inset 0 2px rgba(255, 255, 255, 0.18),
    inset 0 -10px 22px rgba(7, 38, 51, 0.16);
}
.pipeline-step strong { font-size: 1.65rem; }
.pipeline-step span { margin-top: 7px; font-size: 0.76rem; }
.pipeline-step small { margin-top: 7px; font-size: 0.66rem; }
.pipeline-step > div::after { right: -53px; width: 42px; }
.pipeline-step > div::before { right: -54px; }
.pipeline-step > b {
  top: 8px;
  right: -49px;
  min-width: 36px;
  padding: 5px 7px;
  font-size: 0.62rem;
}

@media (max-width: 1100px) {
  .statistics-grid { grid-template-columns: 1fr 1fr; }
  .stat-card--rate { grid-column: 1 / -1; }
  .pipeline { grid-template-columns: repeat(2, 1fr); gap: 22px; }
  .pipeline-step > b,.pipeline-step > div::before,.pipeline-step > div::after { display: none; }
}
@media (max-width: 700px) {
  .statistics-grid { grid-template-columns: 1fr; }
  .stat-card--rate { grid-column: auto; }
  .pipeline { grid-template-columns: 1fr; }
}
</style>

<style scoped>
.executive-dashboard{background:radial-gradient(circle at 90% -8%,#d8edf5 0,transparent 28%),#edf6f9!important;color:#0a3857!important}
.control-bar{border:1px solid #d9e7ed!important;background:rgba(255,255,255,.9)!important;box-shadow:0 7px 22px rgba(15,63,88,.07)!important}.control-bar :deep(.v-field),.period-switch{background:#edf4f6!important}.control-bar :deep(.v-field__input),.control-bar :deep(.v-icon),.period-switch button{color:#567282!important}.period-switch button.active{background:#fff!important;color:#086b9f!important}
.stat-card,.stat-card--efficiency,.stat-card--cost{border:1px solid #d6e5ec!important;border-left:4px solid #2fa67b!important;background:rgba(255,255,255,.96)!important;box-shadow:0 8px 22px rgba(15,62,88,.07)!important}.stat-card--cost{border-left-color:#159bc3!important;background:linear-gradient(135deg,#fff,#eef9fc)!important}.stat-copy>span{color:#647d8d!important}.stat-copy>strong{color:#0b3b58!important}.stat-copy small{color:#388d6d!important}.stat-copy small.warning{color:#b87522!important}.month-labels{color:#8096a3!important}
.stat-card--rate{background:transparent!important;box-shadow:none!important}.stat-card--rate .stat-copy{background:linear-gradient(135deg,#fff,#fff6e5)!important;box-shadow:0 8px 20px rgba(122,88,24,.08)!important}.stat-card--rate .radial-visual{border-color:#f7fafb!important;background:#fff!important;box-shadow:0 12px 25px rgba(35,83,104,.16),0 0 0 1px #dce8ed!important}
.card,.trend-card,.ranking-card,.attention-card,.pipeline-card,.distribution-card{border:1px solid #dbe8ee!important;background:rgba(255,255,255,.96)!important;box-shadow:0 8px 24px rgba(15,62,88,.07)!important;color:#0a3857!important}.card:hover{transform:none!important;box-shadow:0 8px 24px rgba(15,62,88,.07)!important}.card-heading h2,.trend-card .card-heading h2,.distribution-card .card-heading h2,.ranking-card .card-heading h2,.attention-card .card-heading h2,.pipeline-card .card-heading h2{color:#0b416c!important}.card-kicker,.trend-card .card-kicker,.attention-card .card-kicker,.pipeline-card .card-kicker{color:#ec7628!important}.subtle{color:#82939d!important}.forecast{background:#e7f5ed!important;color:#31805f!important}.insight{background:#eef7fb!important;color:#527486!important}
.distribution-card .donut-wrap{background:transparent!important;box-shadow:none!important}.distribution-card .donut-label strong{color:#0b416c!important}.distribution-card .donut-label span{color:#81929c!important}.distribution-card .legend{border:0!important;background:transparent!important;box-shadow:none!important}.distribution-card .legend>div{background:transparent!important}.distribution-card .legend span,.distribution-card .legend b{color:#24495d!important}
.rank-row{border-bottom-color:#e9f0f3!important}.rank-number{background:#e7f3f7!important;color:#39718e!important}.rank-row strong,.attention strong{color:#173f55!important}.rank-row small,.attention small{color:#81919a!important}.rank-row>b{color:#456b7c!important}.bar{background:#e8eff2!important}.attention{background:#f4f8fa!important}.attention button,.all-link{color:#0b73aa!important}
.pipeline{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:38px!important;padding:10px 0 0!important}.pipeline-step>div{width:100%!important;height:auto!important;min-height:84px!important;flex-basis:auto!important;border:1px solid color-mix(in srgb,var(--step-color) 20%,white)!important;border-bottom:4px solid var(--step-color)!important;border-radius:11px!important;background:color-mix(in srgb,var(--step-color) 11%,white)!important;box-shadow:none!important}.pipeline-step strong{color:#0a3b57!important}.pipeline-step span{color:#164b65!important}.pipeline-step small{color:#6d8794!important}.pipeline-step>b{background:#fff!important;color:#557889!important}
@media(max-width:1100px){.pipeline{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:700px){.pipeline{grid-template-columns:1fr!important}}
</style>

<style scoped>
.control-bar {
  padding: 10px 14px !important;
  border: 0 !important;
  border-radius: 22px !important;
  background: #285a6d !important;
  box-shadow: 0 12px 25px rgba(28, 73, 91, 0.18) !important;
}
.control-bar :deep(.v-field) {
  min-height: 42px;
  border: 0 !important;
  border-radius: 11px !important;
  background: #3e7183 !important;
  color: #d9eaf0 !important;
}
.control-bar :deep(.v-field__input),
.control-bar :deep(.v-icon) { color: #d4e5eb !important; }
.period-switch {
  min-height: 42px;
  align-items: center;
  padding: 4px !important;
  border-radius: 11px !important;
  background: #3e7183 !important;
}
.period-switch button {
  min-height: 34px;
  padding-inline: 17px;
  color: #cfe0e7 !important;
}
.period-switch button.active {
  background: #56889b !important;
  color: #fff !important;
  box-shadow: 0 3px 8px rgba(16, 56, 73, 0.18) !important;
}
.export-button {
  min-height: 42px;
  padding-inline: 20px;
  border-radius: 99px;
  background: #0879aa !important;
  box-shadow: 0 7px 16px rgba(7, 91, 128, 0.22) !important;
}
</style>

<style scoped>
.ranking-card {
  padding: 19px 21px !important;
  border-top: 4px solid #1684bc !important;
}
.ranking-heading { align-items: center; padding-bottom: 12px; border-bottom: 1px solid #e3edf1; }
.ranking-summary { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.ranking-summary span {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 99px;
  background: #f1f6f8;
  color: #637e8d;
  font-size: .57rem;
  font-weight: 700;
}
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #48a97c; }
.status-dot--watch { background: #eead2d; }
.status-dot--critical { background: #df6257; }
.ranking-list { margin-top: 4px; }
.rank-row {
  grid-template-columns: 27px minmax(130px,.75fr) minmax(190px,1.25fr) 44px 68px !important;
  min-height: 58px;
  gap: 11px !important;
  padding: 9px 0 !important;
}
.rank-house { display: flex; min-width: 0; flex-direction: column; }
.rank-house strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.budget-meter { display: grid; min-width: 0; gap: 5px; }
.budget-meter small { color: #7c919d !important; font-size: .55rem !important; text-align: right; }
.budget-meter small b { color: #456b7c; }
.rank-percent { color: #174b66 !important; font-size: .78rem !important; text-align: right; }
.health-badge {
  justify-self: end;
  min-width: 62px;
  padding: 5px 7px;
  border-radius: 7px;
  background: #e6f5ed;
  color: #37805f;
  font-size: .55rem;
  font-weight: 800;
  text-align: center;
}
.health-badge--watch { background: #fff2d8; color: #aa6b16; }
.health-badge--critical { background: #fde9e7; color: #bd4d45; }
.bar i.critical { background: linear-gradient(90deg,#f0a529,#df6257) !important; }
@media(max-width:800px){
  .ranking-heading{align-items:flex-start;flex-direction:column}.ranking-summary{justify-content:flex-start}
  .rank-row{grid-template-columns:27px 1fr 44px 68px!important}.budget-meter{grid-column:2/5}.rank-percent{grid-column:3;grid-row:1}.health-badge{grid-column:4;grid-row:1}
}
</style>

<style scoped>
/* Contraste consistente y flotación selectiva. */
.executive-dashboard { color: #103b53 !important; }
.hero h1 { color: #082f49 !important; }
.hero p { color: #4d6c7c !important; }
.eyebrow,.card-kicker { color: #d96519 !important; }
.card-heading h2 { color: #083b5e !important; }
.subtle { color: #526f7e !important; }

.stat-copy>span { color: #466878 !important; }
.stat-copy>strong { color: #082f49 !important; }
.stat-copy small { color: #287258 !important; }
.stat-copy small.warning { color: #955b0f !important; }
.month-labels { color: #587684 !important; font-weight: 650; }

.stat-card {
  box-shadow: 0 12px 27px rgba(17,65,87,.11),0 2px 6px rgba(17,65,87,.05) !important;
}
.stat-card--rate .radial-visual {
  transform: translateX(7px);
  box-shadow: 0 16px 30px rgba(24,73,94,.2),0 0 0 1px #d1e1e7 !important;
}

.distribution-card .donut-wrap {
  transform: translateY(-2px);
  filter: drop-shadow(0 14px 13px rgba(26,74,95,.14));
}
.distribution-card .donut-label strong { color: #082f49 !important; }
.distribution-card .donut-label span { color: #4d6c7c !important; }
.distribution-card .legend>div {
  padding: 7px 8px;
  border: 1px solid #dce9ee;
  border-radius: 9px;
  background: #f5f9fa !important;
  box-shadow: 0 5px 11px rgba(23,69,89,.06);
}
.distribution-card .legend span,.distribution-card .legend b { color: #24495d !important; }

.ranking-summary span {
  border: 1px solid #d8e7ed;
  background: #f7fafb;
  color: #3e6172;
  box-shadow: 0 6px 13px rgba(21,67,87,.07);
}
.ranking-list { display: grid; gap: 7px; padding-top: 7px; }
.rank-row {
  padding: 10px 10px !important;
  border: 1px solid #e0ebef !important;
  border-radius: 11px;
  background: #f8fbfc;
  box-shadow: 0 6px 14px rgba(20,67,87,.055);
  transition: transform .16s ease,box-shadow .16s ease;
}
.rank-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(20,67,87,.1);
}
.rank-house strong { color: #123c52 !important; }
.rank-house small,.budget-meter small { color: #526f7e !important; }
.budget-meter small b { color: #264f63 !important; }
.rank-percent { color: #0a4969 !important; }
.health-badge--stable { color: #246c50; }
.health-badge--watch { color: #8d560c; }
.health-badge--critical { color: #a83e38; }

.attention {
  border-color: #dbe8ed !important;
  background: #f7fafb !important;
  box-shadow: 0 6px 14px rgba(20,67,87,.055);
}
.attention strong { color: #123c52 !important; }
.attention small { color: #536f7d !important; }
.attention button,.all-link { color: #075f91 !important; }

.pipeline-step>div {
  box-shadow: 0 9px 18px rgba(24,72,92,.1) !important;
  transition: transform .16s ease,box-shadow .16s ease;
}
.pipeline-step>div:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 14px 25px rgba(24,72,92,.15) !important;
}
.pipeline-step strong { color: #083b58 !important; }
.pipeline-step span { color: #174a62 !important; }
.pipeline-step small { color: #536f7d !important; }
.insight { color: #365f72 !important; }

@media(prefers-reduced-motion:reduce){.rank-row,.pipeline-step>div{transition:none}.rank-row:hover,.pipeline-step>div:hover{transform:none!important}}
</style>

<style scoped>
.control-bar {
  background: #0b5b87 !important;
  box-shadow: 0 12px 25px rgba(7, 65, 98, 0.22) !important;
}
.control-bar :deep(.v-field),
.period-switch {
  background: #216f97 !important;
}
.control-bar :deep(.v-field__input),
.control-bar :deep(.v-icon),
.period-switch button {
  color: #e3f1f7 !important;
}
.period-switch button.active {
  background: #3b85a8 !important;
  color: #fff !important;
}
.export-button {
  background: #0876a8 !important;
  border: 1px solid rgba(255,255,255,.12) !important;
}
</style>

<style scoped>
.pipeline-card { padding: 19px 22px 15px !important; }
.money-heading { align-items: center; }
.money-result-strip {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 9px;
  margin: 14px 0 4px;
}
.money-result-strip>div {
  position: relative;
  overflow: hidden;
  padding: 10px 12px;
  border: 1px solid #dce9ee;
  border-radius: 11px;
  background: #f5f9fa;
}
.money-result-strip>div::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #1689b8;
  content: '';
}
.money-result-strip>div:nth-child(2)::before { background:#f09a2e; }
.money-result-strip>div:nth-child(3)::before { background:#4ea47c; }
.money-result-strip>div:nth-child(4)::before { background:#8197a2; }
.money-result-strip>div.result-risk::before { background:#dc5d54; }
.money-result-strip span { display:block;color:#5d7886;font-size:.59rem;font-weight:700; }
.money-result-strip strong { display:block;margin-top:4px;color:#103d55;font-size:.9rem; }
.money-result-strip .result-risk strong { color:#b74740; }
@media(max-width:800px){.money-result-strip{grid-template-columns:1fr 1fr}}
</style>

<style scoped>
.stat-card--efficiency {
  grid-template-columns: minmax(210px,.85fr) minmax(280px,1.15fr) !important;
  align-items: center;
  gap: 18px;
  min-height: 150px;
}
.stat-card--efficiency .stat-copy { align-self: center; }
.stat-card--efficiency .stat-copy>span { font-size: .76rem; }
.stat-card--efficiency .stat-copy>strong { margin: 9px 0 8px; font-size: 1.65rem; }
.stat-card--efficiency .stat-copy small {
  max-width: 205px;
  align-items: flex-start;
  font-size: .62rem;
  line-height: 1.5;
}
.stat-card--efficiency .stat-visual--bars {
  display: grid;
  min-width: 0;
  grid-template-rows: 86px 18px;
  align-self: center;
  padding: 0 3px;
}
.stat-card--efficiency .stat-visual--bars :deep(.apexcharts-canvas),
.stat-card--efficiency .stat-visual--bars :deep(.apexcharts-svg) {
  overflow: hidden !important;
}
.month-labels {
  display: flex !important;
  width: 100%;
  align-items: center;
  margin-top: 0 !important;
  color: #587684 !important;
  font-size: .52rem !important;
  font-weight: 700;
  line-height: 1;
}
.month-labels>span {
  min-width: 0;
  flex: 1 1 0;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media(max-width:1250px){.stat-card--efficiency{grid-template-columns:1fr!important;gap:7px}.stat-card--efficiency .stat-copy small{max-width:none}.stat-card--efficiency .stat-visual--bars{width:100%}}
</style>

<style scoped>
.stat-card--rate {
  position: relative;
  min-height: 138px;
  padding: 0 58px 0 0 !important;
  overflow: visible !important;
  border: 0 !important;
  border-left: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.stat-card--rate .stat-copy {
  width: 100%;
  min-height: 118px;
  justify-content: center;
  padding: 18px 112px 18px 22px;
  border: 0 !important;
  border-radius: 24px 72px 72px 24px;
  background: linear-gradient(115deg,#fff 0%,#fffaf1 72%,#f8edda 100%) !important;
  box-shadow: 0 17px 34px rgba(30,76,96,.15),0 4px 10px rgba(30,76,96,.07) !important;
}
.stat-card--rate .stat-copy>span { color:#416575 !important;font-size:.78rem;font-weight:750; }
.stat-card--rate .stat-copy>strong { color:#082f49 !important;font-size:1.62rem; }
.stat-card--rate .stat-copy small { color:#9a5d0d !important;font-size:.64rem; }
.stat-card--rate .radial-visual {
  position: absolute;
  z-index: 2;
  right: -2px;
  width: 134px;
  height: 134px;
  overflow: hidden;
  border: 8px solid #f3f8fa !important;
  border-radius: 50%;
  background: #fff !important;
  box-shadow: 0 19px 36px rgba(28,75,95,.21),0 0 0 1px #cbdde5,0 0 22px rgba(242,154,50,.1) !important;
  transform: none;
}
@media(max-width:700px){.stat-card--rate{padding-right:38px!important}.stat-card--rate .stat-copy{padding-right:95px}.stat-card--rate .radial-visual{width:118px;height:118px}}
</style>

<style scoped>
.trend-card .card-heading h2 {
  color: #083b5e !important;
  font-size: 1.12rem;
  font-weight: 760;
  letter-spacing: -.018em;
}
.trend-card .card-kicker {
  color: #d96519 !important;
  font-size: .66rem;
  font-weight: 850;
  letter-spacing: .14em;
}
.trend-card .forecast {
  padding: 7px 11px;
  border: 1px solid #cce9dc;
  background: #e8f6ef !important;
  color: #277457 !important;
  font-size: .68rem;
  font-weight: 800;
}
.trend-card :deep(.apexcharts-legend-text) {
  color: #365d70 !important;
  font-family: "Segoe UI Variable","Segoe UI",Arial,sans-serif !important;
}
.trend-card :deep(.apexcharts-xaxis-label),
.trend-card :deep(.apexcharts-yaxis-label) {
  fill: #547383 !important;
  font-family: "Segoe UI Variable","Segoe UI",Arial,sans-serif !important;
}
.trend-card .insight {
  padding: 11px 13px;
  border-radius: 11px;
  background: #eaf4f8 !important;
  color: #365f72 !important;
  font-size: .72rem;
  line-height: 1.45;
}
.trend-card .insight b { color:#234e62; }
</style>

<style scoped>
.stat-card--efficiency {
  grid-template-columns: minmax(185px,.9fr) minmax(170px,1.1fr) !important;
  gap: 12px;
  overflow: hidden !important;
}
.stat-card--efficiency .stat-copy small { max-width: 215px; }
.stat-card--efficiency .stat-visual--bars {
  width: 100%;
  min-width: 0;
  padding-inline: 2px;
  overflow: hidden;
}
.stat-card--efficiency .stat-visual--bars :deep(.apexcharts-canvas),
.stat-card--efficiency .stat-visual--bars :deep(.apexcharts-svg) {
  width: 100% !important;
  max-width: 100% !important;
}
@media(max-width:1250px){.stat-card--efficiency{grid-template-columns:1fr!important}.stat-card--efficiency .stat-visual--bars{min-height:100px}}
</style>

<style scoped>
/* Regla final: la sección de proveedores no tiene superficie exterior. */
.ranking-card,
.ranking-card:hover,
.ranking-card:focus,
.ranking-card:focus-within {
  padding: 8px 2px 12px !important;
  border: 0 !important;
  border-top: 0 !important;
  border-radius: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transform: none !important;
}
.ranking-card::before,
.ranking-card::after {
  display: none !important;
  content: none !important;
}
.ranking-heading {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
</style>
