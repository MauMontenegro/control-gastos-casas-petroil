export interface AuthenticatedUser {
  id: string
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: AuthenticatedUser
  }
}

export interface SippConfigurationRecord {
  user_id: string
  environment: 'stage' | 'production'
  username: string
  password_encrypted: string
  company_id: string | null
  company_name: string | null
  branch_id: string | null
  branch_name: string | null
  card_id: string | null
  card_name: string | null
  last_connection_at: string | null
  updated_at: string
  headless: number
}
