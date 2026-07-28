import type { FundRequest } from '~/types'

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

export function useRequestsRepository() {
  // TODO: reemplazar por useHttpClient().request<FundRequest[]>('/fund-requests') cuando exista el backend.
  async function getRequests(): Promise<FundRequest[]> {
    return structuredClone(mockRequests)
  }

  return { getRequests }
}
