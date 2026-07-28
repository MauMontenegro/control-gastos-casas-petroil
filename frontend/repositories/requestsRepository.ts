import type { CreateFundRequestPayload, FundRequest } from '~/types'

// Portado de legacy-prototype/index.html (tabla #requestsTable).
const mockRequests: FundRequest[] = [
  {
    id: 'REQ-0185',
    folio: 'SF-2026-0185',
    requiredDate: '21 jul 2026',
    concept: 'Limpieza semanal',
    branch: '6 sucursales',
    total: 31200,
    status: 'en-revision',
  },
  {
    id: 'REQ-0184',
    folio: 'SF-2026-0184',
    requiredDate: '20 jul 2026',
    concept: 'Servicios de la semana',
    branch: 'Chihuahua, Juárez',
    total: 76430,
    status: 'en-revision',
  },
  {
    id: 'REQ-0183',
    folio: 'SF-2026-0183',
    requiredDate: '18 jul 2026',
    concept: 'Servicios recurrentes',
    branch: '6 sucursales',
    total: 128640,
    status: 'autorizada',
  },
  {
    id: 'REQ-0182',
    folio: 'SF-2026-0182',
    requiredDate: '17 jul 2026',
    concept: 'Servicios de Parral',
    branch: 'Parral',
    total: 19820,
    status: 'correccion',
  },
]

function nextFolio(): { id: string; folio: string } {
  const nextNumber =
    mockRequests.reduce((max, r) => {
      const n = Number(r.folio.split('-').pop())
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, 0) + 1
  const suffix = String(nextNumber).padStart(4, '0')
  return { id: `REQ-${suffix}`, folio: `SF-${new Date().getFullYear()}-${suffix}` }
}

function formatRequiredDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day))
    .replace('.', '')
}

export function useRequestsRepository() {
  // TODO: reemplazar por useHttpClient().request<FundRequest[]>('/fund-requests') cuando exista el backend.
  async function getRequests(): Promise<FundRequest[]> {
    return structuredClone(mockRequests)
  }

  // TODO: reemplazar por useHttpClient().request<FundRequest>('/fund-requests', { method: 'POST', body: payload }).
  async function createRequest(payload: CreateFundRequestPayload): Promise<FundRequest> {
    const { id, folio } = nextFolio()
    const created: FundRequest = {
      id,
      folio,
      requiredDate: formatRequiredDate(payload.requiredDate),
      concept: payload.concept,
      branch: payload.branch,
      total: payload.amount,
      status: 'en-revision',
      expenseType: payload.expenseType,
      costCenter: payload.costCenter,
      provider: payload.provider,
      comment: payload.comment,
    }
    mockRequests.unshift(created)
    return structuredClone(created)
  }

  return { getRequests, createRequest }
}
