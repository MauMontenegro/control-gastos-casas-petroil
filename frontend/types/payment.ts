export type PaymentStatus = 'listo' | 'variacion' | 'falta-recibo' | 'pagado'

export interface Payment {
  id: string
  requestFolio: string | null
  service: string
  branch: string
  dueDate: string
  amount: number
  variationPct: number
  status: PaymentStatus
}

export interface CreatePaymentPayload {
  approvedRequestFolio: string
  service: string
  branch: string
  amount: number
  paymentDate: string
  concept?: string
}
