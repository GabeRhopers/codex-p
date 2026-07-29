# Season's Battle — Standard Mode Rules Specification (MVP)

This is the formal, implementation-facing transcription of the *Season's Battle*
tabletop rulebook, scoped to **Standard Mode only** for the MVP. Section numbers
(`§N`) refer to the original rulebook. Where the rulebook is ambiguous, the
ruling is called out explicitly and implemented as a named flag in
`src/game/rules.config.ts` rather than hardcoded logic — so a future errata or
house-rule change is a one-line edit, not a code hunt.

Advanced Mode (6 lanes, 2 Titans, Seasonal Advantage) and the Digital MVP fixed
system-deck format are **out of scope** for this document; they extend this
spec later without changing it.

## 1. Board model

- 5 battlefield lanes per side (§10), indexed `0..4`.
- "Opposite" (§15) = same lane index on the opponent's side.
- "Adjacent side positions" = index ± 1 on the *attacker's own* side mapped to
  the corresponding opposite-side indices for Range 2/3 targeting.
- A Normal card (§5) occupies exactly one lane index.
- A Titan (§5) occupies two adjacent lane indices as one logical unit, but
  each of its two indices is independently targetable for range-resolution
  purposes (feeds into Ruling 1 below).

## 2. Deck & setup (§9–§11)

- Exactly 10 cards per deck, no duplicates, ≤1 Titan, ≤3 special-ability cards.
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
  separately to every occupied lane included in the pattern (§17) — see
  Ruling 1 for how this interacts with Titans.

## 5. Damage & destruction (§16, §22–§23)

- Damage reduces Shield first. Defense Mode caps incoming damage at 1
  regardless of Attack value or Seasonal Advantage (§18) — N/A in Standard
  Mode since Seasonal Advantage is Advanced-only.
- A card at 0 Shield is **not** destroyed automatically — see Ruling 2.
- On destruction: remove the card, award elimination points (1 Normal / 2
  Titan), replace immediately from the bench at no move cost; the
  replacement cannot act until its controller's next turn (§22). If no bench
  card is available, the lane stays empty.

## 6. Defense Mode (§18)

- Costs 1 move to enter, 1 move to leave (never both in the same turn for the
  same card, since a card can't perform two moves).
- While defending: takes at most 1 damage per attack, cannot attack, cannot
  activate abilities unless the ability explicitly works while defending.

## 7. Position changes (§19)

- Costs 1 move. A Normal card may swap with one adjacent friendly Normal
  card. A Titan moves as a unit and must remain in two adjacent lanes.
  Moving forfeits any other action for that card this turn.

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
  destroyed, 2 per Titan.

---

## Rulings on rulebook ambiguities (implemented as config flags)

These are genuine gaps in the printed rulebook. Each becomes a named constant
in `src/game/rules.config.ts`. Defaults below are proposed and can be flipped
at any time — including after the MVP ships — without touching game logic.

### Ruling 1 — `titanMultiHitOnOverlap = true`

**Question:** if a Range 2/3 attack's pattern includes *both* lanes a Titan
occupies, does the Titan take the attacker's Attack value once, or twice
(once per occupied lane in the pattern)?

**Default:** `true` — twice, per the literal reading of §17 ("the full
Attack value is applied separately to every occupied position included in
the attack pattern"). This is flagged because it's a significant balance
lever (it makes wide-Range attackers strong anti-Titan tools); Phase 5's
automated balance pass will surface whether this needs to flip to `false`
(Titan takes the hit once per attack, regardless of overlap).

### Ruling 2 — `brokenStateRequiresFollowUpHit = true`

**Question:** how is "0 Shield but not destroyed" (§16) represented, and what
does it take to actually destroy the card?

**Default:** `true` — a card at 0 Shield gets an explicit `broken: true`
flag, distinct from `shield === 0` being merely a transient value. While
`broken`, *any* subsequent damage instance of any size — including the
1-damage cap from attacking a Defense-Mode card — destroys it. This is
always `true` in Standard Mode (it's a literal restatement of §16, not
really a house rule); it's still a named flag so it's visible and testable
rather than implicit.

### Ruling 3 — Lane/opposite model for Titans

**Question:** for range purposes, is a Titan one lane-identity or two?

**Default:** two independently-targetable positions sharing one card
instance (see §1 above). This is the model Ruling 1's flag operates on —
if `titanMultiHitOnOverlap` is flipped to `false`, the engine still tracks
both positions for adjacency/range math, it just dedupes damage instances
against the shared card instance before applying them.

### Ruling 4 — `attackFloor = 1`, `shieldFloor = 0`

**Question:** can an ability reduce Attack or Shield below a sane minimum?

**Default:** Attack dice never go below 1, Shield dice never go below 0 via
ability effects. Configurable per-ability in card data if a future card
needs an explicit exception (none do in the MVP roster).
