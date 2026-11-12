// Crooked Rumor — public site + booking types.
// The whole editable site (content, packages, add-ons, promos, portfolio) is
// one JSON document in cr_site so the admin can reorder anything just by
// reordering arrays, and every save shows up on the public site immediately.

export type PaymentMode = 'deposit' | 'full' | 'choice'

// One line of "What the client gets" on a package card. Fully admin-defined:
// any label (e.g. "How many songs"), any value, any order.
export interface DetailRow {
  id: string
  label: string
  value: string
}

// Legacy fixed spec fields. Older stored docs (and the starter content) use
// this shape; normalizeSite converts it into DetailRow[] + turnaround.
export interface PackageSpecs {
  filmingTime: string
  locations: string
  setups: string
  videoLength: string
  deliverables: string
  revisions: string
  turnaround: string
}

export interface Category {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  hidden: boolean
}

export interface Package {
  id: string
  categoryId: string
  name: string
  tagline: string
  summary: string
  priceCents: number
  compareAtCents: number | null
  badge: string
  features: string[]
  details: DetailRow[]
  turnaround: string // kept separate: booking summary, emails, and the client page use it
  hidden: boolean
}

export interface Addon {
  id: string
  name: string
  description: string
  // null = custom / quoted separately (client can request it, it isn't charged at checkout)
  priceCents: number | null
  pricePrefix: string // e.g. "Starting at", "+"
  unit: string // e.g. "per reel", "per hour"
  allowQty: boolean
  categoryIds: string[] // empty = available on every category
  hidden: boolean
}

export interface Promo {
  id: string
  code: string
  label: string
  kind: 'percent' | 'fixed'
  amount: number // percent (0-100) or cents
  active: boolean
  expiresAt: string | null // yyyy-mm-dd
  minCents: number
  maxUses: number | null
  categoryIds: string[] // empty = all
}

export interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  client: string
  source: 'upload' | 'embed'
  videoUrl: string // uploaded file URL (source=upload) or the pasted share link (source=embed)
  thumbnailUrl: string
  aspect: '9:16' | '16:9' | '1:1' | '4:5'
  featured: boolean
  hidden: boolean
}

export interface Faq {
  q: string
  a: string
}

export interface ProcessStep {
  title: string
  body: string
}

export interface SiteSettings {
  brandName: string
  announcement: string
  heroEyebrow: string
  heroHeadline: string
  heroHighlight: string
  heroSub: string
  startingAtText: string
  tickerItems: string[]
  workTitle: string
  workSub: string
  pricingTitle: string
  pricingSub: string
  angleVsSceneTitle: string
  angleVsSceneBody: string
  customQuoteTitle: string
  customQuoteBody: string
  processSteps: ProcessStep[]
  aboutTitle: string
  aboutBody: string
  serviceArea: string
  faqs: Faq[]
  contactEmail: string
  contactPhone: string
  instagram: string
  tiktok: string
  youtube: string
  notifyEmail: string
  portfolioCategories: string[]
  logoBadgeUrl: string
  logoWordmarkUrl: string
  payment: {
    mode: PaymentMode
    depositPercent: number
    fullPaymentUnderCents: number
  }
  bookingTerms: string
  bookingSuccessNote: string
}

export interface SiteDoc {
  settings: SiteSettings
  categories: Category[]
  packages: Package[]
  addons: Addon[]
  promos: Promo[]
  portfolio: PortfolioItem[]
}

// What the public pages receive: hidden rows removed, promo codes stripped.
export type PublicSiteDoc = SiteDoc & { hasPromos: boolean }

export const BOOKING_STATUSES = [
  'quote_requested',
  'quoted',
  'pending_payment',
  'deposit_paid',
  'paid',
  'scheduled',
  'in_production',
  'delivered',
  'completed',
  'cancelled',
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const STATUS_LABELS: Record<BookingStatus, string> = {
  quote_requested: 'Quote requested',
  quoted: 'Quote sent',
  pending_payment: 'Awaiting payment',
  deposit_paid: 'Deposit paid',
  paid: 'Paid in full',
  scheduled: 'Scheduled',
  in_production: 'In production',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface LineItem {
  label: string
  unitCents: number
  qty: number
  totalCents: number
}

export interface Booking {
  id: string
  ref: string
  token: string
  kind: 'package' | 'custom'
  status: BookingStatus
  package_id: string | null
  package_name: string | null
  category_name: string | null
  items: LineItem[]
  custom_requests: string[]
  client_name: string
  client_email: string
  client_phone: string
  client_instagram: string
  company: string
  project_date: string | null
  project_time: string
  location: string
  details: string
  budget: string
  referral: string
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  deposit_cents: number
  amount_paid_cents: number
  promo_code: string | null
  payment_choice: 'deposit' | 'full' | null
  turnaround: string
  admin_notes: string
  created_at: string
  updated_at: string
}
