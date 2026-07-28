export interface CleaningDay {
  label: string
  date: string
  active: boolean
}

export interface CleaningWeek {
  branchId: string
  weekLabel: string
  dailyRate: number
  days: CleaningDay[]
  extraDays: number
  discount: number
}
