# Card Balance Formula

A mathematical model for pricing a Season's Battle card's Attack, Shield,
Range, and special ability against each other on one scale, so a new card
(or a fix to an existing one) can be sanity-checked with arithmetic before
it ever needs to be simulated or playtested.

This is a **design heuristic, not a verdict**. It exists to generate good
first guesses and flag outliers quickly; `tests/balance/balanceSim.report.ts`
(the bot-vs-bot simulation, already wired into CI) remains the authority on
whether a change actually worked, exactly as that report's own header
already says of itself. Section 6 below cross-checks the formula against
that simulation's real output, and the two agree closely enough to trust the
formula for first drafts — but every recommendation in Section 7 should
still be re-simulated after applying it.

## Scope

Normal Mode only. The two Titans (`sunblade_vanguard`, `glacier_warden`) and
Seasonal Advantage belong to Advanced Mode, which is dormant, not planned
(see `RULES_SPEC.md`) — this formula doesn't cover them, and their Shield
values (8, 10) intentionally exceed the physical-dice range below.

## Physical constraint

The tabletop version represents Attack and Shield as **fixed printed
values shown on a regular six-sided die (1–6)** — not a live dice roll
during play, just using the die's 1–6 pip range as the printed number's
valid range. Every Normal-Mode card's Attack and Shield today already fits
1–6, and every recommendation below stays inside that range.

## 1. Why Range needs its own term

Range isn't reach — it's how many lanes take **full** Attack damage
simultaneously (per the in-game rules text: "damage hits every occupied
lane the attack pattern reaches, in full"). From `resolveRangePattern`
(`src/game/board.ts`):

- **Range 1** — exactly 1 lane, always.
- **Range 2** — exactly 2 lanes, always (the attacker picks whichever side
  stays on the 5-lane board, so edge position never reduces it).
- **Range 3** — 3 lanes from the 3 interior positions, only 2 from either
  edge lane. Averaged across all 5 starting positions: `(2+3+3+3+2)/5 = 2.6`.

So a card's real damage output isn't `Attack`, it's `Attack × lanes hit`.
Treating Range as a flat additive bonus (as the current roster's stat
spreads implicitly do) undercounts Range 2/3 substantially — confirmed
empirically in Section 6.

**Lane multiplier:**

| Range | Multiplier |
|---|---|
| 1 | 1.0 |
| 2 | 2.0 |
| 3 | 2.6 |

## 2. Base Combat Power (BCP)

```
BCP = Attack × LaneMultiplier(Range) + Shield
```

Attack and Shield are weighted 1:1. Shield isn't discounted relative to
Attack here — a durability point and a damage point trade off against each
other roughly evenly in this game's actual combat math (Shield directly
absorbs Attack), and the empirical check in Section 6 supports 1:1 well
enough that a fancier weighting isn't worth the complexity ("doesn't need
to be perfect").

## 3. Ability Value (AV)

A flat stat can be priced once. An ability can't — the same nominal number
is worth very different amounts depending on *how* it pays out over a
match:

- **Repeatable, uncapped, self-buff** (Empower: +1 Attack, no target, no
  ceiling, usable most turns) — compounds every turn it's used, for the
  rest of the match. The strongest shape by a wide margin.
- **Permanent single-target enemy debuff** (Scorch, Numbing Frost) — also
  compounds (every future turn that enemy card fights at reduced Attack),
  but hits a hard ceiling in this specific roster: `attackFloor = 1` means
  reducing Attack below 1 is impossible, and **9 of 20 Normal-Mode cards
  already have Attack 1**. A −1 ability and a −2 ability land identically
  against roughly 90% of the roster's real Attack distribution (1s and 2s)
  — the second point of "Numbing Frost" is close to wasted stat-sheet
  ink. Price both at the *same* AV; don't pay a premium for nominal
  magnitude the floor won't let land.
- **Capped self-heal, usable while defending** (Ward: +1 Shield, capped at
  printed max) — reliable, but bounded: it can never out-heal its own
  printed Shield, and using it at full Shield is wasted. Usable while
  turtling makes it low-risk to fit in.
- **Capped self-heal, NOT usable while defending** (Feint: +2 Shield,
  capped) — same cap as Ward, but the bigger number is undercut by a
  narrower, riskier usage window (only while exposed). Worth *less* than
  Ward here despite the larger printed number, not more.
- **Full-turn-cost effect** (Mesmerize: `costsBothMoves`) — the ability's
  own magnitude has to clear a steep bar before it's worth it, because
  spending both moves means **no attack that turn either**, and the caster
  can't retreat into Defense Mode to protect itself in the same turn it
  casts. That's a much bigger tax than "one move" — it's "every option this
  turn but this one."

| Ability shape | AV |
|---|---|
| Repeatable uncapped self-buff (Empower-type) | **+2.5** |
| Permanent single-target enemy debuff (Scorch/Numbing-Frost-type, any magnitude — the floor caps real value) | **+2.5** |
| Capped self-heal, usable while defending (Ward-type) | **+1.5** |
| Capped self-heal, not usable while defending (Feint-type) | **+1.0** |
| Full-turn-cost debuff (Mesmerize-type): raw magnitude credit minus a flat "both-moves" tax | **magnitude − 3.5** |

## 4. Total Power Score & tier budgets

```
TPS = BCP + AV
```

Commons carry no ability (`AV = 0` always, in the current roster), so a
Common's TPS is just its BCP. That average is the natural baseline:

| Tier | Target TPS |
|---|---|
| Common | ≈ 6.4 (current roster average) |
| Silver | ≈ 7.5–8 |
| Gold | ≈ 9–10 |

Silver/Gold cards paying an ability tax by shipping with lower raw BCP than
a Common is expected and fine — that's the deckbuilding trade-off (an
ability card costs one of the deck's `MAX_SPECIAL_ABILITY_CARDS = 3` slots).
The problem is only when the ability's AV doesn't buy the TPS back above the
Common baseline — that's a card that's strictly worse than just running
another Common, which defeats the point of the ability slot.

## 5. Worked table (roster *before* rebalancing)

Sorted by TPS. Titans excluded (out of Normal Mode scope, see above). This
snapshot is the roster as it stood when this formula was first applied —
it's what Sections 6-7 diagnose. `src/content/cards.ts` has since been
updated per Section 7's applied changes; this table is kept as-is so the
before/after story stays legible, not updated to match current stats.

| TPS | BCP | AV | Tier | Ability | Card |
|---|---|---|---|---|---|
| 3.50 | 3.00 | +0.5 | Gold | Mesmerize | Wild Cobra |
| 4.60 | 4.60 | — | Common | — | Dusk Stag |
| 5.00 | 4.00 | +1.0 | Silver | Feint | Shadow Fox |
| 5.00 | 5.00 | — | Common | — | Bramble Lynx |
| 5.60 | 5.60 | — | Common | — | Mist Badger |
| 6.00 | 6.00 | — | Common | — | Ember Lion / Dune Jackal / Bloom Fawn / Frost Tortoise / Nomad Tiger |
| 6.50 | 5.00 | +1.5 | Silver | Ward | Blizzard Wolf |
| 7.00 | 7.00 | — | Common | — | Ash Owl / Dawn Hare / Snow Elk / Stone Husky |
| 7.50 | 5.00 | +2.5 | Silver | Empower | Blaze Hawk |
| 8.00 | 8.00 | — | Common | — | Ice Viper |
| 9.00 | 9.00 | — | Common | — | Solar Falcon |
| 9.50 | 7.00 | +2.5 | Gold | Scorch | Scorch Boar |
| 9.50 | 7.00 | +2.5 | Gold | Numbing Frost | Tundra Wolverine |

**Tier averages:** Common 6.44, Silver 6.33, Gold 7.50 — Silver is
essentially tied with Common instead of clearly above it, which is the
formula's way of flagging that at least one Silver card is under-delivering
(see Section 7).

## 6. Cross-check against the balance simulator

Comparing TPS ranking to the real bot-vs-bot per-card win rate
(`npm run balance`, 150 random-legal-deck matches) shows a strong positive
relationship: cards land roughly where TPS predicts, with a few genuine
outliers the formula independently flags too.

| Card | TPS | Sim win rate |
|---|---|---|
| Wild Cobra | 3.50 | **41.4%** (worst in roster) |
| Bramble Lynx | 5.00 | 43.3% |
| Shadow Fox | 5.00 | 43.8% |
| Blizzard Wolf | 6.50 | 48.1% |
| Blaze Hawk | 7.50 | 52.2% |
| Solar Falcon | 9.00 | **63.5%** (best in roster) |
| Scorch Boar | 9.50 | 60.2% |
| Tundra Wolverine | 9.50 | 51.2% |

Reading this: the formula correctly ranks the roster's worst card (Wild
Cobra) and its best (Solar Falcon), and correctly predicts Empower
(Blaze Hawk) and Ward (Blizzard Wolf) landing above and near the Common
baseline respectively. The one place formula and simulation disagreed —
Tundra Wolverine vs. Scorch Boar, priced identically by the formula but
9 points apart in the 150-match sim — turned out to matter: see Section 7.

## 7. Applied changes and the actual rebalance process

All five flagged cards were changed, verified, and in three cases
iterated on when the first fix didn't land as predicted — worth recording
in detail, because the misses are the more instructive part.

**Solar Falcon** (Common, was A3/S3/R2) → **A2/S3/R2**. Landed as
predicted: 63.5% → ~52-55% across re-runs, right in the main Common
cluster. One change, no iteration needed.

**Bramble Lynx** (Common, was A1/S4/R1) → **A2/S4/R1**. Also landed as
predicted: 43.3% → ~48-50%. One change, no iteration needed.

**Wild Cobra** (Gold, was A1/S2/R1, Mesmerize −4 `costsBothMoves`) — this
one took three tries:
1. Stats only, A1/S2 → A2/S4 (matching the Common baseline), ability
   untouched: 41.4% → 43.8%. An improvement, but still tied for worst in
   the roster — the stat bump alone wasn't the real problem.
2. Also dropped `costsBothMoves` (Mesmerize becomes a normal 1-move
   ability, like every other ability in the roster): 43.8% → **59.4%**,
   swinging it from worst card to best in one step. This confirmed the
   full-turn cost (no attack *and* no Defense-Mode retreat) was the actual
   cost driver, worth far more than the formula's flat "−3.5 tax"
   estimate — but the fix overshot badly.
3. Corrected by trimming both the ability magnitude (−4 → −3) and Shield
   (4 → 3, once a larger 600-match run — see below — showed 4 still ran
   hot at 57.2%): landed at **53.9%** on the standard 150-match sample.
   Final stats: **A2/S3/R1**, Mesmerize −3, 1-move cost.

**Shadow Fox** (Silver, was A1/S3/R1, Feint +2 not-usable-while-defending)
— also took multiple passes, and is the clearest lesson in this whole
exercise:
1. Attack bump alone (A1 → A2): 43.8% → 43.8%. No effect at all.
2. Feint magnitude bump on top (+2 → +3): still 40.8-44.1% across several
   re-runs. Still no real effect.
3. Shield bump (3 → 4), keeping Feint's own restriction and magnitude as
   they were in step 2: finally moved it, landing at **42.3%** on the
   150-match sample and a clean **46.8%** on a 600-match run. Final stats:
   **A2/S4/R1**, Feint +3, still not usable while defending.

   The lesson: neither Attack nor the ability's own magnitude was the
   binding constraint — Shield was. Feint's restriction (only usable while
   exposed, unlike Ward) makes this card take more real damage over a
   match than its Silver peers, so it needed raw durability, not more
   offense or a bigger heal, to actually survive long enough to matter.

**Tundra Wolverine** (Gold, was A2/S3/R2, Numbing Frost −2) — the formula
and the 150-match sim disagreed on this one from the start (Section 6),
and it's the best illustration of why sample size matters:
- At 150 matches, it read as roughly neutral (47-55% across different
  runs, inconsistent) — genuinely ambiguous.
- At 600 matches (run specifically to settle this), it read as a clear,
  consistent overperformer: **55.5%**, with a margin of error tight enough
  (±~2 points at that sample size) to trust the number.
- Fixed by trimming Shield (3 → 2), leaving Numbing Frost itself untouched
  since its own math was already sound (identically priced to Scorch's,
  per Section 3's floor argument). Landed at **47.2%** on the 150-match
  sample, **46.7%** on a 600-match confirmation run. Final stats:
  **A2/S2/R2**.

**Net result:** the roster's win-rate spread went from **41.4%-63.5%**
(22.1 points, on the original 150-match sample) to **45.6%-53.0%**
(7.4 points, on a 600-match run with the fixes applied) — no card left
standing out sharply above or below the pack. Every changed value stays
inside the 1-6 physical-die range.

## 8. Takeaways for future balance passes

- **A formula gets you a plausible first guess, not a verified fix.**
  Two of five changes above (Wild Cobra, Shadow Fox) needed real
  simulation data to find the actual lever — the formula's own reasoning
  about *which* stat mattered was wrong both times on the first attempt.
- **Re-simulate after every change**, not just once at the end — Wild
  Cobra's `costsBothMoves` removal alone would have shipped a wildly
  overtuned card if the fix had stopped there.
- **150 matches isn't always enough sample to trust a borderline number.**
  Tundra Wolverine looked fine at 150 and confirmed-overtuned at 600. When
  a card's reading is ambiguous or contradicts the formula, temporarily
  bump `SAMPLE_SIZE` in `tests/balance/balanceSim.report.ts` for a one-off
  local run (then revert it — CI stays at 150 for speed) before trusting
  the result enough to act on it.

## Using this for new cards

1. Pick Attack, Shield, Range for the intended tier.
2. `BCP = Attack × LaneMultiplier(Range) + Shield`.
3. If it has an ability, classify its shape against Section 3's table and
   add the matching AV (or reason through a new one if it doesn't fit any
   existing shape — most abilities will).
4. Compare `TPS = BCP + AV` against Section 4's tier targets.
5. Run `npm run balance` after adding the card — this formula gets you a
   sane first draft, the simulator confirms it actually plays that way.
