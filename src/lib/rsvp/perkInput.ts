// Validates perk fields coming from the event editor. `partial` allows PATCH
// bodies that only carry the fields being changed.
export function sanitizePerkInput(body: any, partial = false): { values: Record<string, unknown> } | { error: string } {
  const v: Record<string, unknown> = {}
  const has = (k: string) => body?.[k] !== undefined

  if (!partial || has('name')) {
    const name = String(body?.name || '').trim().slice(0, 80)
    if (!name) return { error: 'Give the perk a name, like "$5 off any drink"' }
    v.name = name
  }
  if (has('description')) v.description = String(body.description || '').trim().slice(0, 300)
  if (!partial || has('delivery')) v.delivery = body?.delivery === 'separate' ? 'separate' : 'ticket'

  const posIntOrNull = (x: any) => (x === null || x === '' || x === undefined ? null : Math.max(1, Math.floor(Number(x)) || 1))
  if (!partial || has('uses_per_guest')) v.uses_per_guest = posIntOrNull(body?.uses_per_guest === undefined ? 1 : body.uses_per_guest)
  if (has('total_cap')) v.total_cap = posIntOrNull(body.total_cap)

  const isoOrNull = (x: any) => {
    if (!x) return null
    const d = new Date(x)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (has('valid_from')) v.valid_from = isoOrNull(body.valid_from)
  if (has('valid_until')) v.valid_until = isoOrNull(body.valid_until)
  if (v.valid_from && v.valid_until && String(v.valid_until) <= String(v.valid_from)) {
    return { error: 'The perk has to end after it starts' }
  }

  if (!partial || has('eligibility')) {
    const e = body?.eligibility
    v.eligibility = e === 'first_n' || e === 'checked_in' ? e : 'all'
  }
  if (has('first_n')) v.first_n = posIntOrNull(body.first_n)
  if (v.eligibility === 'first_n' && !v.first_n && !partial) return { error: 'Set how many RSVPs get this perk' }

  if (has('is_paused')) v.is_paused = !!body.is_paused
  return { values: v }
}
