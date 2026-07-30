import type { PlayerSetup } from '../game/state';

export interface StarterDeck {
  id: string;
  name: string;
  description: string;
  setup: PlayerSetup;
}

/**
 * Two fixed, zero-overlap starter decks for the MVP (no custom deckbuilder
 * — see PLAN's Phase 2 scope). §9 never requires a deck to be built from a
 * single season — that was only ever this MVP's original (and misleading)
 * content choice, not a rule. A real player's collection spans every
 * season, so each starter deck here is a deliberate cross-season mix: both
 * draw from Summer, Winter, and Neutral ranks rather than being a
 * mono-season "theme deck". They keep distinct *archetypes* (aggressive vs.
 * defensive) instead — that's what actually needs to differ between two
 * starter decks for the matchup to be interesting.
 *
 * Each `setup.startingBattlefieldDefIds` is a sensible default lineup
 * (Titan + 3 Normals = 5 lanes exactly); Phase 3's UI can let players pick
 * a different opening lineup from their own deck later without any engine
 * change.
 */
export const STARTER_DECKS: Record<string, StarterDeck> = {
  vanguardAlliance: {
    id: 'vanguardAlliance',
    name: "Vanguard's Alliance",
    description:
      'Aggressive strike force drawn from across Summer, Winter, and Neutral ranks.',
    setup: {
      deckDefIds: [
        'sunblade_vanguard',
        'ember_striker',
        'solar_lancer',
        'ice_piercer',
        'snowbound_guard',
        'firebrand',
        'blizzardcaller',
        'bulwark_drifter',
        'meadow_runner',
        'mesmerist',
      ],
      startingBattlefieldDefIds: ['sunblade_vanguard', 'ember_striker', 'ice_piercer', 'firebrand'],
    },
  },

  wardenAlliance: {
    id: 'wardenAlliance',
    name: "Warden's Alliance",
    description:
      'Defensive formation drawn from across Winter, Summer, and Neutral ranks.',
    setup: {
      deckDefIds: [
        'glacier_warden',
        'dune_skirmisher',
        'frost_sentinel',
        'frostguard',
        'wayfarer',
        'scorchcaller',
        'trickster',
        'hollow_wanderer',
        'stonebound_sentry',
        'snowdrift_scout',
      ],
      startingBattlefieldDefIds: ['glacier_warden', 'dune_skirmisher', 'wayfarer', 'frostguard'],
    },
  },
};
