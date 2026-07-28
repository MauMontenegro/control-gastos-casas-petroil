import type {
  AttentionItem,
  BranchBudget,
  DashboardKpis,
  ServiceSpend,
  SpendTrendPoint,
} from '~/types'

// Portado de legacy-prototype/index.html (vistas #inicio y #reportes).
const mockKpis: DashboardKpis = {
  payableThisWeek: 184620,
  obligationsCount: 18,
  upcomingDueCount: 7,
  overdueCount: 2,
  availableBudget: 426300,
  availableBudgetPct: 68,
}

const mockAttentionItems: AttentionItem[] = [
  {
    id: 'ATT-1',
    title: 'CFE · Chihuahua',
    description: 'Vence en 3 días · $42,650',
    tag: 'Crítica',
    severity: 'critical',
    actionLabel: 'Preparar pago',
  },
  {
    id: 'ATT-2',
    title: 'Internet · Juárez',
    description: 'Aumentó 22% contra el promedio',
    tag: 'Variación',
    severity: 'warning',
    actionLabel: 'Revisar importe',
  },
  {
    id: 'ATT-3',
    title: 'Limpieza · Delicias',
    description: 'Comprobante rechazado por el gerente',
    tag: 'Corrección',
    severity: 'info',
    actionLabel: 'Corregir archivo',
  },
  {
    id: 'ATT-4',
    title: '4 pagos listos',
    description: 'Total: $76,430',
    tag: 'Listo',
    severity: 'success',
    actionLabel: 'Generar solicitud',
  },
]

const mockServiceSpend: ServiceSpend[] = [
  { service: 'CFE', amount: 395000, percentage: 44 },
  { service: 'Limpieza', amount: 243000, percentage: 27 },
  { service: 'Internet', amount: 162000, percentage: 18 },
  { service: 'Agua', amount: 99000, percentage: 11 },
]

const mockBranchBudget: BranchBudget[] = [
  { branch: 'Chihuahua', spent: 142000, budget: 165000, percentage: 86 },
  { branch: 'Juárez', spent: 136000, budget: 148000, percentage: 92 },
  { branch: 'Parral', spent: 89000, budget: 119000, percentage: 75 },
  { branch: 'Delicias', spent: 77000, budget: 112000, percentage: 69 },
]

const mockSpendTrend: SpendTrendPoint[] = [
  { month: 'Ene', actual: 620000, planned: 580000 },
  { month: 'Feb', actual: 705000, planned: 660000 },
  { month: 'Mar', actual: 690000, planned: 720000 },
  { month: 'Abr', actual: 810000, planned: 790000 },
  { month: 'May', actual: 780000, planned: 850000 },
  { month: 'Jun', actual: 905000, planned: 910000 },
  { month: 'Jul', actual: 898700, planned: 960000 },
]

export function useDashboardRepository() {
  // TODO: reemplazar cada función por useHttpClient().request(...) cuando exista el backend.
  async function getKpis(): Promise<DashboardKpis> {
    return structuredClone(mockKpis)
  }

  async function getAttentionItems(): Promise<AttentionItem[]> {
    return structuredClone(mockAttentionItems)
  }

  async function getServiceSpend(): Promise<ServiceSpend[]> {
    return structuredClone(mockServiceSpend)
  }

  async function getBranchBudget(): Promise<BranchBudget[]> {
    return structuredClone(mockBranchBudget)
  }

  async function getSpendTrend(): Promise<SpendTrendPoint[]> {
    return structuredClone(mockSpendTrend)
  }

  return { getKpis, getAttentionItems, getServiceSpend, getBranchBudget, getSpendTrend }
}
