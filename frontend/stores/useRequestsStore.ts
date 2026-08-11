import { useRequestsRepository } from '~/repositories/requestsRepository'
import type {
  CreateFundRequestConceptItem,
  CreateFundRequestPayload,
  FundRequest,
  FundRequestConceptDetail,
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

  function mergeConcept(requestId: string, conceptId: string, updated: FundRequestConceptDetail) {
    const request = items.value.find((r) => r.id === requestId)
    if (!request) return
    const index = request.concepts.findIndex((c) => c.id === conceptId)
    if (index === -1) return
    request.concepts[index] = updated
    // El PATCH de un concepto solo regresa ese concepto, no la solicitud
    // completa — hay que recalcular el total local para que la tabla y el
    // detalle reflejen el importe nuevo sin esperar a un refetch.
    request.total = request.concepts.reduce((sum, c) => sum + c.amount, 0)
  }

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

  async function updateCard(id: string, card: string) {
    const updated = await useRequestsRepository().updateCard(id, card)
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
    mergeConcept(requestId, conceptId, updated)
    return updated
  }

  async function addConcepts(requestId: string, concepts: CreateFundRequestConceptItem[]) {
    const result = await useRequestsRepository().addConcepts(requestId, concepts)
    const index = items.value.findIndex((r) => r.id === requestId)
    if (index !== -1) items.value[index] = result.request
    return result
  }

  async function uploadConceptDocument(requestId: string, conceptId: string, file: File) {
    const updated = await useRequestsRepository().uploadConceptDocument(requestId, conceptId, file)
    mergeConcept(requestId, conceptId, updated)
    return updated
  }

  async function sendConceptToSipp(requestId: string, conceptId: string) {
    const updated = await useRequestsRepository().sendConceptToSipp(requestId, conceptId)
    mergeConcept(requestId, conceptId, updated)
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
    addConcepts,
    uploadToSipp,
    updateStatus,
    updateCard,
    updateConcept,
    uploadConceptDocument,
    sendConceptToSipp,
  }
})
