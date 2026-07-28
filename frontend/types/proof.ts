export type ProofStatus = 'completo' | 'pendiente'

export interface Proof {
  id: string
  requestFolio: string
  service: string
  branch: string
  paymentDate: string
  amount: number
  status: ProofStatus
}
