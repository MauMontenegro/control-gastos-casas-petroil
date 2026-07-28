import { useRequestsRepository } from '~/repositories/requestsRepository'
import type { FundRequest } from '~/types'

export const useRequestsStore = defineStore('requests', () => {
  const items = ref<FundRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pending = computed(() => items.value.filter((r) => r.status === 'en-revision'))
  const approved = computed(() => items.value.filter((r) => r.status === 'autorizada'))
  const rejected = computed(() => items.value.filter((r) => r.status === 'correccion'))

  async function fetchRequests() {
    loading.value = true
    error.value = null
    try {
      items.value = await useRequestsRepository().getRequests()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar solicitudes'
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, pending, approved, rejected, fetchRequests }
})
