import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const IV_LEN = 16
const SALT_LEN = 16
const TAG_LEN = 16

/**
 * Encrypt a string (e.g. refresh token) for storage.
 * Uses AES-256-GCM. Key should be 32 bytes or a passphrase (will be derived with salt).
 */
export function encryptCalendarToken(plainText: string, secret: string): string {
  const salt = randomBytes(SALT_LEN)
  const key = deriveKey(secret, salt)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64')
}

/**
 * Decrypt a string produced by encryptCalendarToken.
 */
export function decryptCalendarToken(cipherText: string, secret: string): string {
  const buf = Buffer.from(cipherText, 'base64')
  if (buf.length < SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error('Invalid cipher text')
  }
  const salt = buf.subarray(0, SALT_LEN)
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN)
  const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN)
  const encrypted = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN)
  const key = deriveKey(secret, salt)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LEN)
}
