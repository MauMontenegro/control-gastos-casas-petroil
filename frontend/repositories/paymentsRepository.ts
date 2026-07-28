import type { CreatePaymentPayload, Payment } from '~/types'

// Portado de legacy-prototype/app.js (const payments).
const mockPayments: Payment[] = [
  {
    id: 'PAY-0001',
    requestFolio: 'SF-2026-0183',
    service: 'CFE',
    branch: 'Chihuahua',
    dueDate: '22 jul 2026',
    amount: 42650,
    variationPct: 8,
    status: 'listo',
  },
  {
    id: 'PAY-0002',
    requestFolio: 'SF-2026-0183',
    service: 'Internet',
    branch: 'Juárez',
    dueDate: '21 jul 2026',
    amount: 8920,
    variationPct: 22,
    status: 'variacion',
  },
  {
    id: 'PAY-0003',
    requestFolio: 'SF-2026-0183',
    service: 'Agua',
    branch: 'Parral',
    dueDate: '23 jul 2026',
    amount: 5480,
    variationPct: -2,
    status: 'listo',
  },
  {
    id: 'PAY-0004',
    requestFolio: 'SF-2026-0183',
    service: 'Limpieza',
    branch: 'Delicias',
    dueDate: '25 jul 2026',
    amount: 19380,
    variationPct: 4,
    status: 'listo',
  },
  {
    id: 'PAY-0005',
    requestFolio: 'SF-2026-0181',
    service: 'Internet',
    branch: 'Chihuahua',
    dueDate: '27 jul 2026',
    amount: 6240,
    variationPct: 1,
    status: 'falta-recibo',
  },
  {
    id: 'PAY-0006',
    requestFolio: 'SF-2026-0180',
    service: 'CFE',
    branch: 'Parral',
    dueDate: '29 jul 2026',
    amount: 33860,
    variationPct: 12,
    status: 'variacion',
  },
]

export function usePaymentsRepository() {
  // TODO: reemplazar por useHttpClient().request<Payment[]>('/payments') cuando exista el backend.
  async function getPayments(): Promise<Payment[]> {
    return structuredClone(mockPayments)
  }

  async function createPayment(payload: CreatePaymentPayload): Promise<Payment> {
    const created: Payment = {
      id: `PAY-${Math.floor(Math.random() * 9000 + 1000)}`,
      requestFolio: payload.approvedRequestFolio,
      service: payload.service,
      branch: payload.branch,
      dueDate: payload.paymentDate,
      amount: payload.amount,
      variationPct: 0,
      status: 'pagado',
    }
    mockPayments.unshift(created)
    return created
  }

  return { getPayments, createPayment }
}
