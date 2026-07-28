export interface DashboardKpis {
  payableThisWeek: number
  obligationsCount: number
  upcomingDueCount: number
  overdueCount: number
  availableBudget: number
  availableBudgetPct: number
}

export type AttentionSeverity = 'critical' | 'warning' | 'info' | 'success'

export interface AttentionItem {
  id: string
  title: string
  description: string
  tag: string
  severity: AttentionSeverity
  actionLabel: string
}

export interface ServiceSpend {
  service: string
  amount: number
  percentage: number
}

export interface BranchBudget {
  branch: string
  spent: number
  budget: number
  percentage: number
}

export interface SpendTrendPoint {
  month: string
  actual: number
  planned: number
}
