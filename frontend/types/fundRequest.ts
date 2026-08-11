export type FundRequestStatus = 'en-revision' | 'autorizada' | 'correccion'

export type SippStatus = 'no-enviada' | 'en-proceso' | 'enviada' | 'error'

export type ComprobacionStatus = 'pendiente' | 'enviada' | 'autorizada' | 'rechazada'

export type TipoNegocio =
  | 'Distribuidora'
  | 'Negocios Asociados'
  | 'Distribuidora y Negocios Asociados'
  | 'COPE'

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
  /** Campos de comprobación — solo tienen valor una vez que la solicitud está autorizada. */
  grupoCentroCosto?: string
  centroCosto?: string
  deducible?: 'SI' | 'NO'
  tipoNegocio?: TipoNegocio
  comprobacionStatus?: ComprobacionStatus
}

export interface UpdateFundRequestConceptPayload {
  expenseType?: string
  incrementType?: string
  /** Id numérico de la casa (igual que al crear el concepto), no el nombre que trae el GET. */
  casa?: number
  provider?: string
  amount?: number
  comment?: string
  grupoCentroCosto?: string
  centroCosto?: string
  deducible?: 'SI' | 'NO'
  tipoNegocio?: TipoNegocio
  comprobacionStatus?: ComprobacionStatus
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
  /** Opcional al preparar desde el calendario: se completa después en Comprobaciones. */
  document: File | null
  comment?: string
}

export interface CreateFundRequestPayload {
  requiredDate: string
  card: string
  concepts: CreateFundRequestConceptItem[]
}

export interface AddFundRequestConceptsResult {
  request: FundRequest
  addedConcepts: FundRequestConceptDetail[]
}
