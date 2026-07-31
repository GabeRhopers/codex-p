interface HowToPlayProps {
  onClose: () => void;
}

/**
 * A single reference doc, opened as an overlay rather than a route, so it
 * never costs the player their place — from Home it's just a read before
 * starting, but from a live match (Board.tsx wires the same trigger into
 * its header) closing it must land you back exactly where you were,
 * mid-turn, with nothing about G/ctx touched.
 */
export function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="guide-panel-head">
          <h2 className="guide-title">How to Play</h2>
          <button type="button" className="btn guide-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="guide-body">
          <section className="guide-section">
            <h3>Objective</h3>
            <p>
              Be first to <strong>5 Elimination Points</strong>. You score 1 point for every enemy Normal card you
              destroy, and 2 for every enemy Titan.
            </p>
          </section>

          <section className="guide-section">
            <h3>The battlefield</h3>
            <p>
              Each side has <strong>5 lanes</strong>. Your lane 3 faces your opponent&rsquo;s lane 3 &mdash;
              that&rsquo;s what &ldquo;opposite&rdquo; means throughout. Most cards fill one lane; a{' '}
              <strong>Titan</strong> fills two adjacent lanes at once, as a single unit.
            </p>
          </section>

          <section className="guide-section">
            <h3>Your turn</h3>
            <p>
              You get <strong>2 moves</strong> per turn, and can attack <strong>at most once</strong> per turn no
              matter how many moves you have left. On the game&rsquo;s very first turn, the starting player can
              still move, defend, or use an ability &mdash; just not attack yet.
            </p>
          </section>

          <section className="guide-section">
            <h3>What a move can be</h3>
            <ul className="guide-list">
              <li>
                <span className="guide-item-name">Attack</span>
                <span className="guide-item-desc">
                  Strike using a card&rsquo;s Range. Damage hits every occupied lane the attack pattern reaches, in
                  full.
                </span>
              </li>
              <li>
                <span className="guide-item-name">Enter / Leave Defense Mode</span>
                <span className="guide-item-desc">
                  While defending, any single attack against you is capped at 1 damage &mdash; but you can&rsquo;t
                  attack, and most abilities are off-limits until you leave.
                </span>
              </li>
              <li>
                <span className="guide-item-name">Change Position</span>
                <span className="guide-item-desc">
                  A Normal card swaps places with an adjacent friendly Normal card, or pushes straight through an
                  adjacent Titan. A Titan slides as a two-lane unit, shoving whatever was in its new lane back into
                  the one it just left. Moving uses this card&rsquo;s whole turn &mdash; no attack or ability
                  afterward.
                </span>
              </li>
              <li>
                <span className="guide-item-name">Activate Ability</span>
                <span className="guide-item-desc">
                  Uses this card&rsquo;s turn instead of attacking. Most effects are permanent, adjusting that
                  card&rsquo;s Attack or Shield for the rest of the match. Mind Control costs both of your moves at
                  once.
                </span>
              </li>
            </ul>
          </section>

          <section className="guide-section">
            <h3>Range, explained</h3>
            <div className="guide-range-grid">
              <div className="guide-range-card">
                <span className="guide-range-label">Range 1</span>
                <p>The opposite lane, or one lane beside it &mdash; your choice of side.</p>
              </div>
              <div className="guide-range-card">
                <span className="guide-range-label">Range 2</span>
                <p>The opposite lane, plus one adjacent lane on the side you choose.</p>
              </div>
              <div className="guide-range-card">
                <span className="guide-range-label">Range 3</span>
                <p>The opposite lane and both lanes beside it, all at once.</p>
              </div>
            </div>
          </section>

          <section className="guide-section">
            <h3>Damage &amp; destruction</h3>
            <p>
              Damage comes off Shield first. A card at 0 Shield isn&rsquo;t destroyed yet &mdash; it&rsquo;s{' '}
              <strong>Broken</strong>, and the next hit of any size finishes it off, even the reduced 1 damage from
              attacking a defending card.
            </p>
            <p>
              When a card is destroyed, its owner scores the point immediately and it&rsquo;s replaced free from the
              bench &mdash; no move spent. The replacement is battle-shy for one turn: it can&rsquo;t act until its
              controller&rsquo;s next turn.
            </p>
          </section>

          <section className="guide-section">
            <h3>Titans</h3>
            <p>
              Bigger Shield pools, worth <strong>2 points</strong> instead of 1, and they occupy two lanes at once.
              That cuts both ways: a Range 2 or 3 attack whose pattern lands on both of a Titan&rsquo;s lanes hits it
              twice, once per lane &mdash; a wide attacker is a real answer to a Titan.
            </p>
          </section>

          <section className="guide-section">
            <h3>Special abilities</h3>
            <p className="guide-lede">
              Six cards across the roster carry an ability &mdash; three per starter deck. Activating one costs a
              move and replaces that card&rsquo;s attack for the turn.
            </p>
            <ul className="guide-list">
              <li>
                <span className="guide-item-name">Empower <em>&mdash; Firebrand</em></span>
                <span className="guide-item-desc">Permanently gains +1 Attack. No target needed.</span>
              </li>
              <li>
                <span className="guide-item-name">Ward <em>&mdash; Frostguard</em></span>
                <span className="guide-item-desc">
                  Permanently gains +1 Shield. Usable even while in Defense Mode.
                </span>
              </li>
              <li>
                <span className="guide-item-name">Feint <em>&mdash; Trickster</em></span>
                <span className="guide-item-desc">
                  Permanently gains +2 Shield &mdash; but not usable while in Defense Mode.
                </span>
              </li>
              <li>
                <span className="guide-item-name">Scorch <em>&mdash; Scorchcaller</em></span>
                <span className="guide-item-desc">Permanently reduces a target&rsquo;s Attack by 1. Needs a target.</span>
              </li>
              <li>
                <span className="guide-item-name">Numbing Frost <em>&mdash; Blizzardcaller</em></span>
                <span className="guide-item-desc">Permanently reduces a target&rsquo;s Attack by 2. Needs a target.</span>
              </li>
              <li>
                <span className="guide-item-name">Mesmerize <em>&mdash; Mesmerist</em></span>
                <span className="guide-item-desc">
                  Mind Control: costs both of your moves at once. Drops the target straight to 0 Shield and marks it
                  Broken &mdash; the next hit of any size destroys it. Needs a target.
                </span>
              </li>
            </ul>
          </section>

          <section className="guide-section">
            <h3>The two Alliances</h3>
            <p>Both starter decks mix cards from several seasons rather than sticking to one &mdash; but they play very differently.</p>
            <div className="guide-alliances">
              <div className="guide-alliance-card guide-alliance-vanguard">
                <h4>Vanguard&rsquo;s Alliance</h4>
                <p>Aggressive strike force. Leans on higher Attack and a Titan built to push forward.</p>
              </div>
              <div className="guide-alliance-card guide-alliance-warden">
                <h4>Warden&rsquo;s Alliance</h4>
                <p>Defensive formation. Leans on Shield and abilities that hold the line.</p>
              </div>
            </div>
          </section>

          <section className="guide-section">
            <h3>Quick reference</h3>
            <table className="guide-table">
              <tbody>
                <tr>
                  <td>Moves per turn</td>
                  <td>2</td>
                </tr>
                <tr>
                  <td>Attacks per turn</td>
                  <td>1 max</td>
                </tr>
                <tr>
                  <td>Elimination points to win</td>
                  <td>5</td>
                </tr>
                <tr>
                  <td>Points per Normal card destroyed</td>
                  <td>1</td>
                </tr>
                <tr>
                  <td>Points per Titan destroyed</td>
                  <td>2</td>
                </tr>
                <tr>
                  <td>Damage cap while defending</td>
                  <td>1</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
