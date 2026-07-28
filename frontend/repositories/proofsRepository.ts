import type { Proof } from '~/types'

// Portado de legacy-prototype/index.html (tabla #proofTable).
const mockProofs: Proof[] = [
  {
    id: 'PRF-0001',
    requestFolio: 'SF-2026-0183',
    service: 'CFE',
    branch: 'Chihuahua',
    paymentDate: '22 jul 2026',
    amount: 42650,
    status: 'completo',
  },
  {
    id: 'PRF-0002',
    requestFolio: 'SF-2026-0183',
    service: 'Internet',
    branch: 'Juárez',
    paymentDate: '21 jul 2026',
    amount: 8920,
    status: 'pendiente',
  },
  {
    id: 'PRF-0003',
    requestFolio: 'SF-2026-0181',
    service: 'Agua',
    branch: 'Parral',
    paymentDate: '20 jul 2026',
    amount: 5480,
    status: 'completo',
  },
]

export function useProofsRepository() {
  // TODO: reemplazar por useHttpClient().request<Proof[]>('/proofs') cuando exista el backend.
  async function getProofs(): Promise<Proof[]> {
    return structuredClone(mockProofs)
  }

  return { getProofs }
}
