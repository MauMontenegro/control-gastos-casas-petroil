import type { SaveSippConfiguration, SippCatalogs, SippConfiguration } from '~/types'
import { useHttpClient } from './httpClient'

export function useSippRepository() {
  const http = useHttpClient()

  const getConfiguration = () => http.request<SippConfiguration | null>('/sipp/configuration')
  const saveConfiguration = (body: SaveSippConfiguration) =>
    http.request<SippConfiguration>('/sipp/configuration', {
      method: 'PUT',
      body,
      retry: 1,
      retryDelay: 500,
    })
  const getCatalogs = (companyId?: string) =>
    http.request<SippCatalogs>('/sipp/catalogs', {
      method: 'POST',
      body: companyId ? { companyId } : {},
      timeout: 120000,
    })

  return { getConfiguration, saveConfiguration, getCatalogs }
}
