import type { CreateFundRequestPayload, FundRequest } from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

export function useRequestsRepository() {
  async function getRequests(): Promise<FundRequest[]> {
    return useHttpClient().request<FundRequest[]>('/fund-requests')
  }

  async function createRequest(payload: CreateFundRequestPayload): Promise<FundRequest> {
    const body = new FormData()
    body.append('requiredDate', payload.requiredDate)
    body.append('branch', payload.branch)
    body.append('card', payload.card)
    body.append('expenseType', payload.expenseType)
    body.append('provider', payload.provider)
    if (payload.comment) body.append('comment', payload.comment)

    // Cada concepto va como metadata en `concepts` (JSON) más un archivo
    // adjunto en un campo `document_<index>` referenciado por `documentField`,
    // para que el backend pueda enlazar cada documento con su concepto sin
    // depender del orden de llegada de los campos del multipart.
    body.append(
      'concepts',
      JSON.stringify(
        payload.concepts.map((item, index) => ({
          concept: item.concept,
          amount: item.amount,
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

  return { getRequests, createRequest }
}
