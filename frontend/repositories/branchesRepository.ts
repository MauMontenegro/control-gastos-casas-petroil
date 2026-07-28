import type { Branch } from '~/types'

// Portado de legacy-prototype/index.html (branch-grid + budget-bars del dashboard).
const mockBranches: Branch[] = [
  {
    id: 'BR-CHIH',
    name: 'Sucursal Chihuahua',
    region: 'Región Norte',
    costCenter: 'CC-104',
    servicesCount: 8,
    budget: 165000,
    spent: 142000,
    ownerName: 'Laura M.',
    status: 'activa',
  },
  {
    id: 'BR-JRZ',
    name: 'Sucursal Juárez',
    region: 'Región Norte',
    costCenter: 'CC-105',
    servicesCount: 7,
    budget: 148000,
    spent: 136000,
    ownerName: 'Daniel R.',
    status: 'activa',
  },
  {
    id: 'BR-PAR',
    name: 'Sucursal Parral',
    region: 'Región Centro',
    costCenter: 'CC-109',
    servicesCount: 6,
    budget: 119000,
    spent: 89000,
    ownerName: 'María T.',
    status: 'activa',
  },
  {
    id: 'BR-DEL',
    name: 'Sucursal Delicias',
    region: 'Región Centro',
    costCenter: 'CC-110',
    servicesCount: 5,
    budget: 112000,
    spent: 77000,
    ownerName: 'Por asignar',
    status: 'activa',
  },
]

export function useBranchesRepository() {
  // TODO: reemplazar por useHttpClient().request<Branch[]>('/branches') cuando exista el backend.
  async function getBranches(): Promise<Branch[]> {
    return structuredClone(mockBranches)
  }

  return { getBranches }
}
