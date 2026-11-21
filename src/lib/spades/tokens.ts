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

// Short access codes people can type: 8 characters from a 32 letter alphabet
// with no look-alikes (no I, O, 0, 1). 32^8 is about 1.1 trillion
// combinations, and sign-in attempts are rate limited per IP.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newAccessCode(): string {
  const bytes = randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[bytes[i] % 32]
  return out
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isAccessCode(input: string): boolean {
  const n = normalizeCode(input)
  return n.length === 8 && n.split('').every(c => CODE_ALPHABET.includes(c))
}

export function formatCode(code: string): string {
  const n = normalizeCode(code)
  return `${n.slice(0, 4)}-${n.slice(4)}`
}
