import { adjustAttack, restoreShield } from '../game/damage';
import { shieldFloor } from '../game/rules.config';
import type { CardDefinitionRegistry } from '../game/types';

/**
 * MVP card roster (Phase 2 of the project plan): 20 unique cards split into
 * two zero-overlap 10-card starter decks — Summer Pressure (aggressive) and
 * Winter Control (defensive) — rather than the full 44-card long-term
 * vision. See RULES_SPEC.md and PLAN for the scope rationale.
 *
 * Ability effects reuse the engine's own mutators (adjustAttack,
 * restoreShield from src/game/damage.ts) so every stat change goes through
 * the same floor/clamp logic the core engine already tests, rather than
 * content re-implementing it ad hoc.
 */
export const CARD_DEFINITIONS: CardDefinitionRegistry = {
  // --- Summer Pressure ------------------------------------------------

  sunblade_vanguard: {
    id: 'sunblade_vanguard',
    name: 'Sunblade Vanguard',
    season: 'Summer',
    form: 'Titan',
    attack: 4,
    shield: 8,
    range: 1,
    tier: 'Common',
  },
  ember_striker: {
    id: 'ember_striker',
    name: 'Ember Striker',
    season: 'Summer',
    form: 'Normal',
    attack: 4,
    shield: 2,
    range: 1,
    tier: 'Common',
  },
  solar_lancer: {
    id: 'solar_lancer',
    name: 'Solar Lancer',
    season: 'Summer',
    form: 'Normal',
    attack: 3,
    shield: 3,
    range: 2,
    tier: 'Common',
  },
  dune_skirmisher: {
    id: 'dune_skirmisher',
    name: 'Dune Skirmisher',
    season: 'Summer',
    form: 'Normal',
    attack: 2,
    shield: 4,
    range: 1,
    tier: 'Common',
  },
  firebrand: {
    id: 'firebrand',
    name: 'Firebrand',
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
    name: 'Scorchcaller',
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
    name: 'Wayfarer',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 2,
    range: 3,
    tier: 'Common',
  },
  bulwark_drifter: {
    id: 'bulwark_drifter',
    name: 'Bulwark Drifter',
    season: 'Neutral',
    form: 'Normal',
    attack: 2,
    shield: 5,
    range: 1,
    tier: 'Common',
  },
  trickster: {
    id: 'trickster',
    name: 'Trickster',
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
      usableWhileDefending: true,
      effect: ({ G, casterInstanceId }) => {
        restoreShield(G.cardInstances[casterInstanceId], 1, CARD_DEFINITIONS);
      },
    },
  },
  meadow_runner: {
    id: 'meadow_runner',
    name: 'Meadow Runner',
    season: 'Neutral',
    form: 'Normal',
    attack: 2,
    shield: 3,
    range: 2,
    tier: 'Common',
  },

  // --- Winter Control --------------------------------------------------

  glacier_warden: {
    id: 'glacier_warden',
    name: 'Glacier Warden',
    season: 'Winter',
    form: 'Titan',
    attack: 3,
    shield: 10,
    range: 1,
    tier: 'Common',
  },
  frost_sentinel: {
    id: 'frost_sentinel',
    name: 'Frost Sentinel',
    season: 'Winter',
    form: 'Normal',
    attack: 1,
    shield: 5,
    range: 1,
    tier: 'Common',
  },
  ice_piercer: {
    id: 'ice_piercer',
    name: 'Ice Piercer',
    season: 'Winter',
    form: 'Normal',
    attack: 2,
    shield: 4,
    range: 2,
    tier: 'Common',
  },
  snowbound_guard: {
    id: 'snowbound_guard',
    name: 'Snowbound Guard',
    season: 'Winter',
    form: 'Normal',
    attack: 2,
    shield: 5,
    range: 1,
    tier: 'Common',
  },
  frostguard: {
    id: 'frostguard',
    name: 'Frostguard',
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
    name: 'Blizzardcaller',
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
      effect: ({ G, targetInstanceId }) => {
        if (!targetInstanceId) return;
        adjustAttack(G.cardInstances[targetInstanceId], -1);
      },
    },
  },
  hollow_wanderer: {
    id: 'hollow_wanderer',
    name: 'Hollow Wanderer',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 3,
    range: 3,
    tier: 'Common',
  },
  stonebound_sentry: {
    id: 'stonebound_sentry',
    name: 'Stonebound Sentry',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 6,
    range: 1,
    tier: 'Common',
  },
  mesmerist: {
    id: 'mesmerist',
    name: 'Mesmerist',
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
    name: 'Snowdrift Scout',
    season: 'Neutral',
    form: 'Normal',
    attack: 1,
    shield: 4,
    range: 2,
    tier: 'Common',
  },
};
