import type { Branch } from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

export function useBranchesRepository() {
  async function getBranches(): Promise<Branch[]> {
    return useHttpClient().request<Branch[]>('/branches')
  }

  return { getBranches }
}
