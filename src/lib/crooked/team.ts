// Crooked Rumor "Join the Team" — shared types, options, and validation.
// Imported by the public form (client), the submit API (server), and the
// admin tab, so the rules are identical everywhere. The server is the one
// that actually enforces them.

export const TEAM_SKILLS = [
  { id: 'photography', label: 'Photography' },
  { id: 'videography', label: 'Videography' },
  { id: 'interviewing', label: 'Interviewing / Hosting' },
  { id: 'editing', label: 'Video Editing' },
  { id: 'design', label: 'Graphic Design' },
  { id: 'social', label: 'Social Media / Marketing' },
  { id: 'music', label: 'Music / Entertainment Industry' },
  { id: 'other', label: 'Other' },
] as const
export type TeamSkill = (typeof TEAM_SKILLS)[number]['id']

export const UNPAID_OPTIONS = [
  { id: 'yes', label: 'Yes' },
  { id: 'depends', label: 'Depends on the opportunity' },
  { id: 'paid_only', label: 'Paid opportunities only' },
] as const
export type UnpaidOpenness = (typeof UNPAID_OPTIONS)[number]['id']

export const APPLICATION_STATUSES = ['new', 'under_review', 'contacted', 'accepted', 'declined'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  under_review: 'Under Review',
  contacted: 'Contacted',
  accepted: 'Accepted',
  declined: 'Declined',
}

export interface Application {
  id: string
  status: ApplicationStatus
  full_name: string
  email: string
  social_handle: string
  location: string
  skills: TeamSkill[]
  skills_other: string
  about: string
  contribution: string
  portfolio_url: string
  unpaid_openness: UnpaidOpenness
  acknowledged: boolean
  admin_notes: string
  created_at: string
  updated_at: string
}

export const LIMITS = {
  full_name: 120,
  email: 200,
  social_handle: 120,
  location: 120,
  skills_other: 120,
  about: 1500,
  contribution: 3000,
  portfolio_url: 500,
} as const

export const MIN_CONTRIBUTION = 20

export interface ApplicationInput {
  full_name: string
  email: string
  social_handle: string
  location: string
  skills: string[]
  skills_other: string
  about: string
  contribution: string
  portfolio_url: string
  unpaid_openness: string
  acknowledged: boolean
}

export type ApplicationErrors = Partial<Record<keyof ApplicationInput, string>>

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, m => (m.includes('\n') ? m : ' ')).trim().slice(0, max)

// Adds https:// when someone types "mysite.com", rejects anything that is
// not an http(s) URL (blocks javascript: and data: links in the admin view).
export function normalizeUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v) return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

export function validateApplication(raw: any): { value: ApplicationInput; errors: ApplicationErrors } {
  const skillIds = new Set<string>(TEAM_SKILLS.map(s => s.id))
  const value: ApplicationInput = {
    full_name: clean(raw?.full_name, LIMITS.full_name),
    email: clean(raw?.email, LIMITS.email).toLowerCase(),
    social_handle: clean(raw?.social_handle, LIMITS.social_handle),
    location: clean(raw?.location, LIMITS.location),
    skills: Array.from(new Set((Array.isArray(raw?.skills) ? raw.skills : []).map(String).filter((s: string) => skillIds.has(s)))),
    skills_other: clean(raw?.skills_other, LIMITS.skills_other),
    about: String(raw?.about ?? '').trim().slice(0, LIMITS.about),
    contribution: String(raw?.contribution ?? '').trim().slice(0, LIMITS.contribution),
    portfolio_url: clean(raw?.portfolio_url, LIMITS.portfolio_url),
    unpaid_openness: String(raw?.unpaid_openness ?? ''),
    acknowledged: raw?.acknowledged === true,
  }

  const errors: ApplicationErrors = {}
  if (value.full_name.length < 2) errors.full_name = 'Please enter your full name'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email)) errors.email = 'Please enter a valid email address'
  if (value.location.length < 2) errors.location = 'Please tell us your city'
  if (value.skills.length === 0) errors.skills = 'Pick at least one'
  if (!value.skills.includes('other')) value.skills_other = ''
  else if (!value.skills_other) errors.skills_other = 'Tell us what "Other" means for you'
  if (value.contribution.length < MIN_CONTRIBUTION) errors.contribution = `Give us a little more detail (at least ${MIN_CONTRIBUTION} characters)`
  if (value.portfolio_url) {
    const url = normalizeUrl(value.portfolio_url)
    if (url === null) errors.portfolio_url = 'That link does not look right. Try something like yoursite.com'
    else value.portfolio_url = url
  }
  if (!UNPAID_OPTIONS.some(o => o.id === value.unpaid_openness)) errors.unpaid_openness = 'Please choose one'
  if (!value.acknowledged) errors.acknowledged = 'Please check the box to continue'
  return { value, errors }
}

// "@name", "name", or a full profile URL → a link the admin can open.
export function socialLink(handle: string): string | null {
  const h = handle.trim()
  if (!h) return null
  if (/^https?:\/\//i.test(h)) return normalizeUrl(h)
  if (/\s/.test(h)) return null
  return `https://instagram.com/${h.replace(/^@/, '')}`
}
