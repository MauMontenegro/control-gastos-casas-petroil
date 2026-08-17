import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { config } from './config.js'

const ALGORITHM = 'aes-256-gcm'

export function encryptSecret(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, config.encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decryptSecret(value: string): string {
  const [ivEncoded, tagEncoded, encryptedEncoded] = value.split('.')
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error('Credencial cifrada inválida')
  const decipher = createDecipheriv(
    ALGORITHM,
    config.encryptionKey,
    Buffer.from(ivEncoded, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
