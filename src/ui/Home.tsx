interface HomeProps {
  onStart: () => void;
}

export function Home({ onStart }: HomeProps) {
  return (
    <div className="screen screen-home">
      <h1 className="screen-title">Season&rsquo;s Battle</h1>
      <p className="screen-tagline">A tactical card duel across five seasons.</p>
      <p className="screen-note">2-player pass-and-play — take turns on the same device.</p>
      <button type="button" className="btn btn-primary" onClick={onStart}>
        Start Match
      </button>
    </div>
  );
}
