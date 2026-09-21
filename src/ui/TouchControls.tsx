import { useRef } from 'react'
import type { Game, Snapshot } from '../game/engine'

export function TouchControls({ game, snap }: { game: Game; snap: Snapshot }) {
  const knobRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number, clientY: number) => {
    const pad = padRef.current
    if (!pad) return
    const rect = pad.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = (clientX - cx) / (rect.width / 2)
    let dy = (clientY - cy) / (rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    game.setTouchAxis(dx, dy)
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`
    }
  }

  const reset = () => {
    game.setTouchAxis(0, 0)
    if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'
  }

  const playing = snap.status === 'playing'

  return (
    <div className="touch">
      <div
        ref={padRef}
        className="joy-pad"
        style={{ display: playing ? 'block' : 'none' }}
        onTouchStart={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={reset}
        onTouchCancel={reset}
      >
        <div ref={knobRef} className="joy-knob" />
      </div>
      <div className="touch-btns" style={{ display: playing ? 'grid' : 'none' }}>
        <button onTouchStart={() => game.action('interact')}>E</button>
        <button onTouchStart={() => game.action('climb')}>↑↑</button>
        <button onTouchStart={() => game.action('hide')}>👀</button>
        <button onTouchStart={() => game.action('eat')}>🍞</button>
        <button onTouchStart={() => game.action('drink')}>💧</button>
        <button onTouchStart={() => game.action('sleep')}>🛏</button>
      </div>
    </div>
  )
}
