import { useCallback, useEffect, useRef, useState } from 'react'
import { Game, loadSave, type SaveData } from './game/engine'
import { render } from './game/render'
import { HUD } from './ui/HUD'
import { Menus } from './ui/Menus'
import { TouchControls } from './ui/TouchControls'

const ENGINE_READY = typeof window !== 'undefined'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [, setTick] = useState(0)
  const [save, setSave] = useState<SaveData | null>(null)

  useEffect(() => {
    if (!ENGINE_READY) return
    setSave(loadSave())
  }, [])

  useEffect(() => {
    if (!ENGINE_READY) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    const loop = () => {
      const g = gameRef.current
      if (g) render(ctx, g, canvas.width, canvas.height)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    if (!ENGINE_READY) return
    const isTypingTarget = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

    const down = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (!g) return
      // Let the player type freely in puzzle/dialog inputs — never hijack WASD there
      if (isTypingTarget(e.target)) return
      // While an overlay is up, don't move the stickman or queue actions
      if (g.status !== 'playing') {
        if (e.code === 'Enter' && g.status === 'dialog') g.closeDialog()
        return
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault()
      if (e.code === 'KeyE') g.action('interact')
      else if (e.code === 'Space') g.action('climb')
      else if (e.code === 'KeyH') g.action('hide')
      else if (e.code === 'KeyF') g.action('eat')
      else if (e.code === 'KeyG') g.action('drink')
      else if (e.code === 'KeyT') g.action('sleep')
      else g.setKey(e.code, true)
    }
    const up = (e: KeyboardEvent) => {
      gameRef.current?.setKey(e.code, false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const subscribeTick = useCallback(() => {
    const g = gameRef.current
    if (!g) return () => {}
    return g.subscribe(() => setTick((t) => t + 1))
  }, [])

  const startNew = () => {
    const g = new Game(1)
    ;(window as unknown as { game?: Game }).game = g
    gameRef.current = g
    g.start()
    setTick((t) => t + 1)
  }

  const continueGame = () => {
    const s = loadSave()
    if (!s) return
    const g = new Game(Math.max(1, Math.min(100, s.city)), s.deaths, s.totalDays)
    ;(window as unknown as { game?: Game }).game = g
    gameRef.current = g
    g.start()
    setTick((t) => t + 1)
  }

  const snap = gameRef.current?.getSnapshot()
  const g = gameRef.current

  const unsubRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (g && !unsubRef.current) {
      unsubRef.current = subscribeTick()
    }
    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [g, subscribeTick])

  return (
    <div className="app">
      <canvas ref={canvasRef} className="game-canvas" />
      {g && snap && <HUD snap={snap} />}
      {g && snap && <TouchControls game={g} snap={snap} />}
      {g && snap && (
        <Menus
          snap={snap}
          save={save}
          gameRef={gameRef}
          onNew={startNew}
          onContinue={continueGame}
        />
      )}
      {!g && (
        <div className="title-holder">
          <h1>BORDER RUN</h1>
          <p className="tagline">100 cities. One stickman. Get out of the country.</p>
          <div className="menu-buttons">
            <button onClick={startNew}>New Run</button>
            <button disabled={!save} onClick={continueGame}>
              {save ? `Continue — City ${save.city}` : 'No Save'}
            </button>
          </div>
          <p className="controls-hint">
            WASD move · Shift run · E interact · Space climb · H hide · F eat · G drink · T sleep
          </p>
        </div>
      )}
    </div>
  )
}
