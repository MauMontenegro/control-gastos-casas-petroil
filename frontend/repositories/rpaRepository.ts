import type { RpaExecutionResult } from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

// TODO: reemplazar por la ruta real que dé el backend para el RPA de comprobación por sucursal.
const RPA_SUCURSAL_COMPROBACION_ENDPOINT = '/rpa/sucursal-comprobacion'

export function useRpaRepository() {
  async function executeSucursalComprobacion(casaId: number): Promise<RpaExecutionResult> {
    return useHttpClient().request<RpaExecutionResult>(RPA_SUCURSAL_COMPROBACION_ENDPOINT, {
      method: 'POST',
      body: { casaId },
    })
  }

  return { executeSucursalComprobacion }
}
