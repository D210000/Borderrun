import { useEffect, useState } from 'react'

/**
 * Cryptic placeholder text.
 *
 * While `locked`, the copy renders as shimmering scrambled glyphs (unsolved
 * signal). When it unlocks, characters resolve left-to-right into readable
 * text — no extra data needed, the real string is simply hidden until then.
 */

const GLYPHS = '▓▒░#%&*<>/\\|=+~^?!01∆Ω¤§'

function scramble(text: string, keepFrom = 0): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (i < keepFrom || ch === ' ') out += ch
    else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
  }
  return out
}

interface GlitchTextProps {
  text: string
  locked: boolean
  className?: string
  /** lock shimmer interval in ms */
  speed?: number
}

export function GlitchText({ text, locked, className, speed = 110 }: GlitchTextProps) {
  const [out, setOut] = useState(() => (locked ? scramble(text) : text))

  useEffect(() => {
    if (!text) {
      setOut('')
      return
    }
    if (locked) {
      setOut(scramble(text))
      const id = setInterval(() => setOut(scramble(text)), speed)
      return () => clearInterval(id)
    }
    // resolve pass: readable characters march in from the left
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / 420)
      const revealed = Math.floor(p * text.length)
      setOut(revealed >= text.length ? text : text.slice(0, revealed) + scramble(text.slice(revealed), 0))
      if (revealed < text.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, locked, speed])

  return (
    <span className={`glitch${locked ? ' glitch-locked' : ''}${className ? ` ${className}` : ''}`} title={locked ? 'signal unresolved' : text}>
      {out}
    </span>
  )
}
