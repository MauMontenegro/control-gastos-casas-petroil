import { resolve } from 'node:path'
import { z } from 'zod'

try {
  process.loadEnvFile()
} catch {
  // En despliegues las variables normalmente se inyectan sin archivo .env.
}

const booleanValue = z
  .string()
  .optional()
  .transform((value) => value?.toLowerCase() !== 'false')

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('127.0.0.1'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_PATH: z.string().default('./data/control-gastos.sqlite'),
  UPLOAD_DIR: z.string().default('./uploads'),
  SIPP_ENCRYPTION_KEY: z.string().min(1),
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  ALLOW_DEVELOPMENT_USER: booleanValue,
  SIPP_STAGE_URL: z.string().url().default('https://stage.sipp.petroil.dev/'),
  SIPP_PRODUCTION_URL: z.string().url().default('https://sipp.petroil.com.mx/'),
  RPA_HEADLESS: booleanValue,
  RPA_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  RPA_BROWSER_CHANNEL: z.enum(['msedge', 'chrome']).optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(`Configuración inválida: ${parsed.error.issues.map((i) => i.message).join(', ')}`)
}

const encryptionKey = Buffer.from(parsed.data.SIPP_ENCRYPTION_KEY, 'base64')
if (encryptionKey.length !== 32) {
  throw new Error('SIPP_ENCRYPTION_KEY debe contener exactamente 32 bytes codificados en base64')
}

export const config = {
  ...parsed.data,
  DATABASE_PATH: resolve(parsed.data.DATABASE_PATH),
  UPLOAD_DIR: resolve(parsed.data.UPLOAD_DIR),
  encryptionKey,
}

export type SippEnvironment = 'stage' | 'production'

export function getSippBaseUrl(environment: SippEnvironment) {
  return environment === 'production' ? config.SIPP_PRODUCTION_URL : config.SIPP_STAGE_URL
}
