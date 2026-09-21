import { useRef, useState } from 'react'
import type { Game, SaveData, Snapshot } from '../game/engine'

interface MenusProps {
  snap: Snapshot
  save: SaveData | null
  gameRef: React.RefObject<Game | null>
  onNew: () => void
  onContinue: () => void
}

export function Menus({ snap, gameRef, onNew, onContinue }: MenusProps) {
  const g = gameRef.current!
  const [wordAnswer, setWordAnswer] = useState('')
  const [codeAnswer, setCodeAnswer] = useState('')
  const [seqPick, setSeqPick] = useState<number[]>([])
  const wordRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  // After a wrong answer the puzzle stays open; put the caret back so typing keeps working
  const refocus = (r: React.RefObject<HTMLInputElement | null>) =>
    setTimeout(() => r.current?.focus(), 0)

  if (snap.status === 'dialog' && snap.dialog) {
    return (
      <div className="overlay">
        <div className="panel">
          <h2>{snap.dialog.title}</h2>
          {snap.dialog.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <button className="primary" onClick={() => g.closeDialog()}>
            Continue (Enter)
          </button>
        </div>
      </div>
    )
  }

  if (snap.status === 'puzzle' && snap.puzzle) {
    const pz = snap.puzzle.puzzle
    return (
      <div className="overlay">
        <div className="panel">
          <h2>🧩 Puzzle Lock</h2>
          {pz.kind === 'word' && (
            <>
              <p className="puzzle-body">{pz.scrambled}</p>
              <p className="hint">{pz.hint}</p>
              <input
                autoFocus
                ref={wordRef}
                value={wordAnswer}
                placeholder="answer"
                onChange={(e) => setWordAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    g.answerPuzzle(wordAnswer)
                    setWordAnswer('')
                    refocus(wordRef)
                  }
                }}
              />
              <button
                className="primary"
                onClick={() => {
                  g.answerPuzzle(wordAnswer)
                  setWordAnswer('')
                  refocus(wordRef)
                }}
              >
                Try
              </button>
            </>
          )}
          {pz.kind === 'code' && (
            <>
              <p className="puzzle-body">{pz.prompt}</p>
              <input
                autoFocus
                ref={codeRef}
                value={codeAnswer}
                placeholder="code"
                inputMode="numeric"
                onChange={(e) => setCodeAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    g.answerPuzzle(codeAnswer)
                    setCodeAnswer('')
                    refocus(codeRef)
                  }
                }}
              />
              <button
                className="primary"
                onClick={() => {
                  g.answerPuzzle(codeAnswer)
                  setCodeAnswer('')
                  refocus(codeRef)
                }}
              >
                Try
              </button>
            </>
          )}
          {pz.kind === 'sequence' && (
            <>
              <p className="hint">Repeat the pattern the radio hummed:</p>
              <div className="seq-row">
                {pz.shown.map((s, i) => (
                  <button
                    key={i}
                    className="seq-btn"
                    onClick={() => {
                      const next = [...seqPick, i]
                      if (next.length === pz.answer.length) {
                        g.answerPuzzle(next)
                        setSeqPick([])
                      } else setSeqPick(next)
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="seq-progress">{seqPick.map((i) => pz.shown[i]).join(' → ') || '—'}</p>
              <button onClick={() => setSeqPick([])}>Clear</button>
            </>
          )}
          <button className="ghost" onClick={() => g.cancelPuzzle()}>
            Step away
          </button>
        </div>
      </div>
    )
  }

  if (snap.status === 'caught') {
    return (
      <div className="overlay red">
        <div className="panel">
          <h2>🚨 CAUGHT!</h2>
          <p>They searched you and sent you back.</p>
          <p className="hint">Lose coins, food... and time.</p>
        </div>
      </div>
    )
  }

  if (snap.status === 'collapsed') {
    return (
      <div className="overlay red">
        <div className="panel">
          <h2>💀 COLLAPSED</h2>
          <p>{snap.deathReason || 'Your body gave out.'}</p>
          <p className="hint">Retrying City {snap.city} from Day 1...</p>
        </div>
      </div>
    )
  }

  if (snap.status === 'cityCleared') {
    return (
      <div className="overlay gold">
        <div className="panel">
          <h2>🎉 CITY {snap.city} CLEARED!</h2>
          <p>
            {snap.city === 100
              ? 'The last gate... beyond it, freedom.'
              : `Crossing into City ${snap.city + 1}...`}
          </p>
          <p className="hint">Days wasted here: {snap.daysInCity}</p>
        </div>
      </div>
    )
  }

  if (snap.status === 'victory') {
    return (
      <div className="overlay gold">
        <div className="panel">
          <h2>🌍 FREEDOM!</h2>
          <p>You crossed all 100 cities and left the country!</p>
          <p className="hint">
            Total days on the road: {snap.totalDays} · Close calls: {snap.deaths}
          </p>
          <button className="primary" onClick={onNew}>
            New Run
          </button>
        </div>
      </div>
    )
  }

  if (snap.status === 'briefing' || snap.status === 'title') {
    return (
      <div className="overlay">
        <div className="panel">
          <h1>BORDER RUN</h1>
          <p>City {snap.city} of 100 — {snap.region}</p>
          <button className="primary" onClick={onContinue}>
            Begin
          </button>
        </div>
      </div>
    )
  }

  return null
}
