import type { CardDefinition, CardInstance } from '../game/types';

const SEASON_CLASS: Record<CardDefinition['season'], string> = {
  Summer: 'season-summer',
  Winter: 'season-winter',
  Spring: 'season-spring',
  Autumn: 'season-autumn',
  Neutral: 'season-neutral',
};

interface CardViewProps {
  definition: CardDefinition;
  instance: CardInstance;
  size?: 'battlefield' | 'bench';
  selected?: boolean;
  targetable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export function CardView({
  definition,
  instance,
  size = 'battlefield',
  selected = false,
  targetable = false,
  clickable = false,
  onClick,
}: CardViewProps) {
  const classes = [
    'card',
    size === 'bench' ? 'card-bench' : 'card-battlefield',
    SEASON_CLASS[definition.season],
    selected ? 'card-selected' : '',
    targetable ? 'card-targetable' : '',
    clickable ? 'card-clickable' : '',
    instance.defending ? 'card-defending' : '',
    instance.broken ? 'card-broken' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
        <span className="card-range">R{definition.range}</span>
      </div>
      <div className="card-name">{definition.name}</div>
      <div className="card-form">{definition.form === 'Titan' ? 'Titan' : definition.season}</div>
      <div className="card-stats">
        <span className="stat stat-attack" aria-label="Attack">
          ⚔ {instance.currentAttack}
        </span>
        <span className="stat stat-shield" aria-label="Shield">
          🛡 {instance.currentShield}
        </span>
      </div>
      {definition.ability && <div className="card-ability">{definition.ability.name}</div>}
      {instance.defending && <div className="card-flag card-flag-defending">Defending</div>}
      {instance.broken && <div className="card-flag card-flag-broken">Broken</div>}
    </button>
  );
}
