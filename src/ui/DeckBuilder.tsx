import { useMemo, useState } from 'react';
import { CardView } from './CardView';
import { CARD_DEFINITIONS } from '../content/cards';
import {
  BUILDABLE_CARD_IDS,
  abilityCardCount,
  evaluateDeckBuild,
  loadSavedCustomDeck,
  saveCustomDeck,
  toPlayerSetup,
} from '../content/deckBuilder';
import { DECK_SIZE, MAX_SPECIAL_ABILITY_CARDS } from '../game/rules.config';
import type { PlayerSetup } from '../game/state';
import type { CardInstance } from '../game/types';

interface DeckBuilderProps {
  playerLabel: string;
  onConfirm: (setup: PlayerSetup) => void;
  onCancel: () => void;
}

/** CardView needs a live CardInstance (currentAttack/currentShield/etc.) to
 * render — there's no match yet during deck building, so this fabricates a
 * read-only preview straight off the definition's printed stats. Never
 * touched by any game move; exists purely to reuse CardView's rendering
 * instead of standing up a second, parallel card component. */
function previewInstance(defId: string): CardInstance {
  const def = CARD_DEFINITIONS[defId];
  return {
    instanceId: defId,
    defId,
    owner: '0',
    currentAttack: def.attack,
    currentShield: def.shield,
    broken: false,
    defending: false,
    enteredBattlefieldOnTurn: 0,
  };
}

export function DeckBuilder({ playerLabel, onConfirm, onCancel }: DeckBuilderProps) {
  // Starts from whatever was last saved (if anything) rather than blank —
  // the point of persisting a custom deck is not re-picking it from
  // scratch every time.
  const [defIds, setDefIds] = useState<string[]>(() => loadSavedCustomDeck() ?? []);
  const status = useMemo(() => evaluateDeckBuild(defIds), [defIds]);

  function toggle(defId: string) {
    setDefIds((prev) => {
      if (prev.includes(defId)) {
        return prev.filter((id) => id !== defId);
      }
      // Belt-and-suspenders: CardView already disables the button once a
      // cap is hit (see `selectable` below), so this can't normally fire —
      // but the state update shouldn't trust the UI alone to enforce it.
      if (prev.length >= DECK_SIZE) return prev;
      const hasAbility = CARD_DEFINITIONS[defId].ability !== undefined;
      if (hasAbility && abilityCardCount(prev) >= MAX_SPECIAL_ABILITY_CARDS) return prev;
      return [...prev, defId];
    });
  }

  function confirm() {
    if (!status.isComplete) return;
    saveCustomDeck(defIds);
    onConfirm(toPlayerSetup(defIds));
  }

  return (
    <div className="deck-builder">
      <header className="deck-builder-head">
        <div>
          <h1 className="deck-builder-title">Build Your Deck</h1>
          <p className="screen-note deck-builder-note">
            {playerLabel}, pick exactly {DECK_SIZE} cards. The first 5 you pick start on the battlefield.
          </p>
        </div>
        <button type="button" className="btn" onClick={onCancel}>
          Back
        </button>
      </header>

      <div className="deck-builder-grid">
        {BUILDABLE_CARD_IDS.map((defId) => {
          const def = CARD_DEFINITIONS[defId];
          const selected = defIds.includes(defId);
          const hasAbility = def.ability !== undefined;
          const blockedByDeckSize = !selected && defIds.length >= DECK_SIZE;
          const blockedByAbilityCap = !selected && hasAbility && status.abilityCount >= MAX_SPECIAL_ABILITY_CARDS;
          const selectable = !blockedByDeckSize && !blockedByAbilityCap;
          const pickOrder = defIds.indexOf(defId);
          return (
            <div className="deck-builder-card-wrap" key={defId}>
              <CardView
                definition={def}
                instance={previewInstance(defId)}
                size="battlefield"
                selected={selected}
                clickable={selectable}
                deemphasized={!selected && !selectable}
                onClick={() => toggle(defId)}
              />
              {selected && (
                <span className={`deck-builder-pick-badge ${pickOrder < 5 ? 'deck-builder-pick-badge-starter' : ''}`}>
                  {pickOrder < 5 ? `Start ${pickOrder + 1}` : `Bench`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="deck-builder-summary">
        <div className="deck-builder-stats">
          <span className={status.cardCount === DECK_SIZE ? 'deck-builder-stat-ok' : ''}>
            {status.cardCount} / {DECK_SIZE} cards
          </span>
          <span
            className={
              status.abilityCount <= MAX_SPECIAL_ABILITY_CARDS ? 'deck-builder-stat-ok' : 'deck-builder-stat-bad'
            }
          >
            {status.abilityCount} / {MAX_SPECIAL_ABILITY_CARDS} ability cards
          </span>
          <span className={status.seasonCount >= 2 ? 'deck-builder-stat-ok' : ''}>
            {status.seasonCount} season{status.seasonCount === 1 ? '' : 's'} (min. 2)
          </span>
        </div>
        <button type="button" className="btn btn-primary" disabled={!status.isComplete} onClick={confirm}>
          Confirm Deck
        </button>
      </div>
    </div>
  );
}
