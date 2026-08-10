import type {
  CreateFundRequestPayload,
  FundRequest,
  FundRequestConceptDetail,
  FundRequestStatus,
  SippUploadResult,
  UpdateFundRequestConceptPayload,
} from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

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

    // La solicitud en sí solo tiene fecha y tarjeta. Todo lo demás (tipo de
    // gasto, tipo de incremento, casa Petroil, proveedor, importe, motivo)
    // vive por concepto. Cada concepto lleva su archivo en un campo
    // `document_<index>` referenciado por `documentField`, para que el
    // backend enlace cada documento con su concepto sin depender del orden
    // de llegada de los campos del multipart.
    body.append(
      'concepts',
      JSON.stringify(
        payload.concepts.map((item, index) => ({
          expenseType: item.expenseType,
          incrementType: item.incrementType,
          casa: item.casa,
          provider: item.provider,
          amount: item.amount,
          comment: item.comment,
          documentField: `document_${index}`,
        })),
      ),
    )
    payload.concepts.forEach((item, index) => {
      body.append(`document_${index}`, item.document)
    })

    return useHttpClient().request<FundRequest>('/fund-requests', {
      method: 'POST',
      body,
    })
  }

  return {
    getRequests,
    createRequest,
    uploadToSipp,
    updateStatus,
    updateConcept,
    sendConceptToSipp,
  }
}
