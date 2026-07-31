import { STARTER_DECKS } from '../content/decks';

interface DeckSelectProps {
  /** Which player is picking right now — deck choice is symmetric and
   * sequential (see App.tsx): each player independently picks a preset or
   * builds their own, one after the other. Nothing stops both from
   * choosing the same preset, or both going custom. */
  playerLabel: string;
  /** Set once the first player has already picked, so the second player
   * knows what they're up against before choosing. */
  opponentDeckName?: string;
  onChoosePreset: (deckId: string) => void;
  onBuildCustom: () => void;
}

export function DeckSelect({ playerLabel, opponentDeckName, onChoosePreset, onBuildCustom }: DeckSelectProps) {
  return (
    <div className="screen screen-deck-select">
      <h1 className="screen-title">Choose Your Alliance</h1>
      <p className="screen-note">
        {playerLabel}, pick a deck.
        {opponentDeckName && ` Facing: ${opponentDeckName}.`}
      </p>
      <div className="deck-choices">
        {Object.values(STARTER_DECKS).map((deck) => (
          <button key={deck.id} type="button" className="deck-choice-card" onClick={() => onChoosePreset(deck.id)}>
            <h2>{deck.name}</h2>
            <p>{deck.description}</p>
          </button>
        ))}
        <button type="button" className="deck-choice-card deck-choice-custom" onClick={onBuildCustom}>
          <h2>Build Custom Deck</h2>
          <p>Pick your own 10 cards from the full roster.</p>
        </button>
      </div>
    </div>
  );
}
