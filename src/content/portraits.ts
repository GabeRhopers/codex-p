/**
 * Character portraits, keyed by card defId. Deliberately a partial map —
 * not every card has art yet, and CardView falls back to a placeholder for
 * any defId not listed here rather than requiring 100% coverage up front.
 *
 * Art source: hand-picked illustrations (not AI-generated in this
 * session — see PLAN/session history), each cropped to its own square
 * file under public/portraits/<defId>.png. Add a card here the moment its
 * file lands; no other code needs to change.
 */
export const CARD_PORTRAITS: Record<string, string> = {
  sunblade_vanguard: 'sunblade_vanguard.png',
  ember_striker: 'ember_striker.png',
  glacier_warden: 'glacier_warden.png',
  blizzardcaller: 'blizzardcaller.png',
  solar_lancer: 'solar_lancer.png',
  wayfarer: 'wayfarer.png',
  mesmerist: 'mesmerist.png',
  trickster: 'trickster.png',
  hollow_wanderer: 'hollow_wanderer.png',
  thornvine_skirmisher: 'thornvine_skirmisher.png',
  firebrand: 'firebrand.png',
  scorchcaller: 'scorchcaller.png',
  stonebound_sentry: 'stonebound_sentry.png',
  bramble_reaper: 'bramble_reaper.png',
  bulwark_drifter: 'bulwark_drifter.png',
  ice_piercer: 'ice_piercer.png',
  frostguard: 'frostguard.png',
  snowdrift_scout: 'snowdrift_scout.png',
  dune_skirmisher: 'dune_skirmisher.png',
  meadow_runner: 'meadow_runner.png',
  frost_sentinel: 'frost_sentinel.png',
  snowbound_guard: 'snowbound_guard.png',
};
