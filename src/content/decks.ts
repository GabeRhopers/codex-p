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
 * season, so each starter deck here is a deliberate cross-season mix. They
 * keep distinct *archetypes* (aggressive vs. defensive) instead — that's
 * what actually needs to differ between two starter decks for the matchup
 * to be interesting, and it holds up on Normal-card stats alone (Vanguard's
 * Alliance averages noticeably higher Attack / lower Shield than Warden's
 * Alliance across their Normal cards).
 *
 * Normal Mode (the only mode built so far) has no Titans at all — they're
 * reserved for a future Advanced Mode alongside Seasonal Advantage (see
 * RULES_SPEC.md). Each `setup.startingBattlefieldDefIds` here is 5 Normal
 * cards, one per lane, filling the board exactly; Phase 3's UI can let
 * players pick a different opening lineup from their own deck later
 * without any engine change.
 */
export const STARTER_DECKS: Record<string, StarterDeck> = {
  vanguardAlliance: {
    id: 'vanguardAlliance',
    name: "Vanguard's Alliance",
    description:
      'Aggressive strike force drawn from across Summer, Winter, Spring, and Neutral ranks.',
    setup: {
      deckDefIds: [
        'thornvine_skirmisher',
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
      startingBattlefieldDefIds: [
        'ember_striker',
        'firebrand',
        'ice_piercer',
        'thornvine_skirmisher',
        'meadow_runner',
      ],
    },
  },

  wardenAlliance: {
    id: 'wardenAlliance',
    name: "Warden's Alliance",
    description:
      'Defensive formation drawn from across Winter, Summer, Autumn, and Neutral ranks.',
    setup: {
      deckDefIds: [
        'bramble_reaper',
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
      startingBattlefieldDefIds: [
        'dune_skirmisher',
        'frostguard',
        'wayfarer',
        'bramble_reaper',
        'frost_sentinel',
      ],
    },
  },
};
