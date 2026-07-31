# Season's Battle — Normal Mode Rules Specification (MVP)

This is the formal, implementation-facing transcription of the *Season's Battle*
tabletop rulebook, scoped to **Normal Mode only** for the MVP. Section numbers
(`§N`) refer to the original rulebook. Where the rulebook is ambiguous, the
ruling is called out explicitly and implemented as a named flag in
`src/game/rules.config.ts` rather than hardcoded logic — so a future errata or
house-rule change is a one-line edit, not a code hunt.

**Advanced Mode — Titans and Seasonal Advantage — is out of scope for this
document**, and for the current build: no starter deck contains a Titan, and
Seasonal Advantage isn't implemented. Both are planned as a bundled future
mode; see [Advanced Mode (planned)](#advanced-mode-planned) at the end of
this document. That section isn't a stub — the Titan mechanics it describes
are fully implemented and tested against synthetic fixtures
(`tests/game/*.test.ts`), just currently unreachable through real content.
Advanced Mode extends this spec later without changing it.

## 1. Board model

- 5 battlefield lanes per side (§10), indexed `0..4`.
- "Opposite" (§15) = same lane index on the opponent's side.
- "Adjacent side positions" = index ± 1 on the *attacker's own* side mapped to
  the corresponding opposite-side indices for Range 2/3 targeting.
- Every card (§5) occupies exactly one lane index in Normal Mode.

## 2. Deck & setup (§9–§11)

- Exactly 10 cards per deck, no duplicates, ≤3 special-ability cards. Normal
  Mode decks contain no Titans (§9.3's ≤1-Titan cap is trivially satisfied by
  0 — see Advanced Mode for when that cap starts to matter).
- MVP ships 2 fixed pre-built starter decks (no custom deckbuilder — see
  project plan Phase 2).
- Starting player determined by a die roll (tie → reroll); the first player
  may not attack on their first turn (§11) but may still move, toggle Defense
  Mode, or activate an eligible ability.

## 3. Turn structure (§12–§13)

- 2 moves per turn. The same card may not perform two separate moves in one
  turn (this includes the first turn).
- At most 1 attack per turn, regardless of remaining move budget.
- Replacing a destroyed card from the bench does not cost a move (§13, §22).
- A move is one of: Attack, Enter Defense Mode, Leave Defense Mode, Change
  Position, Activate Ability (§13). Mind Control is the sole exception,
  costing both moves as one action (§21).

## 4. Range & targeting (§15, §17)

- Range 1: opposite lane, or one adjacent side lane (attacker's choice of
  side).
- Range 2: opposite lane + one adjacent side lane (attacker's choice of
  side).
- Range 3: opposite lane + both adjacent side lanes.
- Only occupied lanes take damage; edge lanes have fewer valid targets.
- Multi-target attacks apply the attacker's full current Attack value
  separately to every occupied lane included in the pattern (§17).

## 5. Damage & destruction (§16, §22)

- Damage reduces Shield first. Defense Mode caps incoming damage at 1
  regardless of Attack value or Seasonal Advantage (§18) — N/A in Normal
  Mode since Seasonal Advantage is Advanced-only.
- A card at 0 Shield is **not** destroyed automatically — see Ruling 2.
- On destruction: remove the card, award 1 elimination point to its owner's
  opponent, replace immediately from the bench at no move cost; the
  replacement cannot act until its controller's next turn (§22). If no bench
  card is available, the lane stays empty.

## 6. Defense Mode (§18)

- Costs 1 move to enter, 1 move to leave (never both in the same turn for the
  same card, since a card can't perform two moves).
- While defending: takes at most 1 damage per attack, cannot attack, cannot
  activate abilities unless the ability explicitly works while defending.

## 7. Position changes (§19)

- Costs 1 move. A Normal card may swap with one adjacent friendly Normal
  card. Moving forfeits any other action for that card this turn.

## 8. Abilities & Mind Control (§20–§21)

- Activating an ability costs 1 move and replaces that card's attack for the
  turn (a card cannot attack and activate an ability in the same turn).
- Ability effects are permanent (reflected by adjusting the Attack/Shield
  dice), unless the card text says otherwise — card text always wins over
  these general rules (§20, §28).
- Mind Control costs both moves as a single action; after it resolves, the
  player has no moves left this turn (§21).

## 9. Victory (§2, §24)

- First to 5 elimination points wins immediately. 1 point per Normal card
  destroyed.

---

## Rulings on rulebook ambiguities (implemented as config flags)

These are genuine gaps in the printed rulebook. Each becomes a named constant
in `src/game/rules.config.ts`. Defaults below are proposed and can be flipped
at any time — including after the MVP ships — without touching game logic.

### Ruling 2 — `brokenStateRequiresFollowUpHit = true`

**Question:** how is "0 Shield but not destroyed" (§16) represented, and what
does it take to actually destroy the card?

**Default:** `true` — a card at 0 Shield gets an explicit `broken: true`
flag, distinct from `shield === 0` being merely a transient value. While
`broken`, *any* subsequent damage instance of any size — including the
1-damage cap from attacking a Defense-Mode card — destroys it. This is
always `true` in Normal Mode (it's a literal restatement of §16, not
really a house rule); it's still a named flag so it's visible and testable
rather than implicit.

### Ruling 4 — `attackFloor = 1`, `shieldFloor = 0`

**Question:** can an ability reduce Attack or Shield below a sane minimum?

**Default:** Attack dice never go below 1, Shield dice never go below 0 via
ability effects. Configurable per-ability in card data if a future card
needs an explicit exception (none do in the MVP roster).

---

## Advanced Mode (planned)

Everything below is **not part of Normal Mode** and isn't reachable through
either current starter deck — no Normal Mode deck contains a Titan. It's kept
here, fully implemented and tested against synthetic fixtures rather than
real content, because Advanced Mode is additive: it bundles Titans with
Seasonal Advantage on top of everything above, not a different ruleset.

### Titans — board model and destruction

- A Titan (§5) occupies two adjacent lane indices as one logical unit, but
  each of its two indices is independently targetable for range-resolution
  purposes (feeds into Ruling 1 below).
- Destroying a Titan awards 2 elimination points instead of a Normal card's 1
  (§2, §24).
- Deck legality caps a deck at ≤1 Titan (§9.3) — enforced today, just
  trivially satisfied since Normal Mode decks contain 0.

### Ruling 1 — `titanMultiHitOnOverlap = true`

**Question:** if a Range 2/3 attack's pattern includes *both* lanes a Titan
occupies, does the Titan take the attacker's Attack value once, or twice
(once per occupied lane in the pattern)?

**Default:** `true` — twice, per the literal reading of §17 ("the full
Attack value is applied separately to every occupied position included in
the attack pattern"). This is flagged because it's a significant balance
lever (it makes wide-Range attackers strong anti-Titan tools); a future
automated balance pass will surface whether this needs to flip to `false`
(Titan takes the hit once per attack, regardless of overlap).

### Ruling 3 — Lane/opposite model for Titans

**Question:** for range purposes, is a Titan one lane-identity or two?

**Default:** two independently-targetable positions sharing one card
instance. This is the model Ruling 1's flag operates on — if
`titanMultiHitOnOverlap` is flipped to `false`, the engine still tracks
both positions for adjacency/range math, it just dedupes damage instances
against the shared card instance before applying them.

### Ruling 5 — `titanMoveDisplacesOccupant = true`

**Question:** §19 grants a Normal card a swap with one adjacent friendly
Normal card when it changes position, but says nothing about what happens
when a move would put a Titan and a Normal card in each other's way — in
either direction.

**Default:** `true` — displacement, both directions, both built on the same
single operation (`applyTitanShove` in `src/game/moves.ts`): a Titan steps
one lane, claiming a new lane and vacating its old one, and whatever
occupied the newly-claimed lane is relocated into the lane just vacated.
That's always a closed 1-for-1 trade — the Titan's footprint size never
changes, and §9.3 caps a deck at 1 Titan so the occupant is always a single
Normal card that always fits the one vacated lane — so it never depends on
anything further down the board, and the only way it fails is the Titan
itself running off the edge of the board.

- A Titan's own move calls this directly, extending the same swap concept
  §19 already gives Normal cards across the Titan's two-lane footprint.
  The alternative reading (`false`: the destination must be strictly
  empty) was the MVP's original, untested assumption, and it makes Titan
  movement effectively dead for most of a match — a standard 5-lane
  starting board has no empty lanes at all, and a destroyed card is
  normally replaced from the bench immediately (§22) rather than leaving
  its lane empty, so a strictly-empty-only Titan can only ever move after
  its controller's bench is fully exhausted.
- Symmetrically, a Normal card's move can push an adjacent Titan too —
  implemented as the exact same operation, just triggered from the Normal
  card's Move button with the Titan stepping in the *opposite* direction
  (toward, and then past, the mover's own lane). That direction is
  provably always the mover's own lane landing in the Titan's
  newly-vacated spot: three already-valid, already-adjacent lanes (the
  Titan's two occupied lanes plus the mover's) simply rotate one step, so
  it can never fail on bounds either, and it never needs to look past the
  Titan's own two lanes for room. Reused directly by the UI (`Board.tsx`'s
  `canSlide`) so button visibility and actual move legality can never
  drift apart.

### Seasonal Advantage

Not yet specified in implementation terms — genuinely deferred, unlike the
Titan mechanics above. Season is currently pure flavor (card theming, no
combat effect) in both Normal and (once built) Advanced Mode until this is
designed.
