export type SippEnvironment = 'stage' | 'production'

export interface SippCatalogOption {
  id: string
  name: string
}

export interface SippConfiguration {
  environment: SippEnvironment
  username: string
  hasPassword: boolean
  companyId?: string | null
  companyName?: string | null
  branchId?: string | null
  branchName?: string | null
  cardId?: string | null
  cardName?: string | null
  lastConnectionAt?: string | null
  updatedAt: string
  ready: boolean
  headless: boolean
}

export interface SaveSippConfiguration {
  environment: SippEnvironment
  username: string
  password?: string
  companyId?: string | null
  companyName?: string | null
  branchId?: string | null
  branchName?: string | null
  cardId?: string | null
  cardName?: string | null
  headless?: boolean
}

export interface SippCatalogs {
  companies: SippCatalogOption[]
  branches: SippCatalogOption[]
  cards: SippCatalogOption[]
}
