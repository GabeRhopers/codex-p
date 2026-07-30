import { Client } from 'boardgame.io/react';
import { CARD_DEFINITIONS } from '../content/cards';
import { STARTER_DECKS } from '../content/decks';
import { createSeasonsBattleGame } from '../game/game';
import { Board } from './Board';
import './board.css';

const game = createSeasonsBattleGame(CARD_DEFINITIONS, {
  '0': STARTER_DECKS.vanguardAlliance.setup,
  '1': STARTER_DECKS.wardenAlliance.setup,
});

const GameClient = Client({
  game,
  board: Board,
  numPlayers: 2,
  debug: false,
});

export function App() {
  return (
    <div className="app">
      <GameClient />
    </div>
  );
}
