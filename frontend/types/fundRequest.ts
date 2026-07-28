export type FundRequestStatus = 'en-revision' | 'autorizada' | 'correccion'

export interface FundRequest {
  id: string
  folio: string
  requiredDate: string
  concept: string
  branch: string
  total: number
  status: FundRequestStatus
  expenseType?: string
  costCenter?: string
  provider?: string
  comment?: string
}

export interface CreateFundRequestPayload {
  concept: string
  amount: number
  requiredDate: string
  branch: string
  expenseType: string
  costCenter: string
  provider: string
  comment?: string
}
