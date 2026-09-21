import { useRef } from 'react'
import type { Game, Snapshot } from '../game/engine'

export function TouchControls({ game, snap }: { game: Game; snap: Snapshot }) {
  const knobRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(false)

  const handleMove = (clientX: number, clientY: number) => {
    const pad = padRef.current
    if (!pad || !activeRef.current) return
    const rect = pad.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const radius = rect.width / 2
    let dx = (clientX - cx) / radius
    let dy = (clientY - cy) / radius
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    game.setTouchAxis(dx, dy)
    // pushing the stick near its edge = run
    game.setTouchRun(len > 0.85)
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx * (radius - 20)}px, ${dy * (radius - 20)}px)`
    }
  }

  const start = (e: React.PointerEvent) => {
    activeRef.current = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    handleMove(e.clientX, e.clientY)
  }

  const move = (e: React.PointerEvent) => {
    if (activeRef.current) e.preventDefault()
    handleMove(e.clientX, e.clientY)
  }

  const reset = () => {
    activeRef.current = false
    game.setTouchAxis(0, 0)
    game.setTouchRun(false)
    if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'
  }

  const playing = snap.status === 'playing'

  // fire on pointerdown OR touchstart so rapid taps never get dropped
  const btn = (action: Parameters<Game['action']>[0]) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      game.action(action)
    },
    onTouchStart: (e: React.TouchEvent) => e.preventDefault(),
  })

  return (
    <div className="touch">
      <div
        ref={padRef}
        className="joy-pad"
        style={{ display: playing ? 'block' : 'none' }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={reset}
        onPointerCancel={reset}
      >
        <div ref={knobRef} className="joy-knob" />
      </div>
      <div className="touch-btns" style={{ display: playing ? 'grid' : 'none' }}>
        <button {...btn('interact')}>E</button>
        <button {...btn('climb')}>↑↑</button>
        <button {...btn('hide')}>👀</button>
        <button {...btn('eat')}>🍞</button>
        <button {...btn('drink')}>💧</button>
        <button {...btn('sleep')}>🛏</button>
      </div>
    </div>
  )
}
