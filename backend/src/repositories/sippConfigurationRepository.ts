import { encryptSecret } from '../crypto.js'
import { db } from '../database.js'
import type { SippConfigurationRecord } from '../types.js'

export interface SaveSippConfiguration {
  environment: 'stage' | 'production'
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

export function findSippConfiguration(userId: string) {
  return db
    .prepare('SELECT * FROM sipp_configurations WHERE user_id = ?')
    .get(userId) as SippConfigurationRecord | undefined
}

export function saveSippConfiguration(userId: string, input: SaveSippConfiguration) {
  const current = findSippConfiguration(userId)
  const encryptedPassword = input.password
    ? encryptSecret(input.password)
    : current?.password_encrypted
  if (!encryptedPassword) throw new Error('La contraseña de SIPP es obligatoria')
  const companyId = input.companyId === undefined ? current?.company_id : input.companyId
  const companyName = input.companyName === undefined ? current?.company_name : input.companyName
  const branchId = input.branchId === undefined ? current?.branch_id : input.branchId
  const branchName = input.branchName === undefined ? current?.branch_name : input.branchName
  const cardId = input.cardId === undefined ? current?.card_id : input.cardId
  const cardName = input.cardName === undefined ? current?.card_name : input.cardName
  const headless = input.headless === undefined ? current?.headless !== 0 : input.headless

  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO sipp_configurations (
      user_id, environment, username, password_encrypted, company_id, company_name,
      branch_id, branch_name, card_id, card_name, headless, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      environment = excluded.environment,
      username = excluded.username,
      password_encrypted = excluded.password_encrypted,
      company_id = excluded.company_id,
      company_name = excluded.company_name,
      branch_id = excluded.branch_id,
      branch_name = excluded.branch_name,
      card_id = excluded.card_id,
      card_name = excluded.card_name,
      headless = excluded.headless,
      updated_at = excluded.updated_at
  `).run(
    userId,
    input.environment,
    input.username,
    encryptedPassword,
    companyId ?? null,
    companyName ?? null,
    branchId ?? null,
    branchName ?? null,
    cardId ?? null,
    cardName ?? null,
    headless ? 1 : 0,
    now,
  )
  return findSippConfiguration(userId)!
}

export function markSippConnection(userId: string) {
  db.prepare('UPDATE sipp_configurations SET last_connection_at = ? WHERE user_id = ?').run(
    new Date().toISOString(),
    userId,
  )
}

export function toPublicConfiguration(record?: SippConfigurationRecord) {
  if (!record) return null
  return {
    environment: record.environment,
    username: record.username,
    hasPassword: true,
    companyId: record.company_id,
    companyName: record.company_name,
    branchId: record.branch_id,
    branchName: record.branch_name,
    cardId: record.card_id,
    cardName: record.card_name,
    lastConnectionAt: record.last_connection_at,
    updatedAt: record.updated_at,
    ready: Boolean(record.company_id && record.branch_id && record.card_id),
    headless: record.headless !== 0,
  }
}
