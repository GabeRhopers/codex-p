import { STARTER_DECKS } from '../content/decks';

interface DeckSelectProps {
  /** Only Player 1 makes a choice here — with exactly two starter decks,
   * Player 2 always gets whichever one Player 1 didn't pick, so there's
   * nothing left for a second selection step to decide. */
  onChoose: (deckId: string) => void;
}

export function DeckSelect({ onChoose }: DeckSelectProps) {
  return (
    <div className="screen screen-deck-select">
      <h1 className="screen-title">Choose Your Alliance</h1>
      <p className="screen-note">Player 1, pick a deck — Player 2 will play the other.</p>
      <div className="deck-choices">
        {Object.values(STARTER_DECKS).map((deck) => (
          <button
            key={deck.id}
            type="button"
            className="deck-choice-card"
            onClick={() => onChoose(deck.id)}
          >
            <h2>{deck.name}</h2>
            <p>{deck.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
