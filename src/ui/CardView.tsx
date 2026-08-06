import { Leaf, Shield, Snowflake, Sprout, Star, Sun, Swords } from 'lucide-react';
import type { ComponentType } from 'react';
import { CARD_PORTRAITS } from '../content/portraits';
import type { CardDefinition, CardInstance } from '../game/types';

const SEASON_CLASS: Record<CardDefinition['season'], string> = {
  Summer: 'season-summer',
  Winter: 'season-winter',
  Spring: 'season-spring',
  Autumn: 'season-autumn',
  Neutral: 'season-neutral',
};

const SEASON_ICON: Record<CardDefinition['season'], ComponentType<{ size?: number; className?: string }>> = {
  Summer: Sun,
  Winter: Snowflake,
  Spring: Sprout,
  Autumn: Leaf,
  Neutral: Star,
};

interface CardViewProps {
  definition: CardDefinition;
  instance: CardInstance;
  size?: 'battlefield' | 'bench';
  selected?: boolean;
  targetable?: boolean;
  clickable?: boolean;
  /** Visually de-emphasize this card (already acted this turn, or a
   * non-eligible option while actively choosing a target elsewhere on the
   * board). Deliberately separate from `clickable`/`disabled`: a card that
   * simply isn't part of the current UI interaction (e.g. the opponent's
   * whole board while you're just picking your own attacker) is not
   * "disabled" in any meaningful sense and shouldn't read as broken. */
  deemphasized?: boolean;
  onClick?: () => void;
}

/**
 * Renders one card face. Anatomy deliberately mirrors physical CCG/RPG
 * cards (Hearthstone/MTG Arena) rather than a data-table row: a chamfered
 * cut-corner frame (see .card's clip-path) in place of a plain rounded
 * panel, a rarity-colored border (tier), dominant art bleeding to the
 * frame's own cut top corners, tier/season/range riding as small gem
 * badges over the art, a ribbon-shaped nameplate, and Attack/Shield as
 * beveled gem tokens in a fixed strip along the card's bottom edge. That
 * combination is what reads as "a game card" versus a bordered info
 * panel that happens to contain card data.
 */
export function CardView({
  definition,
  instance,
  size = 'battlefield',
  selected = false,
  targetable = false,
  clickable = false,
  deemphasized = false,
  onClick,
}: CardViewProps) {
  const classes = [
    'card',
    size === 'bench' ? 'card-bench' : 'card-battlefield',
    SEASON_CLASS[definition.season],
    `card-tier-${definition.tier.toLowerCase()}`,
    selected ? 'card-selected' : '',
    targetable ? 'card-targetable' : '',
    clickable ? 'card-clickable' : '',
    deemphasized ? 'card-deemphasized' : '',
    instance.defending ? 'card-defending' : '',
    instance.broken ? 'card-broken' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const SeasonIcon = SEASON_ICON[definition.season];

  return (
    <button
      type="button"
      className={classes}
      disabled={!clickable}
      onClick={onClick}
      data-testid={`card-${instance.instanceId}`}
      data-defid={definition.id}
      title={definition.ability ? `${definition.ability.name}` : undefined}
    >
      {size === 'battlefield' ? (
        <div className="card-art-frame">
          <CardPortrait definition={definition} />
          <span className="card-gem card-gem-tier" data-tier={definition.tier} aria-label={`${definition.tier} tier`}>
            {definition.tier[0]}
          </span>
          <span className="card-gem card-gem-season" aria-label={definition.season}>
            <SeasonIcon size={12} />
          </span>
          <span className="card-gem card-gem-range" aria-label={`Range ${definition.range}`}>
            R{definition.range}
          </span>
          {instance.defending && <div className="card-ribbon card-ribbon-defending">Defending</div>}
          {instance.broken && <div className="card-ribbon card-ribbon-broken">Broken</div>}
        </div>
      ) : (
        <div className="card-top">
          <span className="card-tier" data-tier={definition.tier}>
            {definition.tier}
          </span>
          <SeasonIcon className="card-season-icon" aria-label={definition.season} size={11} />
          <span className="card-range">R{definition.range}</span>
        </div>
      )}

      <div className="card-name-banner">
        <span className="card-name">{definition.name}</span>
      </div>

      {size === 'bench' && (
        <div className="card-form">{definition.form === 'Titan' ? 'Titan' : definition.season}</div>
      )}

      {/* Bench cards are compact reference-only (not clickable, see
       * BenchStrip) and too short to fit an ability line without
       * overflowing — the ability name is still reachable via the
       * button's title tooltip. Battlefield cards always render this
       * row, even when there's no ability (empty), so its presence
       * never changes the card's total height — see .card-ability's
       * fixed height in board.css. */}
      {size === 'battlefield' && (
        <div className="card-ability">{definition.ability ? definition.ability.name : ''}</div>
      )}

      {/* Attack/Shield sit in normal flow at the very bottom of the
       * card (below the ability line on battlefield, below the name on
       * bench) rather than overlapping the art — easier to scan as a
       * fixed "always here" strip than gems riding the art's edge. */}
      <div className="card-stat-row">
        <span className="card-gem card-gem-attack" aria-label="Attack">
          <Swords size={size === 'bench' ? 10 : 13} /> {instance.currentAttack}
        </span>
        <span className="card-gem card-gem-shield" aria-label="Shield">
          <Shield size={size === 'bench' ? 10 : 13} /> {instance.currentShield}
        </span>
      </div>

      {size === 'bench' && instance.defending && <div className="card-flag card-flag-defending">Defending</div>}
      {size === 'bench' && instance.broken && <div className="card-flag card-flag-broken">Broken</div>}
    </button>
  );
}

/**
 * The art window filling the top of a battlefield card. Falls back to a
 * dashed placeholder (matching the empty-lane convention already used
 * elsewhere on the board) for any card that doesn't have a portrait yet —
 * deliberately not blocking on 100% roster coverage. The placeholder shows
 * the card's own season icon, large and dim, rather than sitting empty —
 * a bare dashed box at this size reads as a broken/missing image, not an
 * intentional "no art yet" state.
 */
function CardPortrait({ definition }: { definition: CardDefinition }) {
  const file = CARD_PORTRAITS[definition.id];
  if (!file) {
    const PlaceholderIcon = SEASON_ICON[definition.season];
    return (
      <div className="card-portrait card-portrait-placeholder" aria-hidden="true">
        <PlaceholderIcon className="card-portrait-placeholder-icon" size={32} />
      </div>
    );
  }
  return (
    <div className="card-portrait">
      <img src={`${import.meta.env.BASE_URL}portraits/${file}`} alt="" loading="lazy" />
    </div>
  );
}
