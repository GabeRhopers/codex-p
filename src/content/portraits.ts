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
  wayfarer: 'wayfarer.png',
  mesmerist: 'mesmerist.png',
  trickster: 'trickster.png',
};
