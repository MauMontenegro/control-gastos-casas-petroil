import type {
  AddFundRequestConceptsResult,
  CreateFundRequestConceptItem,
  CreateFundRequestPayload,
  FundRequest,
  FundRequestConceptDetail,
  FundRequestStatus,
  SippUploadResult,
  UpdateFundRequestConceptPayload,
} from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

// Compartido entre crear una solicitud nueva y agregar conceptos a una ya
// abierta: cada concepto manda su documento (si trae uno) en un campo
// `document_<index>` referenciado por `documentField`, para que el backend
// enlace cada documento con su concepto sin depender del orden de llegada.
function appendConceptsToFormData(body: FormData, concepts: CreateFundRequestConceptItem[]) {
  body.append(
    'concepts',
    JSON.stringify(
      concepts.map((item, index) => ({
        expenseType: item.expenseType,
        incrementType: item.incrementType,
        casa: item.casa,
        provider: item.provider,
        amount: item.amount,
        comment: item.comment,
        documentField: item.document ? `document_${index}` : undefined,
      })),
    ),
  )
  concepts.forEach((item, index) => {
    if (item.document) body.append(`document_${index}`, item.document)
  })
}

export function useRequestsRepository() {
  async function getRequests(): Promise<FundRequest[]> {
    return useHttpClient().request<FundRequest[]>('/fund-requests')
  }

  async function uploadToSipp(ids: string[]): Promise<SippUploadResult[]> {
    return useHttpClient().request<SippUploadResult[]>('/fund-requests/sipp-upload', {
      method: 'POST',
      body: { ids },
    })
  }

  async function updateStatus(id: string, status: FundRequestStatus): Promise<FundRequest> {
    return useHttpClient().request<FundRequest>(`/fund-requests/${id}`, {
      method: 'PATCH',
      body: { status },
    })
  }

  // La tarjeta vive en la solicitud, no en el concepto — editable desde
  // Comprobaciones porque ahí es donde se detecta que se capturó mal.
  async function updateCard(id: string, card: string): Promise<FundRequest> {
    return useHttpClient().request<FundRequest>(`/fund-requests/${id}`, {
      method: 'PATCH',
      body: { card },
    })
  }

  async function updateConcept(
    requestId: string,
    conceptId: string,
    payload: UpdateFundRequestConceptPayload,
  ): Promise<FundRequestConceptDetail> {
    return useHttpClient().request<FundRequestConceptDetail>(
      `/fund-requests/${requestId}/concepts/${conceptId}`,
      { method: 'PATCH', body: payload },
    )
  }

  // Adjunta (o reemplaza) el documento de un concepto que se creó sin uno —
  // p. ej. los que arma en lote el botón "Crear Solicitudes" del calendario.
  async function uploadConceptDocument(
    requestId: string,
    conceptId: string,
    file: File,
  ): Promise<FundRequestConceptDetail> {
    const body = new FormData()
    body.append('document', file)
    return useHttpClient().request<FundRequestConceptDetail>(
      `/fund-requests/${requestId}/concepts/${conceptId}/document`,
      { method: 'POST', body },
    )
  }

  // Dispara el RPA que captura este concepto en SIPP. Sin body: toda la
  // info que necesita el RPA (casa, importe, proveedor, tipo de gasto,
  // documento) ya vive en el concepto. El backend regresa el concepto con
  // comprobacionStatus en 'enviada' una vez capturado.
  async function sendConceptToSipp(
    requestId: string,
    conceptId: string,
  ): Promise<FundRequestConceptDetail> {
    return useHttpClient().request<FundRequestConceptDetail>(
      `/fund-requests/${requestId}/concepts/${conceptId}/sipp-comprobacion`,
      { method: 'POST' },
    )
  }

  async function createRequest(payload: CreateFundRequestPayload): Promise<FundRequest> {
    const body = new FormData()
    body.append('requiredDate', payload.requiredDate)
    body.append('card', payload.card)
    appendConceptsToFormData(body, payload.concepts)

    return useHttpClient().request<FundRequest>('/fund-requests', {
      method: 'POST',
      body,
    })
  }

  // Agrega uno o más conceptos a una solicitud ya abierta, en vez de crear
  // una nueva — las solicitudes de incremento se hacen por tarjeta, así que
  // solo debe haber una abierta a la vez por tarjeta.
  async function addConcepts(
    requestId: string,
    concepts: CreateFundRequestConceptItem[],
  ): Promise<AddFundRequestConceptsResult> {
    const body = new FormData()
    appendConceptsToFormData(body, concepts)

    return useHttpClient().request<AddFundRequestConceptsResult>(
      `/fund-requests/${requestId}/concepts`,
      { method: 'POST', body },
    )
  }

  return {
    getRequests,
    createRequest,
    addConcepts,
    uploadToSipp,
    updateStatus,
    updateCard,
    updateConcept,
    uploadConceptDocument,
    sendConceptToSipp,
  }
}
