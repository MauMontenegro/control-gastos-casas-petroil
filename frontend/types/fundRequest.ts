export type FundRequestStatus = 'en-revision' | 'autorizada' | 'correccion'

export interface FundRequest {
  id: string
  folio: string
  requiredDate: string
  concept: string
  branch: string
  total: number
  status: FundRequestStatus
}
