// Shared helpers for the community idea board + homepage (/RSVP).

// Same cookie the votes API sets, so a visitor has one identity across
// event votes and idea upvotes.
export const VISITOR_COOKIE = 'rsvp-visitor'
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

export function randomVisitorToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const IDEA_CATEGORIES = ['party', 'live_music', 'dj_set', 'day_party', 'themed_night', 'experience', 'other'] as const
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number]

export function normalizeCategory(input: unknown): IdeaCategory {
  return IDEA_CATEGORIES.includes(input as IdeaCategory) ? (input as IdeaCategory) : 'other'
}

// Hacker-News-style decay: fresh ideas with a few votes outrank old ideas
// that stopped moving.
export function trendingScore(upvotes: number, createdAt: string): number {
  const hours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 36e5)
  return (upvotes + 1) / Math.pow(hours + 2, 1.2)
}

// Postgres "undefined column" / PostgREST "column not in schema cache".
// Lets the homepage keep working before supabase-migration-rsvp-community.sql is run.
export function isMissingColumnError(error: { code?: string } | null): boolean {
  return !!error && (error.code === '42703' || error.code === 'PGRST204')
}
