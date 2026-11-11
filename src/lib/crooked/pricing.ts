import type { Addon, LineItem, Package, Promo, SiteDoc, SiteSettings } from './types'

// Shared by the booking page (instant preview) and the API (the real charge),
// so what the client sees is exactly what Stripe gets.

export interface Selection {
  packageId: string
  addons: { id: string; qty: number }[]
  paymentChoice: 'deposit' | 'full'
}

export interface Quote {
  pkg: Package
  items: LineItem[]
  customRequests: string[]
  subtotalCents: number
  discountCents: number
  totalCents: number
  depositCents: number
  canPayDeposit: boolean
  dueNowCents: number
  paymentChoice: 'deposit' | 'full'
  promo: Promo | null
  promoError: string | null
}

export function formatMoney(cents: number | null | undefined, opts: { always2?: boolean } = {}): string {
  const n = (cents || 0) / 100
  const whole = Number.isInteger(n) && !opts.always2
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })
}

export function addonsFor(site: Pick<SiteDoc, 'addons'>, categoryId: string): Addon[] {
  return site.addons.filter(a => !a.hidden && (a.categoryIds.length === 0 || a.categoryIds.includes(categoryId)))
}

export function addonPriceLabel(a: Addon): string {
  if (a.priceCents == null) return 'Custom quote'
  return [a.pricePrefix, formatMoney(a.priceCents), a.unit].filter(Boolean).join(' ')
}

// Returns an error message, or null when the promo applies.
export function promoProblem(promo: Promo, categoryId: string, subtotalCents: number, usedCount = 0): string | null {
  if (!promo.active) return 'That code is not active'
  if (promo.expiresAt && new Date(promo.expiresAt + 'T23:59:59') < new Date()) return 'That code has expired'
  if (promo.categoryIds.length && !promo.categoryIds.includes(categoryId)) return 'That code does not apply to this package'
  if (promo.minCents && subtotalCents < promo.minCents) return `That code needs an order of ${formatMoney(promo.minCents)} or more`
  if (promo.maxUses != null && usedCount >= promo.maxUses) return 'That code has been fully redeemed'
  return null
}

export function depositFor(totalCents: number, payment: SiteSettings['payment']): { depositCents: number; canPayDeposit: boolean } {
  if (totalCents <= 0) return { depositCents: 0, canPayDeposit: false }
  const underMin = totalCents < (payment.fullPaymentUnderCents || 0)
  if (payment.mode === 'full' || underMin) return { depositCents: totalCents, canPayDeposit: false }
  const pct = Math.min(100, Math.max(1, payment.depositPercent || 50))
  return { depositCents: Math.round((totalCents * pct) / 100), canPayDeposit: true }
}

export function computeQuote(
  site: Pick<SiteDoc, 'packages' | 'addons' | 'settings'>,
  sel: Selection,
  promo: Promo | null = null,
  promoUsedCount = 0
): Quote | null {
  const pkg = site.packages.find(p => p.id === sel.packageId && !p.hidden)
  if (!pkg) return null

  const allowed = addonsFor(site, pkg.categoryId)
  const items: LineItem[] = [{ label: pkg.name, unitCents: pkg.priceCents, qty: 1, totalCents: pkg.priceCents }]
  const customRequests: string[] = []

  for (const pick of sel.addons) {
    const a = allowed.find(x => x.id === pick.id)
    if (!a) continue
    const qty = a.allowQty ? Math.min(20, Math.max(1, Math.floor(pick.qty || 1))) : 1
    if (a.priceCents == null) {
      customRequests.push(a.name)
      continue
    }
    items.push({ label: a.name + (a.unit ? ` (${a.unit})` : ''), unitCents: a.priceCents, qty, totalCents: a.priceCents * qty })
  }

  const subtotalCents = items.reduce((s, i) => s + i.totalCents, 0)

  let discountCents = 0
  let promoError: string | null = null
  let appliedPromo: Promo | null = null
  if (promo) {
    promoError = promoProblem(promo, pkg.categoryId, subtotalCents, promoUsedCount)
    if (!promoError) {
      appliedPromo = promo
      discountCents =
        promo.kind === 'percent'
          ? Math.round((subtotalCents * Math.min(100, Math.max(0, promo.amount))) / 100)
          : Math.min(subtotalCents, Math.max(0, Math.round(promo.amount)))
    }
  }

  const totalCents = Math.max(0, subtotalCents - discountCents)
  const { depositCents, canPayDeposit } = depositFor(totalCents, site.settings.payment)

  let paymentChoice: 'deposit' | 'full' = sel.paymentChoice
  if (!canPayDeposit) paymentChoice = 'full'
  else if (site.settings.payment.mode === 'deposit') paymentChoice = 'deposit'

  return {
    pkg,
    items,
    customRequests,
    subtotalCents,
    discountCents,
    totalCents,
    depositCents,
    canPayDeposit,
    dueNowCents: paymentChoice === 'deposit' ? depositCents : totalCents,
    paymentChoice,
    promo: appliedPromo,
    promoError,
  }
}
