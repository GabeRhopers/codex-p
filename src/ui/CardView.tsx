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
      <div className="card-top">
        <span className="card-tier" data-tier={definition.tier}>
          {definition.tier}
        </span>
        <SeasonIcon className="card-season-icon" aria-label={definition.season} size={13} />
        <span className="card-range">R{definition.range}</span>
      </div>
      {size === 'battlefield' && <CardPortrait definition={definition} />}
      <div className="card-name">{definition.name}</div>
      {size === 'bench' && (
        <div className="card-form">{definition.form === 'Titan' ? 'Titan' : definition.season}</div>
      )}
      <div className="card-stats">
        <span className="stat stat-attack" aria-label="Attack">
          <Swords size={13} /> {instance.currentAttack}
        </span>
        <span className="stat stat-shield" aria-label="Shield">
          <Shield size={13} /> {instance.currentShield}
        </span>
      </div>
      {/* Bench cards are compact reference-only (not clickable, see
       * BenchStrip) and too short to fit a 5th line of text without
       * overflowing or forcing an ugly mid-word wrap — the ability name is
       * still reachable via the button's title tooltip. */}
      {size === 'battlefield' && definition.ability && <div className="card-ability">{definition.ability.name}</div>}
      {instance.defending && <div className="card-flag card-flag-defending">Defending</div>}
      {instance.broken && <div className="card-flag card-flag-broken">Broken</div>}
    </button>
  );
}

/**
 * The art window in the middle of a battlefield card. Falls back to a
 * plain dashed placeholder (matching the empty-lane convention already
 * used elsewhere on the board) for any card that doesn't have a portrait
 * yet — deliberately not blocking on 100% roster coverage.
 */
function CardPortrait({ definition }: { definition: CardDefinition }) {
  const file = CARD_PORTRAITS[definition.id];
  if (!file) {
    return <div className="card-portrait card-portrait-placeholder" aria-hidden="true" />;
  }
  return (
    <div className="card-portrait">
      <img src={`${import.meta.env.BASE_URL}portraits/${file}`} alt="" loading="lazy" />
    </div>
  );
}
