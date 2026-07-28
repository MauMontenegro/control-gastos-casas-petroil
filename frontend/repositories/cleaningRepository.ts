import type { CleaningWeek } from '~/types'

// Portado de legacy-prototype/app.js (week + day-check por defecto Lun-Vie activos).
const mockCleaningWeek: CleaningWeek = {
  branchId: 'BR-CHIH',
  weekLabel: '20–26 julio',
  dailyRate: 650,
  extraDays: 0,
  discount: 0,
  days: [
    { label: 'Lun', date: '20', active: true },
    { label: 'Mar', date: '21', active: true },
    { label: 'Mié', date: '22', active: true },
    { label: 'Jue', date: '23', active: true },
    { label: 'Vie', date: '24', active: true },
    { label: 'Sáb', date: '25', active: false },
    { label: 'Dom', date: '26', active: false },
  ],
}

export function useCleaningRepository() {
  // TODO: reemplazar por useHttpClient().request<CleaningWeek>(`/cleaning/${branchId}/current-week`) cuando exista el backend.
  async function getCurrentWeek(): Promise<CleaningWeek> {
    return structuredClone(mockCleaningWeek)
  }

  return { getCurrentWeek }
}
