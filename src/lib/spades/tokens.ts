import { createHash, randomBytes } from 'node:crypto'

// 32 random bytes (256 bits) as base64url. Only the SHA-256 hash is stored.
export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(`spades:${token}`).digest('hex')
}

export function cryptoRandom(): number {
  return randomBytes(4).readUInt32BE(0) / 0x100000000
}
