import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from './config.js'

mkdirSync(dirname(config.DATABASE_PATH), { recursive: true })
export const db = new DatabaseSync(config.DATABASE_PATH)
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
db.exec(`
  CREATE TABLE IF NOT EXISTS sipp_configurations (
    user_id TEXT PRIMARY KEY,
    environment TEXT NOT NULL,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    company_id TEXT,
    company_name TEXT,
    branch_id TEXT,
    branch_name TEXT,
    card_id TEXT,
    card_name TEXT,
    last_connection_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fund_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    folio TEXT NOT NULL UNIQUE,
    required_date TEXT NOT NULL,
    concept TEXT NOT NULL,
    branch TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    expense_type TEXT NOT NULL,
    cost_center TEXT NOT NULL,
    provider TEXT NOT NULL,
    comment TEXT,
    sipp_card_id TEXT NOT NULL,
    sipp_card_name TEXT,
    increment_type TEXT NOT NULL,
    support_path TEXT,
    support_name TEXT,
    sipp_folio TEXT,
    rpa_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)

const configurationColumns = db
  .prepare('PRAGMA table_info(sipp_configurations)')
  .all() as unknown as Array<{ name: string }>
if (!configurationColumns.some((column) => column.name === 'headless')) {
  db.exec('ALTER TABLE sipp_configurations ADD COLUMN headless INTEGER NOT NULL DEFAULT 1')
}
