// Spades HQ rule configuration. Stored as JSON on sp_tournaments.rules and
// snapshotted onto sp_matches.rules when a match starts, so editing house
// rules later never changes how an already running match is scored.
//
// This file is imported by both Next.js and the node:test suite, so it only
// uses erasable TypeScript (no enums, no parameter properties).

export type BiddingMode = 'individual' | 'captain'
export type BidOrder = 'simultaneous' | 'sequential'
export interface RuleSection { title: string; items: string[] }

export interface Rules {
  biddingMode: BiddingMode
  bidOrder: BidOrder
  minTeamBid: number
  maxBid: number
  nilAllowed: boolean
  blindNilAllowed: boolean
  pointsPerBook: number
  bagValue: number
  bagLimit: number
  bagPenalty: number
  initialBags: number
  targetDefault: number
  targetFinal: number
  timeDefaultMin: number
  timeFinalMin: number
  requireCaptainApproval: boolean
  // Games a team must win to take the match. 1 = single game, 2 = best of 3.
  gamesToWin: number
  // false = no bracket: the director pairs teams into individual games and
  // just keeps score (open play). Winners do not advance.
  useBracket: boolean
  renegePolicy: 'lose_bid_award_opponent'
  // Director written rules page. Empty means the page is generated from the
  // settings above (ruleSummary).
  customSections: RuleSection[]
}

export const DEFAULT_RULES: Rules = {
  biddingMode: 'captain',
  bidOrder: 'simultaneous',
  minTeamBid: 4,
  maxBid: 13,
  nilAllowed: false,
  blindNilAllowed: false,
  pointsPerBook: 10,
  bagValue: 1,
  bagLimit: 10,
  bagPenalty: 100,
  initialBags: 0,
  targetDefault: 250,
  targetFinal: 350,
  timeDefaultMin: 50,
  timeFinalMin: 70,
  requireCaptainApproval: true,
  gamesToWin: 1,
  useBracket: true,
  renegePolicy: 'lose_bid_award_opponent',
  customSections: [],
}

function int(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

export function normalizeRules(raw: unknown): Rules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Rules, unknown>>
  const d = DEFAULT_RULES
  return {
    biddingMode: r.biddingMode === 'individual' ? 'individual' : 'captain',
    bidOrder: r.bidOrder === 'sequential' ? 'sequential' : 'simultaneous',
    minTeamBid: int(r.minTeamBid, d.minTeamBid, 0, 13),
    maxBid: 13,
    // Nil scoring is not implemented in this engine, so it is always off.
    nilAllowed: false,
    blindNilAllowed: false,
    pointsPerBook: int(r.pointsPerBook, d.pointsPerBook, 1, 100),
    bagValue: int(r.bagValue, d.bagValue, 0, 10),
    bagLimit: int(r.bagLimit, d.bagLimit, 1, 100),
    bagPenalty: int(r.bagPenalty, d.bagPenalty, 0, 1000),
    initialBags: int(r.initialBags, d.initialBags, 0, 99),
    targetDefault: int(r.targetDefault, d.targetDefault, 10, 2000),
    targetFinal: int(r.targetFinal, d.targetFinal, 10, 2000),
    timeDefaultMin: int(r.timeDefaultMin, d.timeDefaultMin, 0, 600),
    timeFinalMin: int(r.timeFinalMin, d.timeFinalMin, 0, 600),
    requireCaptainApproval: r.requireCaptainApproval === false ? false : true,
    gamesToWin: int(r.gamesToWin, d.gamesToWin, 1, 3),
    useBracket: r.useBracket === false ? false : true,
    renegePolicy: 'lose_bid_award_opponent',
    customSections: cleanSections(r.customSections),
  }
}

function cleanSections(raw: unknown): RuleSection[] {
  if (!Array.isArray(raw)) return []
  const out: RuleSection[] = []
  for (const sec of raw.slice(0, 20)) {
    if (!sec || typeof sec !== 'object') continue
    const title = typeof (sec as any).title === 'string' ? (sec as any).title.trim().slice(0, 80) : ''
    const items = Array.isArray((sec as any).items)
      ? (sec as any).items.filter((i: unknown) => typeof i === 'string').map((i: string) => i.trim().slice(0, 300)).filter(Boolean).slice(0, 30)
      : []
    if (title || items.length) out.push({ title: title || 'Rules', items })
  }
  return out
}

// What /spades/rules shows: the director's own text if set, otherwise the
// generated summary of the scoring settings.
export function displayRules(r: Rules): RuleSection[] {
  return r.customSections.length ? r.customSections : ruleSummary(r)
}

// Human readable rule list, shared by /spades/rules and the print sheets.
export function ruleSummary(r: Rules): RuleSection[] {
  return [
    {
      title: 'The Deck',
      items: [
        'Joker deck: 54 cards with a Big Joker and a Little Joker.',
        'The 2 of Hearts and 2 of Diamonds are removed, leaving 52 cards.',
        'Deal 13 cards to each of the four players, clockwise.',
      ],
    },
    {
      title: 'Trump Order (high to low)',
      items: [
        'Big Joker, Little Joker, 2 of Spades, Ace of Spades, King, Queen, Jack, then spades down to the 3.',
        'Both jokers always count as spades.',
      ],
    },
    {
      title: 'Bidding',
      items: [
        'Partners sit across from each other. Every player bids before every hand.',
        `Bids are whole numbers from 0 to ${r.maxBid}. Each team must bid at least ${r.minTeamBid} books combined.`,
        'No nil, no blind nil, no Boston, no special bid bonuses.',
        'Each team chooses who enters bids in the app: the captain for both partners, or each player for themselves.',
        r.bidOrder === 'sequential'
          ? 'Bids are entered in seat order starting left of the dealer, and earlier bids are visible.'
          : 'Bids are entered at the same time and stay hidden from the other team until all four are locked.',
      ],
    },
    {
      title: 'Play',
      items: [
        'The player to the left of the dealer leads. The deal rotates clockwise every hand.',
        'Follow suit when you can. Spades cannot be led until broken, unless you only hold spades.',
        'The highest spade wins a trick with a spade in it. Otherwise the highest card of the suit led wins.',
      ],
    },
    {
      title: 'Scoring',
      items: [
        `Make your bid: ${r.pointsPerBook} points per book bid plus ${r.bagValue} point for each extra book (bag).`,
        `Get set: lose ${r.pointsPerBook} points per book bid. No bag points on a set.`,
        `Every ${r.bagLimit} bags costs ${r.bagPenalty} points. Leftover bags carry over.`,
        'Example: bid 5, win 7 = +52 and 2 bags. Bid 5, win 4 = minus 50.',
        'Both captains report books after every hand. The 13 books must add up and both reports must match.',
      ],
    },
    {
      title: 'Winning a Match',
      items: [
        `Opening rounds play to ${r.targetDefault}. The championship plays to ${r.targetFinal}.`,
        `Time limit: ${r.timeDefaultMin} minutes for opening rounds and semifinals, ${r.timeFinalMin} minutes for the championship.`,
        'The target is checked only after a hand is officially verified. If both teams pass it, the higher score wins.',
        'When time runs out, the hand in progress is finished and the higher score wins.',
        'Tied? Tiebreaker hands are played until one team leads.',
        ...(r.gamesToWin > 1 ? [`Series: first team to win ${r.gamesToWin} games takes the match. Scores and bags reset every game.`] : []),
      ],
    },
    {
      title: 'Reneges and Disputes',
      items: [
        'Suspected reneges are flagged in the app and reviewed by a table supervisor. An accusation alone changes nothing.',
        'A confirmed renege: the offending team loses its bid points, the other team scores 10 per book it bid, and no bags are awarded that hand.',
        'Supervisor and director rulings are final and every ruling is recorded.',
      ],
    },
    {
      title: 'House Rules',
      items: [
        'No gambling, betting, side bets, or wagering of any kind is permitted.',
        'Registration is free. The championship trophy is recognition only.',
      ],
    },
  ]
}
