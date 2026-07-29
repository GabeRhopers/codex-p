import type { PlayerSetup } from '../game/state';

export interface StarterDeck {
  id: string;
  name: string;
  description: string;
  setup: PlayerSetup;
}

/**
 * Two fixed, zero-overlap starter decks for the MVP (no custom deckbuilder
 * — see PLAN's Phase 2 scope). Each `setup.startingBattlefieldDefIds` is a
 * sensible default lineup (Titan + 3 Normals = 5 lanes exactly); Phase 3's
 * UI can let players pick a different opening lineup from their own deck
 * later without any engine change.
 */
export const STARTER_DECKS: Record<string, StarterDeck> = {
  summerPressure: {
    id: 'summerPressure',
    name: 'Summer Pressure',
    description: 'Aggressive Summer offense backed by Neutral utility.',
    setup: {
      deckDefIds: [
        'sunblade_vanguard',
        'ember_striker',
        'solar_lancer',
        'dune_skirmisher',
        'firebrand',
        'scorchcaller',
        'wayfarer',
        'bulwark_drifter',
        'trickster',
        'meadow_runner',
      ],
      startingBattlefieldDefIds: ['sunblade_vanguard', 'ember_striker', 'solar_lancer', 'firebrand'],
    },
  },

  winterControl: {
    id: 'winterControl',
    name: 'Winter Control',
    description: 'Defensive Winter walls and debuffs backed by Neutral utility.',
    setup: {
      deckDefIds: [
        'glacier_warden',
        'frost_sentinel',
        'ice_piercer',
        'snowbound_guard',
        'frostguard',
        'blizzardcaller',
        'hollow_wanderer',
        'stonebound_sentry',
        'mesmerist',
        'snowdrift_scout',
      ],
      startingBattlefieldDefIds: ['glacier_warden', 'frost_sentinel', 'ice_piercer', 'frostguard'],
    },
  },
};
