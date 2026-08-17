import { randomUUID } from 'node:crypto'
import { db } from '../database.js'

export type RequestStatus = 'borrador' | 'capturando' | 'capturada' | 'correccion'

export interface FundRequestRecord {
  id: string
  user_id: string
  folio: string
  required_date: string
  concept: string
  branch: string
  total: number
  status: RequestStatus
  expense_type: string
  cost_center: string
  provider: string
  comment: string | null
  sipp_card_id: string
  sipp_card_name: string | null
  increment_type: string
  support_path: string | null
  support_name: string | null
  sipp_folio: string | null
  rpa_error: string | null
  created_at: string
  updated_at: string
}

function nextFolio() {
  const year = new Date().getFullYear()
  const row = db
    .prepare("SELECT folio FROM fund_requests WHERE folio LIKE ? ORDER BY folio DESC LIMIT 1")
    .get(`SF-${year}-%`) as { folio: string } | undefined
  const next = (Number(row?.folio.split('-').pop()) || 0) + 1
  return `SF-${year}-${String(next).padStart(4, '0')}`
}

export function listRequests(userId: string) {
  return db
    .prepare('SELECT * FROM fund_requests WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as unknown as FundRequestRecord[]
}

export function findRequest(userId: string, id: string) {
  return db
    .prepare('SELECT * FROM fund_requests WHERE user_id = ? AND id = ?')
    .get(userId, id) as FundRequestRecord | undefined
}

export function createRequest(
  userId: string,
  input: {
    requiredDate: string
    concept: string
    branch: string
    amount: number
    expenseType: string
    costCenter: string
    provider: string
    comment?: string
    sippCardId: string
    sippCardName?: string
    incrementType: string
    supportPath?: string
    supportName?: string
  },
) {
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO fund_requests (
      id, user_id, folio, required_date, concept, branch, total, status,
      expense_type, cost_center, provider, comment, sipp_card_id, sipp_card_name,
      increment_type, support_path, support_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    nextFolio(),
    input.requiredDate,
    input.concept,
    input.branch,
    input.amount,
    input.expenseType,
    input.costCenter,
    input.provider,
    input.comment ?? null,
    input.sippCardId,
    input.sippCardName ?? null,
    input.incrementType,
    input.supportPath ?? null,
    input.supportName ?? null,
    now,
    now,
  )
  return findRequest(userId, id)!
}

export function updateRequestCapture(
  userId: string,
  id: string,
  status: RequestStatus,
  data: { sippFolio?: string | null; error?: string | null } = {},
) {
  db.prepare(`
    UPDATE fund_requests SET status = ?, sipp_folio = COALESCE(?, sipp_folio),
      rpa_error = ?, updated_at = ? WHERE user_id = ? AND id = ?
  `).run(status, data.sippFolio ?? null, data.error ?? null, new Date().toISOString(), userId, id)
  return findRequest(userId, id)
}

export function toFundRequest(record: FundRequestRecord) {
  return {
    id: record.id,
    folio: record.folio,
    requiredDate: record.required_date,
    concept: record.concept,
    branch: record.branch,
    total: record.total,
    status: record.status,
    expenseType: record.expense_type,
    costCenter: record.cost_center,
    provider: record.provider,
    comment: record.comment,
    sippCardId: record.sipp_card_id,
    sippCardName: record.sipp_card_name,
    incrementType: record.increment_type,
    supportName: record.support_name,
    sippFolio: record.sipp_folio,
    rpaError: record.rpa_error,
  }
}
