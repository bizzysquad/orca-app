import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStore } from '../../src/lib/spades/store.ts'
import { act, createTable, getView, joinTable, LIVE_TABLE, TRICK_MS, BOT_MS, type LiveView } from '../../src/lib/spades/live.ts'
import { botBid, botPlay } from '../../src/lib/spades/bots.ts'
import { SpadesError } from '../../src/lib/spades/service.ts'

async function rejects(p: Promise<unknown>, status: number, re?: RegExp) {
  await assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof SpadesError, String(e))
    assert.equal(e.status, status, e.message)
    if (re) assert.match(e.message, re)
    return true
  })
}

async function table(s: MemoryStore) {
  const host = await createTable(s, { name: 'Hero', rules: 'house', gamesToWin: 1 })
  const friend = await joinTable(s, host.view.code, { name: 'Kim', seat: 2 })
  return { code: host.view.code, host: host.token, friend: friend.token }
}

// Each person plays what learn mode would suggest; the clock moves so the
// computer seats take their turns.
async function playUntil(s: MemoryStore, code: string, tokens: string[], done: (v: LiveView) => boolean) {
  for (let i = 0; i < 3000; i++) {
    const views = await Promise.all(tokens.map(t => getView(s, code, t)))
    if (done(views[0])) return views[0]
    let moved = false
    for (let k = 0; k < tokens.length; k++) {
      const v = views[k]
      const g = v.game
      if (!g || v.you === null) continue
      if (g.phase === 'handover' && k === 0 && !g.matchWinner) { await act(s, code, tokens[k], { action: 'next' }); moved = true; break }
      if (g.turn !== v.you || g.trick.length === 4) continue
      if (g.phase === 'bidding') await act(s, code, tokens[k], { action: 'bid', bid: botBid(g, v.you).bid })
      else await act(s, code, tokens[k], { action: 'play', card: botPlay(g, v.you).card })
      moved = true
      break
    }
    if (!moved) s.advance(Math.max(BOT_MS, TRICK_MS))
  }
  throw new Error('never reached the expected state')
}

test('create a table: host in seat 1, code to share, lobby', async () => {
  const s = new MemoryStore()
  const { token, view } = await createTable(s, { name: '  Hero ', rules: 'standard', gamesToWin: 2 })
  assert.match(view.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  assert.ok(token.length > 20)
  assert.equal(view.status, 'lobby')
  assert.equal(view.you, 0)
  assert.equal(view.isHost, true)
  assert.equal(view.seats[0].name, 'Hero')
  assert.deepEqual(view.settings, { rules: 'standard', gamesToWin: 2 })
  // Only the hash is stored.
  assert.ok(!JSON.stringify(s.tables[LIVE_TABLE]).includes(token))
  await rejects(createTable(s, { name: '   ' }), 400)
})

test('join: pick an open seat, no double booking, bad codes are 404', async () => {
  const s = new MemoryStore()
  const { code } = await table(s)
  await rejects(joinTable(s, code, { name: 'Lee', seat: 2 }), 409, /took that seat/)
  await rejects(joinTable(s, code, { name: 'kim', seat: 1 }), 409, /same name|already has that name/)
  await rejects(joinTable(s, 'AAAA-AAAA', { name: 'Lee', seat: 1 }), 404)
  await rejects(joinTable(s, 'nope', { name: 'Lee', seat: 1 }), 404)
  const lee = await joinTable(s, code.replace('-', '').toLowerCase(), { name: 'Lee', seat: 1 })
  assert.equal(lee.view.you, 1)
  // Rejoining with your token gives your seat back instead of a new one.
  const again = await joinTable(s, code, { token: lee.token, name: 'whatever', seat: 3 })
  assert.equal(again.view.you, 1)
})

test('lobby controls: only the host fills, clears and starts; players can switch seats', async () => {
  const s = new MemoryStore()
  const { code, host, friend } = await table(s)
  await rejects(act(s, code, friend, { action: 'start' }), 403)
  await rejects(act(s, code, friend, { action: 'fill', seat: 1 }), 403)
  await rejects(act(s, code, 'not-a-token', { action: 'start' }), 403)
  let v = (await act(s, code, friend, { action: 'seat', seat: 3 }))!
  assert.equal(v.you, 3)
  assert.equal(v.seats[2].kind, 'open')
  v = (await act(s, code, host, { action: 'fill', seat: 1 }))!
  assert.equal(v.seats[1].kind, 'bot')
  v = (await act(s, code, host, { action: 'clear', seat: 1 }))!
  assert.equal(v.seats[1].kind, 'open')
  v = (await act(s, code, host, { action: 'start' }))!
  assert.equal(v.status, 'playing')
  assert.deepEqual(v.seats.map(x => x.kind), ['human', 'bot', 'bot', 'human'])
})

test('nobody sees another hand or the shuffle seed', async () => {
  const s = new MemoryStore()
  const { code, host, friend } = await table(s)
  await act(s, code, host, { action: 'start' })
  const hv = await getView(s, code, host)
  const fv = await getView(s, code, friend)
  const outsider = await getView(s, code, null)
  assert.equal(hv.game!.hands[0].length, 13)
  assert.deepEqual(hv.game!.hands.slice(1).map(h => h.length), [0, 0, 0])
  assert.equal(fv.game!.hands[2].length, 13)
  assert.equal(fv.game!.hands[0].length, 0)
  assert.ok(outsider.game!.hands.every(h => h.length === 0))
  assert.equal(hv.game!.seed, 0)
  assert.deepEqual(hv.handCounts, [13, 13, 13, 13])
  for (const c of hv.game!.hands[0]) assert.ok(!JSON.stringify(fv).includes(`"${c}"`) || fv.game!.tricks.length > 0)
})

test('moves are checked on the server: turn order and legal cards', async () => {
  const s = new MemoryStore()
  const { code, host, friend } = await table(s)
  await act(s, code, host, { action: 'start' })
  const v = await getView(s, code, host)
  const g = v.game!
  const other = g.turn === 0 ? friend : host
  // House first hand bids itself, so the game opens in play.
  assert.equal(g.phase, 'playing')
  await rejects(act(s, code, other, { action: 'play', card: 'AS' }), 409)
  await rejects(act(s, code, host, { action: 'bid', bid: 4 }), 409)
})

test('computer seats wait their turn, then play at a steady pace', async () => {
  const s = new MemoryStore()
  const { code, host } = await table(s)
  await act(s, code, host, { action: 'fill', seat: 1 })
  await act(s, code, host, { action: 'fill', seat: 3 })
  await act(s, code, host, { action: 'start' })
  const v0 = await getView(s, code, host)
  const firstTurn = v0.game!.turn
  if (firstTurn % 2 === 1) {
    // A computer is up: nothing happens until BOT_MS has passed.
    assert.equal((await getView(s, code, host)).game!.trick.length, 0)
    s.advance(BOT_MS)
    assert.equal((await getView(s, code, host)).game!.trick.length, 1)
  }
})

test('a full match with two people and two computers, then a rematch', async () => {
  const s = new MemoryStore()
  const { code, host, friend } = await table(s)
  await act(s, code, host, { action: 'start' })
  const end = await playUntil(s, code, [host, friend], v => v.status === 'finished')
  assert.ok(end.game!.matchWinner)
  assert.ok(end.game!.history.length >= 2)
  for (const h of end.game!.history) assert.equal(h.won.reduce((a, b) => a + b, 0), 13)
  await rejects(act(s, code, friend, { action: 'rematch' }), 403)
  const again = (await act(s, code, host, { action: 'rematch' }))!
  assert.equal(again.status, 'playing')
  assert.equal(again.game!.history.length, 0)
})

test('someone drops: host hands the seat to the computer, they take it back', async () => {
  const s = new MemoryStore()
  const { code, host, friend } = await table(s)
  await act(s, code, host, { action: 'start' })
  let v = (await act(s, code, host, { action: 'fill', seat: 2 }))!
  assert.equal(v.seats[2].kind, 'bot')
  assert.equal(v.seats[2].covered, true)
  const fv = await getView(s, code, friend)
  assert.equal(fv.you, null)
  assert.equal(fv.canReclaim, 2)
  assert.ok(fv.game!.hands.every(h => h.length === 0))
  await rejects(act(s, code, friend, { action: 'play', card: 'AS' }), 403, /Take it back/)
  // A covered seat is not open to strangers.
  await rejects(joinTable(s, code, { name: 'Lee', seat: 2 }), 409)
  v = (await act(s, code, friend, { action: 'reclaim' }))!
  assert.equal(v.you, 2)
  assert.equal(v.game!.hands[2].length > 0, true)
})

test('leaving: a player who leaves mid game frees the seat for someone new', async () => {
  const s = new MemoryStore()
  const { code, host, friend } = await table(s)
  await act(s, code, host, { action: 'start' })
  const left = await act(s, code, friend, { action: 'leave' })
  assert.equal(left!.you, null)
  const v = await getView(s, code, null)
  assert.equal(v.seats[2].kind, 'bot')
  assert.equal(v.seats[2].covered, false)
  const lee = await joinTable(s, code, { name: 'Lee', seat: 2 })
  assert.equal(lee.view.you, 2)
})

test('host closing the table deletes it', async () => {
  const s = new MemoryStore()
  const { code, host, friend } = await table(s)
  await rejects(act(s, code, friend, { action: 'end' }), 403)
  assert.equal(await act(s, code, host, { action: 'end' }), null)
  assert.equal(s.tables[LIVE_TABLE].length, 0)
  await rejects(getView(s, code, host), 404)
})

test('idle tables expire and are swept', async () => {
  const s = new MemoryStore()
  const { code, host } = await table(s)
  s.advance(6 * 60 * 60 * 1000 + 1)
  await rejects(getView(s, code, host), 404, /closed/)
  assert.equal(s.tables[LIVE_TABLE].length, 0)
  const t2 = await table(s)
  s.advance(6 * 60 * 60 * 1000 + 1)
  await createTable(s, { name: 'Next' })
  assert.equal(s.tables[LIVE_TABLE].length, 1)
  await rejects(getView(s, t2.code, t2.host), 404)
})
