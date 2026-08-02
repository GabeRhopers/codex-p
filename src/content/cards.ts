import { adjustAttack, restoreShield } from '../game/damage';
import { shieldFloor } from '../game/rules.config';
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
 * restoreShield from src/game/damage.ts) so every stat change goes through
 * the same floor/clamp logic the core engine already tests, rather than
 * content re-implementing it ad hoc.
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
  solar_lancer: {
    id: 'solar_lancer',
    name: 'Solar Falcon',
    season: 'Summer',
    form: 'Normal',
    attack: 3,
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
  trickster: {
    id: 'trickster',
    name: 'Shadow Fox',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 3,
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
      effect: ({ G, casterInstanceId }) => {
        restoreShield(G.cardInstances[casterInstanceId], 2, CARD_DEFINITIONS);
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
  blizzardcaller: {
    id: 'blizzardcaller',
    name: 'Tundra Wolverine',
    season: 'Winter',
    form: 'Normal',
    attack: 2,
    shield: 3,
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
  mesmerist: {
    id: 'mesmerist',
    name: 'Wild Cobra',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 2,
    range: 1,
    tier: 'Gold',
    ability: {
      id: 'mesmerist_mesmerize',
      name: 'Mesmerize',
      requiresTarget: true,
      costsBothMoves: true,
      effect: ({ G, targetInstanceId }) => {
        // §21 — Mind Control's exact effect is left to the card's own text;
        // this MVP interpretation drops the target straight to a broken
        // state (one more hit of any size destroys it), rather than
        // literally swapping which player controls the card.
        if (!targetInstanceId) return;
        const target = G.cardInstances[targetInstanceId];
        target.currentShield = shieldFloor;
        target.broken = true;
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
  bramble_reaper: {
    id: 'bramble_reaper',
    name: 'Bramble Lynx',
    season: 'Autumn',
    form: 'Normal',
    attack: 1,
    shield: 4,
    range: 1,
    tier: 'Common',
  },
};
