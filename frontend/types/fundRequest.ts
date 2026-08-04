export type FundRequestStatus = 'en-revision' | 'autorizada' | 'correccion'

export type SippStatus = 'no-enviada' | 'en-proceso' | 'enviada' | 'error'

export interface FundRequestConceptDetail {
  id: string
  expenseType: string
  incrementType: string
  casa: string
  provider: string
  amount: number
  comment?: string
  documentName: string
  documentUrl: string
}

export interface FundRequest {
  id: string
  folio: string
  requiredDate: string
  card: string
  total: number
  status: FundRequestStatus
  sippStatus?: SippStatus
  /** Folio real asignado por SIPP al capturar la solicitud (distinto de `folio`, que es el nuestro). */
  sippFolio?: string
  concepts: FundRequestConceptDetail[]
}

export interface SippUploadResult {
  id: string
  status: SippStatus
  message?: string
  sippFolio?: string
}

export interface CreateFundRequestConceptItem {
  expenseType: string
  incrementType: string
  casa: number
  provider: string
  amount: number
  document: File
  comment?: string
}

export interface CreateFundRequestPayload {
  requiredDate: string
  card: string
  concepts: CreateFundRequestConceptItem[]
}
