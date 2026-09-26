import { BRAND } from '../game/brand'
import type { Snapshot } from '../game/engine'
import { GlitchText } from './GlitchText'

const C = BRAND.colors

export function HUD({ snap }: { snap: Snapshot }) {
  const bar = (label: string, v: number, color: string) => (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <div className="stat-bar">
        <div className="stat-fill" style={{ width: `${v}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  )

  const clock = `${String(snap.hour).padStart(2, '0')}:00 ${snap.night ? '☾' : '☀'}`
  const lowHealth = snap.health < 30

  return (
    <div className="hud">
      <div className="hud-top-left">
        <div className="hud-title">
          CITY {snap.city}/100 <span className="hud-sep">·</span> {snap.region.toUpperCase()}
        </div>
        <div className="hud-sub">
          {snap.playerName} · Day {snap.day} · {clock} · {snap.daysInCity}d here
        </div>
      </div>

      <div className="hud-top-right">
        {bar('Health', snap.health, lowHealth ? C.bad : C.good)}
        {bar('Food', snap.hunger, snap.hunger < 25 ? C.bad : C.warn)}
        {bar('Water', snap.thirst, snap.thirst < 25 ? C.bad : C.cyan)}
        <div className="inv">
          🍞 {snap.food} · 💧 {snap.water} · <span className="dli">$DLI {snap.coins}</span>
        </div>
      </div>

      {/* signal tracker: opening cities only, first two clues */}
      {snap.clueTrack && !snap.hasPass && (
        <div className="tracker">
          <span
            className="tracker-arrow"
            style={{ transform: `rotate(${snap.clueTrack.angle}rad)` }}
            aria-hidden="true"
          >
            ➤
          </span>
          <span className="tracker-text">
            clue · {snap.clueTrack.distanceTiles} blk
          </span>
        </div>
      )}

      <div className="hud-bottom-left">
        <div className="clues">
          <span className="clue-count">
            CLUES {snap.cluesFound}/{snap.cluesTotal}
          </span>{' '}
          {snap.hasPass ? (
            <span className="pass-badge">BORDER PASS — RUN EAST</span>
          ) : snap.clueKnown ? (
            <GlitchText text={snap.clueHint} locked={false} />
          ) : (
            <GlitchText text={snap.clueHint || 'SIGNAL UNRESOLVED — FIND THE FIRST LANDMARK'} locked={true} />
          )}
        </div>
        {snap.guardsAlerted > 0 && <div className="alert-badge">🚨 CHASED BY {snap.guardsAlerted} GUARD(S)!</div>}
        {snap.nearSafehouse && !snap.hasPass && <div className="safe-badge">🛏 Safe to sleep (T)</div>}
      </div>

      {snap.promptText && <div className="prompt">{snap.promptText}</div>}

      <div className="toasts">
        {snap.toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
