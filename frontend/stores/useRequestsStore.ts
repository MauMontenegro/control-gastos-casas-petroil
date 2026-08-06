import { useRequestsRepository } from '~/repositories/requestsRepository'
import type {
  CreateFundRequestPayload,
  FundRequest,
  FundRequestStatus,
  SippUploadResult,
  UpdateFundRequestConceptPayload,
} from '~/types'

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

  async function createRequest(payload: CreateFundRequestPayload) {
    const created = await useRequestsRepository().createRequest(payload)
    items.value.unshift(created)
    return created
  }

  async function uploadToSipp(ids: string[]): Promise<SippUploadResult[]> {
    const results = await useRequestsRepository().uploadToSipp(ids)
    for (const result of results) {
      const item = items.value.find((r) => r.id === result.id)
      if (item) {
        item.sippStatus = result.status
        if (result.sippFolio) item.sippFolio = result.sippFolio
      }
    }
    return results
  }

  async function updateStatus(id: string, status: FundRequestStatus) {
    const updated = await useRequestsRepository().updateStatus(id, status)
    const index = items.value.findIndex((r) => r.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  async function updateConcept(
    requestId: string,
    conceptId: string,
    payload: UpdateFundRequestConceptPayload,
  ) {
    const updated = await useRequestsRepository().updateConcept(requestId, conceptId, payload)
    const request = items.value.find((r) => r.id === requestId)
    if (request) {
      const index = request.concepts.findIndex((c) => c.id === conceptId)
      if (index !== -1) request.concepts[index] = updated
    }
    return updated
  }

  return {
    items,
    loading,
    error,
    pending,
    approved,
    rejected,
    fetchRequests,
    createRequest,
    uploadToSipp,
    updateStatus,
    updateConcept,
  }
})
