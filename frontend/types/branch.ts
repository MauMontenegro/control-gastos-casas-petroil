export interface Branch {
  id: string
  name: string
  region: string
  costCenter: string
  servicesCount: number
  budget: number
  spent: number
  ownerName: string
  status: 'activa' | 'inactiva'
}
