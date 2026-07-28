import { useDashboardRepository } from '~/repositories/dashboardRepository'
import type {
  AttentionItem,
  BranchBudget,
  DashboardKpis,
  ServiceSpend,
  SpendTrendPoint,
} from '~/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const kpis = ref<DashboardKpis | null>(null)
  const attentionItems = ref<AttentionItem[]>([])
  const serviceSpend = ref<ServiceSpend[]>([])
  const branchBudget = ref<BranchBudget[]>([])
  const spendTrend = ref<SpendTrendPoint[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOverview() {
    loading.value = true
    error.value = null
    try {
      const repo = useDashboardRepository()
      const [kpisRes, attentionRes, serviceSpendRes, branchBudgetRes, spendTrendRes] =
        await Promise.all([
          repo.getKpis(),
          repo.getAttentionItems(),
          repo.getServiceSpend(),
          repo.getBranchBudget(),
          repo.getSpendTrend(),
        ])
      kpis.value = kpisRes
      attentionItems.value = attentionRes
      serviceSpend.value = serviceSpendRes
      branchBudget.value = branchBudgetRes
      spendTrend.value = spendTrendRes
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar el dashboard'
    } finally {
      loading.value = false
    }
  }

  return {
    kpis,
    attentionItems,
    serviceSpend,
    branchBudget,
    spendTrend,
    loading,
    error,
    fetchOverview,
  }
})
