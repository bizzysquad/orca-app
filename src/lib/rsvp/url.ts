// RSVP's own base-URL env var — intentionally separate from
// NEXT_PUBLIC_APP_URL (used by BizzyPlug and the rest of ORCA) so changing
// one can never affect the other.
export function getRsvpAppUrl(): string {
  return (process.env.RSVP_APP_URL || 'https://orcafin.app').trim().replace(/\/$/, '')
}
