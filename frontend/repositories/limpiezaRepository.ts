import type {
  CreateLimpiezaAsignacionPayload,
  LimpiezaAsignacion,
  UpdateLimpiezaAsignacionPayload,
} from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

export function useLimpiezaRepository() {
  async function getAsignaciones(): Promise<LimpiezaAsignacion[]> {
    return useHttpClient().request<LimpiezaAsignacion[]>('/limpieza-asignaciones')
  }

  async function createAsignacion(
    payload: CreateLimpiezaAsignacionPayload,
  ): Promise<LimpiezaAsignacion> {
    return useHttpClient().request<LimpiezaAsignacion>('/limpieza-asignaciones', {
      method: 'POST',
      body: payload,
    })
  }

  async function updateAsignacion(
    id: string,
    payload: UpdateLimpiezaAsignacionPayload,
  ): Promise<LimpiezaAsignacion> {
    return useHttpClient().request<LimpiezaAsignacion>(`/limpieza-asignaciones/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  async function deleteAsignacion(id: string): Promise<void> {
    await useHttpClient().request(`/limpieza-asignaciones/${id}`, { method: 'DELETE' })
  }

  return { getAsignaciones, createAsignacion, updateAsignacion, deleteAsignacion }
}
