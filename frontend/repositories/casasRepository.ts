import type { Casa, CasaContactoPayload } from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

export function useCasasRepository() {
  async function getCasas(): Promise<Casa[]> {
    return useHttpClient().request<Casa[]>('/casas')
  }

  async function updateCasaContacto(id: number, payload: CasaContactoPayload): Promise<Casa> {
    return useHttpClient().request<Casa>(`/casas/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  // Dispara la sincronización con la API externa de Casas Petroil bajo
  // demanda (botón "Sincronizar"), no por cron. Devuelve la lista ya
  // actualizada para no tener que hacer un segundo GET /casas.
  async function syncCasas(): Promise<Casa[]> {
    return useHttpClient().request<Casa[]>('/casas/sync', { method: 'POST' })
  }

  return { getCasas, updateCasaContacto, syncCasas }
}
