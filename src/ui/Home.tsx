import { CARD_DEFINITIONS } from '../content/cards';
import { CARD_PORTRAITS } from '../content/portraits';

interface HomeProps {
  onStartHotseat: () => void;
  onStartSolo: () => void;
  onShowGuide: () => void;
}

/** A hand-picked spread across seasons for the home screen's hero strip —
 * not "every card with art" (that's 18 and would be visual noise), just
 * enough to signal "this is an illustrated card game" before a player has
 * picked a deck or seen a single match. */
const SHOWCASE_CARD_IDS = [
  'ember_striker',
  'thornvine_skirmisher',
  'ice_piercer',
  'mesmerist',
  'bramble_reaper',
  'frostguard',
];

function HomeShowcase() {
  return (
    <div className="home-showcase" aria-hidden="true">
      {SHOWCASE_CARD_IDS.map((defId) => {
        const def = CARD_DEFINITIONS[defId];
        const file = CARD_PORTRAITS[defId];
        if (!file) return null;
        return (
          <img
            key={defId}
            className="home-showcase-portrait"
            src={`${import.meta.env.BASE_URL}portraits/${file}`}
            alt=""
            loading="lazy"
            title={def.name}
          />
        );
      })}
    </div>
  );
}

export function Home({ onStartHotseat, onStartSolo, onShowGuide }: HomeProps) {
  return (
    <div className="screen screen-home">
      <HomeShowcase />
      <h1 className="screen-title">Season&rsquo;s Battle</h1>
      <p className="screen-tagline">A tactical card duel across five seasons.</p>
      <p className="screen-note">Play pass-and-play with a friend, or solo against a bot opponent.</p>
      <div className="screen-home-actions">
        <button type="button" className="btn btn-primary" onClick={onStartHotseat}>
          Play Hotseat (2 Players)
        </button>
        <button type="button" className="btn btn-primary" onClick={onStartSolo}>
          Play vs Bot
        </button>
        <button type="button" className="btn" onClick={onShowGuide}>
          How to Play
        </button>
      </div>
    </div>
  );
}
