// Computer players for practice spades, plus the plain English reasons learn
// mode shows. The same logic plays the computer seats and suggests moves to
// the person playing, so every hint is something a bot would actually do.
//
// Bots only look at what a real player could know: their own cards, the bids,
// and the cards already played this hand. Imported by node:test too, so only
// erasable TypeScript.

import {
  beats, cardName, cardRank, cardSuit, isNilBid, isSpade, legalCards, makeDeck, ruleSet, seatSide, sideSeats,
  suitName, suitSingular, trickWinner, type PlayedCard, type PracticeGame, type RuleSet, type Suit, type TrickRecord,
} from './cardgame.ts'

export interface Advice { bid: number; nil: boolean; reason: string }
export interface PlayAdvice { card: string; reason: string }

const SIDE_SUITS: Suit[] = ['H', 'D', 'C']

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// Every spade in the deck, highest first.
function spadeOrder(rs: RuleSet): string[] {
  return makeDeck(rs).filter(isSpade).sort((x, y) => cardRank(y, rs) - cardRank(x, rs))
}

// ---------- bidding ----------

export function botBid(g: PracticeGame, seat: number): Advice {
  const rs = ruleSet(g.rules)
  const hand = g.hands[seat]
  const spades = hand.filter(isSpade).sort((x, y) => cardRank(y, rs) - cardRank(x, rs))
  const order = spadeOrder(rs)
  const reasons: string[] = []

  // A top spade is a likely book when you hold enough spades under it to
  // protect it: the 2nd highest spade needs 2 spades, the 3rd needs 3, etc.
  const sure = spades.filter(c => order.indexOf(c) < spades.length)
  if (sure.length) reasons.push(`${joinList(sure.map(cardName))} should win`)
  const length = Math.max(0, spades.length - sure.length - 3)
  if (length) reasons.push(`${spades.length} spades gives you about ${length} more from length`)
  let est = sure.length + length

  let side = 0
  const sideCards: string[] = []
  for (const s of SIDE_SUITS) {
    const cards = hand.filter(c => cardSuit(c) === s)
    const hasA = cards.some(c => c[0] === 'A')
    const hasK = cards.some(c => c[0] === 'K')
    if (hasA && cards.length <= 6) { side += 1; sideCards.push(`Ace of ${suitName(s)}`) }
    if (hasK && cards.length >= 2 && cards.length <= 5) {
      side += hasA ? 1 : 0.5
      sideCards.push(`King of ${suitName(s)}${hasA ? '' : ' (maybe)'}`)
    }
  }
  if (sideCards.length) reasons.push(`${joinList(sideCards)} can take books`)
  est += side

  // Short side suits let you trump in with spades you have not counted yet.
  let spare = spades.length - sure.length - length
  let ruffs = 0
  const shortNotes: string[] = []
  for (const s of SIDE_SUITS) {
    const n = hand.filter(c => cardSuit(c) === s).length
    if (n === 0 && spare >= 1) { ruffs += 1; spare -= 1; shortNotes.push(`no ${suitName(s)}`) }
    else if (n === 1 && spare >= 2) { ruffs += 0.5; spare -= 1; shortNotes.push(`one ${suitName(s).replace(/s$/, '')}`) }
  }
  if (shortNotes.length) reasons.push(`${joinList(shortNotes)}, so you can trump in`)
  est += ruffs

  const partner = (seat + 2) % 4
  const partnerBid = g.bids[partner]
  const highSide = hand.some(c => !isSpade(c) && cardRank(c, rs) >= 13)
  const highSpade = spades.some(c => cardRank(c, rs) >= 11)
  if (rs.nil && est < 1 && spades.length <= 3 && !highSpade && !highSide && partnerBid !== 0) {
    return { bid: 0, nil: true, reason: 'Nil: no high cards and only a few low spades. Try to take zero books. Your partner will try to cover you.' }
  }

  let bid = Math.max(rs.nil ? 1 : 0, Math.round(est))
  // Keep the team total at 13 or less.
  if (partnerBid !== null && partnerBid !== undefined) bid = Math.min(bid, 13 - partnerBid)
  bid = Math.max(0, Math.min(13, bid))
  const why = reasons.length ? `${reasons.join('. ')}.` : 'No sure books in this hand.'
  return { bid, nil: false, reason: `${why} Count about ${bid}.` }
}

// ---------- play ----------

// Cards this seat has not seen yet: not in their hand and not played this hand.
function unseenCards(g: PracticeGame, seat: number): string[] {
  const rs = ruleSet(g.rules)
  const seen = new Set<string>([...g.hands[seat], ...g.trick.map(p => p.card)])
  for (const t of g.tricks) for (const p of t.cards) seen.add(p.card)
  return makeDeck(rs).filter(c => !seen.has(c))
}

// No unseen card of the same suit is higher.
function isBoss(card: string, unseen: string[], rs: RuleSet): boolean {
  const s = cardSuit(card)
  const r = cardRank(card, rs)
  return !unseen.some(c => cardSuit(c) === s && cardRank(c, rs) > r)
}

// Sort key for "how much is this card worth keeping": spades above everything.
function value(card: string, rs: RuleSet): number {
  return cardRank(card, rs) + (isSpade(card) ? 20 : 0)
}

function lowest(cards: string[], rs: RuleSet): string {
  return [...cards].sort((x, y) => value(x, rs) - value(y, rs))[0]
}

function highest(cards: string[], rs: RuleSet): string {
  return [...cards].sort((x, y) => value(y, rs) - value(x, rs))[0]
}

// Lowest card from the longest side suit in `cards`.
function lowFromLongest(cards: string[], hand: string[], rs: RuleSet): string {
  const side = cards.filter(c => !isSpade(c))
  if (!side.length) return lowest(cards, rs)
  const len = (c: string) => hand.filter(h => cardSuit(h) === cardSuit(c)).length
  return [...side].sort((x, y) => len(y) - len(x) || cardRank(x, rs) - cardRank(y, rs))[0]
}

// How many more books this seat's team still needs. Infinity on a hand that
// bids itself (every book counts).
function booksNeeded(g: PracticeGame, seat: number): number {
  if (g.bidItself) return Infinity
  const seats = sideSeats(seatSide(seat)).filter(s => !isNilBid(g, s))
  const bid = seats.reduce((t, s) => t + (g.bids[s] ?? 0), 0)
  const got = seats.reduce((t, s) => t + g.won[s], 0)
  return bid - got
}

export function botPlay(g: PracticeGame, seat: number): PlayAdvice {
  const rs = ruleSet(g.rules)
  const legal = legalCards(g, seat)
  const hand = g.hands[seat]
  if (legal.length === 1) {
    return { card: legal[0], reason: g.trick.length && cardSuit(legal[0]) === cardSuit(g.trick[0].card) ? `The ${cardName(legal[0])} is your only ${suitName(cardSuit(legal[0]))}, so it has to be played.` : 'This is the only card you are allowed to play.' }
  }
  const unseen = unseenCards(g, seat)
  const partner = (seat + 2) % 4
  const meNil = isNilBid(g, seat)
  const partnerNil = isNilBid(g, partner)
  const need = booksNeeded(g, seat)
  const avoidBags = rs.bags && need <= 0 && !meNil

  // ---- leading ----
  if (!g.trick.length) {
    if (meNil) {
      const c = lowFromLongest(legal, hand, rs)
      return { card: c, reason: 'You bid nil, so lead a low card and let someone else win the trick.' }
    }
    if (avoidBags) {
      return { card: lowest(legal, rs), reason: 'Your team already made its bid. Extra books turn into bags, so lead low.' }
    }
    const boss = legal.filter(c => !isSpade(c) && isBoss(c, unseen, rs))
    if (boss.length) {
      const c = highest(boss, rs)
      return { card: c, reason: `The ${cardName(c)} is the highest ${suitSingular(cardSuit(c))} left, so it should win the book.` }
    }
    const bossSpade = legal.filter(c => isSpade(c) && isBoss(c, unseen, rs))
    if (bossSpade.length && need > 0) {
      const c = highest(bossSpade, rs)
      return { card: c, reason: `The ${cardName(c)} is the highest spade left. Leading it wins a book and pulls spades out of the other hands.` }
    }
    const c = lowFromLongest(legal, hand, rs)
    return { card: c, reason: isSpade(c) ? 'Only spades left. Lead your lowest one.' : `Lead a low ${suitName(cardSuit(c)).replace(/s$/, '')} from your longest suit and save your high cards for later.` }
  }

  // ---- following ----
  const led = cardSuit(g.trick[0].card)
  const current = trickWinner(g.trick, rs)!
  const last = g.trick.length === 3
  const partnerWinning = current.seat === partner
  const winners = legal.filter(c => beats(c, current.card, led, rs))
  const losers = legal.filter(c => !beats(c, current.card, led, rs))
  const following = cardSuit(legal[0]) === led
  const offSuit = following ? '' : `You are out of ${suitName(led)}. `

  if (meNil) {
    if (losers.length) {
      const c = highest(losers, rs)
      return { card: c, reason: `You bid nil. ${offSuit}Get rid of the ${cardName(c)}: it is your highest card that still loses this trick.` }
    }
    return { card: lowest(winners, rs), reason: 'You bid nil but every card you can play wins this trick. Play your lowest and hope someone beats it.' }
  }

  if (partnerNil && partnerWinning && winners.length) {
    const c = last ? winners.sort((x, y) => value(x, rs) - value(y, rs))[0] : highest(winners, rs)
    return { card: c, reason: 'Your partner bid nil and is winning this trick. Take it away from them.' }
  }

  if (partnerWinning) {
    const safe = last || isBoss(current.card, unseen, rs)
    if (safe) {
      const c = lowest(losers.length ? losers : legal, rs)
      return { card: c, reason: `${offSuit}Your partner is winning this trick, so play low and save your good cards.` }
    }
  }

  if (avoidBags && losers.length) {
    const c = highest(losers, rs)
    return { card: c, reason: `${offSuit}Your team already made its bid. Play a card that loses so you do not pick up bags.` }
  }

  if (winners.length) {
    const lowWin = [...winners].sort((x, y) => value(x, rs) - value(y, rs))[0]
    if (last) {
      return { card: lowWin, reason: `${offSuit}You play last, so the ${cardName(lowWin)} is the cheapest card that wins the book.` }
    }
    if (following) {
      const top = highest(winners, rs)
      if (isBoss(top, unseen, rs)) {
        return { card: top, reason: `The ${cardName(top)} is the highest ${suitSingular(led)} left, so nobody can beat it unless they trump.` }
      }
      if (g.trick.length === 1 && losers.length) {
        const c = lowest(losers, rs)
        return { card: c, reason: 'Second to play: go low. Your partner still plays after the other team and can win it.' }
      }
      return { card: lowWin, reason: `The ${cardName(lowWin)} is your lowest card that wins this trick right now.` }
    }
    // Trumping in.
    return { card: lowWin, reason: `${offSuit}Trump it with the ${cardName(lowWin)}, your lowest spade that wins.` }
  }

  const c = lowest(legal, rs)
  return { card: c, reason: `${offSuit}You cannot win this trick, so throw your lowest card.` }
}

// ---------- explanations ----------

// One line on why a finished trick went the way it did.
export function explainTrick(cards: PlayedCard[], rs: RuleSet, names: string[]): string {
  const w = trickWinner(cards, rs)
  if (!w) return ''
  const led = cardSuit(cards[0].card)
  const who = names[w.seat]
  const verb = who === 'You' ? 'win' : 'wins'
  if (w.card === 'BJ') return `${who} ${verb} with the Big Joker, the highest card in the deck.`
  if (w.card === 'LJ') return `${who} ${verb} with the Little Joker. Only the Big Joker beats it.`
  if (rs.jokers && w.card === '2S') return `${who} ${verb} with the 2 of spades. In house rules it is the 3rd highest card, under the two jokers.`
  const spades = cards.filter(p => isSpade(p.card)).length
  if (isSpade(w.card) && led !== 'S') {
    return spades > 1
      ? `${who} ${verb} with the ${cardName(w.card)}, the highest spade played. Spades beat every other suit.`
      : `${who} trumped with the ${cardName(w.card)}. Any spade beats the other suits.`
  }
  if (led === 'S') return `${who} ${verb} with the ${cardName(w.card)}, the highest spade played.`
  return `${who} ${verb} with the ${cardName(w.card)}, the highest ${suitSingular(led)} played. Nobody trumped.`
}

export function lastTrick(g: PracticeGame): TrickRecord | null {
  return g.tricks[g.tricks.length - 1] || null
}
