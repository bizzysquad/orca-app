# Spades HQ (orcafin.app/spades)

A live tournament manager for in-person Joker Spades. Players use real cards at real tables. The app handles registration, private sign-in, bids, book reports, scoring, disputes and the bracket. There is no betting, payment or wagering anywhere in it.

## Setup (one time)

1. Run `supabase-migration-spades.sql` in the Supabase SQL editor. It only creates new `sp_*` tables and is safe to run more than once. It also creates the inaugural event (`dj-maskoff-rnb-spades-2026`) with 4 tables and marks it as the main `/spades` event.
2. Environment variables. No new ones are required:
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: already set for ORCA.
   - Director password: `SPADES_DIRECTOR_PASSWORD` if set, otherwise it falls back to `RSVP_OWNER_PASSWORD`. Set a dedicated one in Vercel if you want them separate.
3. Deploy ORCA as usual (see DEPLOY.md / the ORCA deploy flow).

## Routes

| Route | Who | What |
|---|---|---|
| `/spades` | everyone | Event page, live tables, bracket |
| `/spades/register` | everyone | Team sign-up (lands as pending or waitlist; the director approves) |
| `/spades/join#<token>` | invited player or staff | Confirms identity, signs in one phone |
| `/spades/play` | players | Their team, current match, bid and book entry |
| `/spades/match/[id]` | everyone (redacted by role) | Full match, hand history, staff tools |
| `/spades/bracket` | everyone | Live bracket |
| `/spades/supervisor` | staff | Every table at a glance, check-in |
| `/spades/admin` | director | Teams, invitations, staff, bracket, rules, disputes, audit, exports |
| `/spades/display` | TV / projector | Read-only big-screen view |
| `/spades/rules` | everyone | Official rules |
| `/spades/print` | staff | Paper scorecards and bracket backup |

Add `?t=<slug>` to any public route to view a different tournament.

## Running tonight

1. Open `/spades/admin` and sign in with the director password.
2. **Teams tab:** add the 8 teams (or approve the public sign-ups). For each team, tap **Make both invitations** and have each player scan their own QR code. Each code works once, on one phone.
3. **Staff tab (optional):** add supervisors. Each one gets a staff QR code. Assign them to tables, or leave a table on "Any supervisor".
4. Check teams in on the Teams tab or the Tables dashboard.
5. **Run tab:** tap **Lock roster and draw bracket**. Check the draw on the Bracket tab (you can redraw or set seeds by hand), then **Publish bracket**.
6. **Run tab:** tap **Start Quarterfinals**. Tables 1 to 4 are assigned automatically and the clocks start.
7. At each table, every hand goes: bids (all four must be locked) → play → both captains report books → both captains confirm. Scores update everywhere within about 2 seconds.
8. When a match completes, tap **Finalize** on the Run tab. That is the only way a winner advances. Then start the Semifinals, then the Championship.
9. Put `/spades/display` on the TV.

**Lost phone or new device:** Teams tab, then **New link** next to the player. Their old phone is signed out and the old link stops working.
**Replacing a player before their first match:** edit the team. The old person's link and session stop working, so issue a new invitation.
**Wifi down:** print scorecards from the Export tab. A supervisor enters the hands afterwards on the match page, using "Enter a bid for a player" and "Enter books for both captains".

## Rules engine defaults (editable on the Settings tab)

- Joker deck (54 cards, minus the 2 of hearts and 2 of diamonds). Trump order: Big Joker, Little Joker, 2♠, A♠ … 3♠.
- Bids from 0 to 13 every hand, at least 4 per team, no nil or blind nil.
- Made bid: 10 per book bid plus 1 per bag. Set: minus 10 per book bid. Every 10 bags costs 100 and the remainder carries over.
- Confirmed renege: the offender loses its bid points, the other team scores 10 per book it bid, and nobody earns bags that hand.
- Opening rounds play to 250 in 50 minutes. The championship plays to 350 in 70 minutes. At time, the hand in progress is finished and the higher score wins. A tie means tiebreaker hands are played.
- Bidding mode (individual or captain) and bid order (simultaneous or sequential) are snapshotted onto each match when it starts.

## Architecture

- **Code:** `src/lib/spades/` holds all the logic. `service.ts` handles every write and permission check, `views.ts` handles the reads and redaction, `scoring.ts` and `bracket.ts` are pure math, and `store.ts` is the storage interface. `src/app/api/spades/*` is a thin HTTP layer and `src/app/spades/*` is the UI.
- **Database:** every `sp_*` table has RLS on with no policies, and anon/authenticated grants are revoked, so browsers cannot touch the tables directly. Only the server, using the service role key, can. Unique indexes enforce one open hand per match, one active bid per player per hand, one active report per team per hand, one approval per team, and unique hand numbers. Check constraints enforce bids of 0 to 13, books totalling 13, and valid status values. `sp_audit` is append-only (a trigger blocks UPDATE and DELETE).
- **Scoring:** official totals are never typed in. They are recomputed from verified hands each time a hand changes, so a retry can't double-count, and correcting an early hand recalculates every later one. Corrections to a finalized match require the director and are blocked if the next match has already started.
- **Auth:** invitation tokens are 256-bit, single-use, expire after 72 hours, and only their SHA-256 hash is stored. The token sits in the URL fragment so it never appears in server logs. Redeeming one creates a revocable server session (an httpOnly cookie). Director login is password-based and rate-limited. Supervisors only act on their assigned tables, or on unassigned ones.
- **Live updates:** every screen polls `/api/spades/pulse` every 2 seconds and refetches when it changes, plus a full refresh every 20 seconds. It shows an offline banner and never resubmits a tap on its own. Stale submissions (for example, an old hand after reconnecting) are rejected with a 409.

## Tests

`npm run test:spades` runs 33 tests on Node's built-in test runner against an in-memory store that mirrors the DB's unique constraints. They exercise the same service code the API uses, including a complete 8-team tournament from registration to champion.
