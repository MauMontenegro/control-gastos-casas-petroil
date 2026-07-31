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

export interface CreateFundRequestConceptItem {
  concept: string
  amount: number
  document: File
}

export interface CreateFundRequestPayload {
  requiredDate: string
  branch: string
  card: string
  expenseType: string
  provider: string
  comment?: string
  concepts: CreateFundRequestConceptItem[]
}
