import { useBranchesRepository } from '~/repositories/branchesRepository'
import type { Branch } from '~/types'

export const useBranchesStore = defineStore('branches', () => {
  const items = ref<Branch[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBranches() {
    loading.value = true
    error.value = null
    try {
      items.value = await useBranchesRepository().getBranches()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar sucursales'
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchBranches }
})
