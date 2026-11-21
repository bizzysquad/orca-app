// Single elimination bracket math for power of two capacities with byes.

export const CAPACITIES = [2, 4, 8, 16, 32, 64] as const

export function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0
}

export function totalRounds(capacity: number): number {
  return Math.round(Math.log2(capacity))
}

export function roundName(round: number, rounds: number): string {
  if (round === rounds) return 'Championship'
  if (round === rounds - 1) return 'Semifinals'
  if (round === rounds - 2) return 'Quarterfinals'
  return `Round ${round}`
}

// Standard seeding positions: 1 v 8, 4 v 5, 2 v 7, 3 v 6 for eight.
export function seedPositions(size: number): number[] {
  let order = [1]
  while (order.length < size) {
    const n = order.length * 2
    const next: number[] = []
    for (const s of order) next.push(s, n + 1 - s)
    order = next
  }
  return order
}

export interface BracketSlot {
  round: number
  slot: number
  teamA: string | null
  teamB: string | null
  bye: boolean
}

// teamIds are in seed order (index 0 is seed 1). Missing seeds become byes.
export function generateBracket(teamIds: string[], capacity: number): BracketSlot[] {
  if (!isPowerOfTwo(capacity)) throw new Error('Capacity must be a power of two')
  if (teamIds.length > capacity) throw new Error('More teams than bracket capacity')
  if (teamIds.length < 2) throw new Error('At least two teams are required')
  if (new Set(teamIds).size !== teamIds.length) throw new Error('A team appears twice in the bracket')
  const pos = seedPositions(capacity)
  const rounds = totalRounds(capacity)
  const out: BracketSlot[] = []
  for (let i = 0; i < capacity / 2; i++) {
    const a = teamIds[pos[2 * i] - 1] ?? null
    const b = teamIds[pos[2 * i + 1] - 1] ?? null
    out.push({ round: 1, slot: i, teamA: a, teamB: b, bye: !a || !b })
  }
  for (let r = 2; r <= rounds; r++) {
    for (let i = 0; i < capacity / 2 ** r; i++) out.push({ round: r, slot: i, teamA: null, teamB: null, bye: false })
  }
  return out
}

export function nextSlot(round: number, slot: number, rounds: number): { round: number; slot: number; side: 'a' | 'b' } | null {
  if (round >= rounds) return null
  return { round: round + 1, slot: Math.floor(slot / 2), side: slot % 2 === 0 ? 'a' : 'b' }
}

// Fisher Yates with a caller supplied random source (crypto in production).
export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}
