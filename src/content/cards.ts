import { adjustAttack, reduceShield, restoreShield } from '../game/damage';
import type { CardDefinitionRegistry } from '../game/types';

/**
 * MVP card roster (Phase 2 of the project plan): 22 unique cards, rather
 * than the full 44-card long-term vision. See RULES_SPEC.md and PLAN for
 * the scope rationale.
 *
 * Nothing in §9 (deck legality) requires a deck to draw from a single
 * season — real players build decks from their whole collection. The two
 * starter decks in src/content/decks.ts are deliberately cross-season
 * mixes (see that file); the two groupings below are purely this file's
 * own organization by season, not a statement about which deck a card
 * belongs to.
 *
 * The 2 Titans (sunblade_vanguard, glacier_warden) are defined here but
 * currently unused by either starter deck — Normal Mode (the only mode
 * built so far) has no Titans at all; they're reserved for the future
 * Advanced Mode, which bundles Titans with Seasonal Advantage. Nothing
 * about their own implementation is incomplete or half-built, they're
 * simply dormant content right now, same as the engine's Titan-handling
 * code (applyTitanShove, the two-lane footprint, Ruling 1's multi-hit) —
 * see RULES_SPEC.md.
 *
 * Ability effects reuse the engine's own mutators (adjustAttack,
 * reduceShield, restoreShield from src/game/damage.ts) so every stat
 * change goes through the same floor/clamp/Defense-Mode logic the core
 * engine already tests, rather than content re-implementing it ad hoc.
 *
 * Naming convention: every card's display `name` is "<season-flavored
 * word> <real animal>" (e.g. "Frost Bear") — a real animal, never a
 * mythical one, even where the portrait art (src/content/portraits.ts)
 * happens to depict a dragon, phoenix, yeti, or fairy; the two are allowed
 * to diverge rather than force-fitting names to art that predates this
 * convention. No word (season or animal) repeats across the roster,
 * including the 2 dormant Titans. Neutral cards aren't tied to one of the
 * 4 seasons, so their first word is a freeform evocative one instead (Ash,
 * Dawn, Dusk, Mist, Nomad, Shadow, Stone, Wild) rather than a literal
 * season name — `season: 'Neutral'` was already pure flavor (see above),
 * so this doesn't change what it means mechanically.
 */
export const CARD_DEFINITIONS: CardDefinitionRegistry = {
  // --- Summer & Neutral cards ------------------------------------------

  // Reserved for Advanced Mode — see the file-level comment above.
  sunblade_vanguard: {
    id: 'sunblade_vanguard',
    name: 'Sun Serpent',
    season: 'Summer',
    form: 'Titan',
    attack: 4,
    shield: 8,
    range: 1,
    tier: 'Common',
  },
  ember_striker: {
    id: 'ember_striker',
    name: 'Ember Lion',
    season: 'Summer',
    form: 'Normal',
    attack: 4,
    shield: 2,
    range: 1,
    tier: 'Common',
  },
  // Attack 2, not 3 — see BALANCE_FORMULA.md. At Attack 3 this was the
  // roster's best card by a wide margin (both the Base-Combat-Power formula
  // and the real balance simulator agreed: 63.5% win rate, highest of any
  // card) despite being a vanilla Common with no ability at all. Attack 2
  // lands it with the Ash Owl / Dawn Hare / Snow Elk / Stone Husky cluster.
  solar_lancer: {
    id: 'solar_lancer',
    name: 'Solar Falcon',
    season: 'Summer',
    form: 'Normal',
    attack: 2,
    shield: 3,
    range: 2,
    tier: 'Common',
  },
  dune_skirmisher: {
    id: 'dune_skirmisher',
    name: 'Dune Jackal',
    season: 'Summer',
    form: 'Normal',
    attack: 2,
    shield: 4,
    range: 1,
    tier: 'Common',
  },
  firebrand: {
    id: 'firebrand',
    name: 'Blaze Hawk',
    season: 'Summer',
    form: 'Normal',
    attack: 2,
    shield: 3,
    range: 1,
    tier: 'Silver',
    ability: {
      id: 'firebrand_empower',
      name: 'Empower',
      requiresTarget: false,
      effect: ({ G, casterInstanceId }) => {
        adjustAttack(G.cardInstances[casterInstanceId], 1);
      },
    },
  },
  scorchcaller: {
    id: 'scorchcaller',
    name: 'Scorch Boar',
    season: 'Summer',
    form: 'Normal',
    attack: 2,
    shield: 3,
    range: 2,
    tier: 'Gold',
    ability: {
      id: 'scorchcaller_scorch',
      name: 'Scorch',
      requiresTarget: true,
      effect: ({ G, targetInstanceId }) => {
        if (!targetInstanceId) return;
        adjustAttack(G.cardInstances[targetInstanceId], -1);
      },
    },
  },
  wayfarer: {
    id: 'wayfarer',
    name: 'Dusk Stag',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 2,
    range: 3,
    tier: 'Common',
  },
  bulwark_drifter: {
    id: 'bulwark_drifter',
    name: 'Ash Owl',
    season: 'Neutral',
    form: 'Normal',
    attack: 2,
    shield: 5,
    range: 1,
    tier: 'Common',
  },
  // Attack 2 / Shield 4, not 1 / 3 — see BALANCE_FORMULA.md. At Attack 1
  // this Silver sat at parity with a weak vanilla Common (43.8% win rate)
  // despite spending one of a deck's 3 special-ability slots on Feint.
  // Neither the Attack bump alone nor a bigger Feint (+3, see the ability's
  // own comment) moved it out of last place on their own (still 40-44%
  // across several re-simulations, largest run 44.1% at n=524) — Feint's
  // own restriction (not usable while defending) leaves this card more
  // exposed than Ward's user (Blizzard Wolf), so it needs more raw
  // durability to compensate, on top of Feint actually being worth using.
  trickster: {
    id: 'trickster',
    name: 'Shadow Fox',
    season: 'Neutral',
    form: 'Normal',
    attack: 2,
    shield: 4,
    range: 1,
    tier: 'Silver',
    ability: {
      id: 'trickster_feint',
      name: 'Feint',
      requiresTarget: false,
      // Deliberately the mirror image of Frostguard's Ward (also a
      // self-only, no-target Shield restore, same tier): Ward is the
      // reliable, small top-up usable even mid-turtle in Defense Mode;
      // Feint is the bigger, riskier burst that only works while exposed —
      // a Trickster's whole identity is the bold, uncautious maneuver Ward
      // is built to avoid needing. Before this, the two were literally
      // identical (+1 Shield, usable while defending, no target) despite
      // shipping in the same starter deck.
      //
      // +3, not +2 — see BALANCE_FORMULA.md. Bumping Shadow Fox's Attack
      // didn't help at all (still worst-or-tied-worst in the roster across
      // re-simulations), which pointed at Feint's own restriction — usable
      // only while exposed, unlike Ward — costing it more in practice than
      // its bigger nominal number bought back. Rather than remove that
      // restriction (which would undo the deliberate Ward/Feint split
      // above), this raises the payoff for taking the risk instead, so the
      // two abilities stay mechanically distinct rather than becoming the
      // same shape at different sizes.
      effect: ({ G, casterInstanceId }) => {
        restoreShield(G.cardInstances[casterInstanceId], 3, CARD_DEFINITIONS);
      },
    },
  },
  meadow_runner: {
    id: 'meadow_runner',
    name: 'Dawn Hare',
    season: 'Neutral',
    form: 'Normal',
    attack: 2,
    shield: 3,
    range: 2,
    tier: 'Common',
  },
  // The roster's first Spring card — fills Vanguard's Alliance's slot
  // vacated by removing sunblade_vanguard for Normal Mode (see the
  // file-level comment). Unrelated to Seasonal Advantage (Advanced-Mode
  // only, and not implemented yet either way); season here is flavor,
  // same as every other card's.
  thornvine_skirmisher: {
    id: 'thornvine_skirmisher',
    name: 'Bloom Fawn',
    season: 'Spring',
    form: 'Normal',
    attack: 2,
    shield: 4,
    range: 1,
    tier: 'Common',
  },

  // --- Winter & Neutral cards --------------------------------------------

  // Reserved for Advanced Mode — see the file-level comment above.
  glacier_warden: {
    id: 'glacier_warden',
    name: 'Glacier Bear',
    season: 'Winter',
    form: 'Titan',
    attack: 3,
    shield: 10,
    range: 1,
    tier: 'Common',
  },
  frost_sentinel: {
    id: 'frost_sentinel',
    name: 'Frost Tortoise',
    season: 'Winter',
    form: 'Normal',
    attack: 1,
    shield: 5,
    range: 1,
    tier: 'Common',
  },
  ice_piercer: {
    id: 'ice_piercer',
    name: 'Ice Viper',
    season: 'Winter',
    form: 'Normal',
    attack: 2,
    shield: 4,
    range: 2,
    tier: 'Common',
  },
  snowbound_guard: {
    id: 'snowbound_guard',
    name: 'Snow Elk',
    season: 'Winter',
    form: 'Normal',
    attack: 2,
    shield: 5,
    range: 1,
    tier: 'Common',
  },
  frostguard: {
    id: 'frostguard',
    name: 'Blizzard Wolf',
    season: 'Winter',
    form: 'Normal',
    attack: 1,
    shield: 4,
    range: 1,
    tier: 'Silver',
    ability: {
      id: 'frostguard_ward',
      name: 'Ward',
      requiresTarget: false,
      usableWhileDefending: true,
      effect: ({ G, casterInstanceId }) => {
        restoreShield(G.cardInstances[casterInstanceId], 1, CARD_DEFINITIONS);
      },
    },
  },
  // Shield 2, not 3 — see BALANCE_FORMULA.md. A 150-match sim run initially
  // read this as roughly balanced (51-55%, close to Scorch Boar's near-
  // identical stat line), but a 600-match run at the same seed narrowed
  // the margin of error enough to show it's a real, consistent
  // overperformer (55.5%) — the earlier small-sample reading was noise, not
  // signal. Trimming Shield by 1 brings its Base Combat Power back in line
  // with the Common average without touching Numbing Frost's own math
  // (already priced identically to Scorch's — see the ability's own
  // comment).
  blizzardcaller: {
    id: 'blizzardcaller',
    name: 'Tundra Wolverine',
    season: 'Winter',
    form: 'Normal',
    attack: 2,
    shield: 2,
    range: 2,
    tier: 'Gold',
    ability: {
      id: 'blizzardcaller_numbing_frost',
      name: 'Numbing Frost',
      requiresTarget: true,
      // -2, not -1: before this it was identical to Scorchcaller's Scorch
      // despite the two never even sharing a deck to make that obvious.
      // Numbing Frost is Blizzardcaller's whole reason to exist as a Gold
      // pick over the cheaper Winter Normals, so it earns a real bite
      // rather than matching Scorch's lighter, Summer-side nick.
      effect: ({ G, targetInstanceId }) => {
        if (!targetInstanceId) return;
        adjustAttack(G.cardInstances[targetInstanceId], -2);
      },
    },
  },
  hollow_wanderer: {
    id: 'hollow_wanderer',
    name: 'Mist Badger',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 3,
    range: 3,
    tier: 'Common',
  },
  stonebound_sentry: {
    id: 'stonebound_sentry',
    name: 'Stone Husky',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 6,
    range: 1,
    tier: 'Common',
  },
  // Attack 2 / Shield 3, not 1 / 2, and Mesmerize no longer costs both
  // moves — see BALANCE_FORMULA.md. At 1/2 this Gold had the *worst* raw
  // stats of any card in the roster, Commons included, and it was the
  // roster's worst performer overall (41.4% win rate) despite Mesmerize's
  // imposing -4 Shield hit. A stat bump alone (to A2/S4, matching Dune
  // Jackal/Bloom Fawn's line) only moved it to 43.8%; dropping
  // costsBothMoves on top of that was the real fix, but overshot hard
  // (59.4%, the roster's *best* card) — forfeiting the whole turn was
  // costing it far more than expected. Shield 3 (down from the 4 tried
  // alongside the costsBothMoves fix) trims it back down once a larger
  // 600-match run confirmed 4 still ran a little hot (57.2%).
  mesmerist: {
    id: 'mesmerist',
    name: 'Wild Cobra',
    season: 'Neutral',
    form: 'Normal',
    attack: 2,
    shield: 3,
    range: 1,
    tier: 'Gold',
    ability: {
      id: 'mesmerist_mesmerize',
      name: 'Mesmerize',
      requiresTarget: true,
      effect: ({ G, targetInstanceId }) => {
        // §21 — Mind Control's exact effect is left to the card's own text;
        // this MVP interpretation is a heavy Shield hit (not a literal
        // swap of card control). Originally this set Shield straight to 0
        // and Broken unconditionally, bypassing Defense Mode's damage cap
        // entirely — the only thing in the game that could do that. Now it
        // goes through reduceShield like any other Shield-damaging effect,
        // so a defending target is still capped at 1 (§18).
        //
        // -3, not -4 — see BALANCE_FORMULA.md. Dropping costsBothMoves (see
        // above) was re-simulated together with the -4 magnitude and
        // overshot hard: Wild Cobra went from the roster's worst card
        // (41.4%) to its best (59.4%) in one step, because removing the
        // "no attack, no defense" tax was worth far more alone than
        // expected. -3 is still a real, roster-topping hit (only Stone
        // Husky's Shield 6 comfortably survives it) without also being
        // affordable every single turn at full force.
        if (!targetInstanceId) return;
        reduceShield(G.cardInstances[targetInstanceId], 3);
      },
    },
  },
  snowdrift_scout: {
    id: 'snowdrift_scout',
    name: 'Nomad Tiger',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 4,
    range: 2,
    tier: 'Common',
  },
  // The roster's first Autumn card — fills Warden's Alliance's slot
  // vacated by removing glacier_warden for Normal Mode (see the
  // file-level comment).
  //
  // Attack 2, not 1 — see BALANCE_FORMULA.md. At Attack 1 this vanilla
  // Common sat below the Common average with nothing (no ability) to show
  // for it (43.3% win rate, near the bottom of the roster).
  bramble_reaper: {
    id: 'bramble_reaper',
    name: 'Bramble Lynx',
    season: 'Autumn',
    form: 'Normal',
    attack: 2,
    shield: 4,
    range: 1,
    tier: 'Common',
  },
};
