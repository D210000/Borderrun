import type { Snapshot } from '../game/engine'

export function HUD({ snap }: { snap: Snapshot }) {
  const bar = (label: string, v: number, color: string) => (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <div className="stat-bar">
        <div className="stat-fill" style={{ width: `${v}%`, background: color }} />
      </div>
    </div>
  )

  const clock = `${String(snap.hour).padStart(2, '0')}:00 ${snap.night ? '🌙' : '☀️'}`

  return (
    <div className="hud">
      <div className="hud-top-left">
        <div className="hud-title">
          CITY {snap.city}/100 — {snap.region}
        </div>
        <div className="hud-sub">
          Day {snap.day} · {clock} · {snap.daysInCity}d here
        </div>
      </div>

      <div className="hud-top-right">
        {bar('Health', snap.health, snap.health < 30 ? '#d94040' : '#5fae5f')}
        {bar('Food', snap.hunger, snap.hunger < 25 ? '#d94040' : '#c98b3f')}
        {bar('Water', snap.thirst, snap.thirst < 25 ? '#d94040' : '#4f8fd9')}
        <div className="inv">
          🍞 {snap.food} · 💧 {snap.water} · 🪙 {snap.coins}
        </div>
      </div>

      <div className="hud-bottom-left">
        <div className="clues">
          🧩 Clues: {snap.cluesFound}/{snap.cluesTotal}{' '}
          {snap.hasPass ? '· ✅ BORDER PASS — RUN EAST!' : '· find the trail'}
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
