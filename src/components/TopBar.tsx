import { useEffect, useRef, useState, type Dispatch } from 'react'
import logo from '../assets/logo.svg'
import { EXPORTS, exportPng } from '../engine/export'
import type { Renderer } from '../engine/renderer'
import type { Action } from '../state/reducer'
import type { Mode, PatternState } from '../state/types'
import { Icons } from './controls'

const MODES: { id: Mode; name: string; hint: string }[] = [
  { id: 'shapes', name: 'Shapes', hint: 'Repeat simple shapes' },
  { id: 'draw', name: 'Draw', hint: 'Draw something and it repeats' },
  { id: 'photo', name: 'Photo', hint: 'Turn part of a photo into a pattern' },
  { id: 'paper', name: 'Paper', hint: 'Dots, squares, lines and more' },
]

/**
 * A full-width header in the style of tldraw flash: the logo on the left,
 * what to make a pattern from in the middle, Download on the right.
 */
export function TopBar({
  state,
  dispatch,
  renderer,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  renderer: Renderer
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the download menu on any click outside it.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  const download = async (id: string) => {
    const preset = EXPORTS.find((e) => e.id === id)!
    setSaving(id)
    try {
      await exportPng(renderer, preset, `pattern-${state.mode}`)
    } finally {
      setSaving(null)
      setMenuOpen(false)
    }
  }

  return (
    <header className="header">
      <div className="brand">
        <img src={logo} alt="tldraw pattern" width={101} height={20} />
      </div>

      <nav className="modes" aria-label="What to make a pattern from">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="mode"
            aria-pressed={state.mode === m.id}
            title={m.hint}
            onClick={() => dispatch({ type: 'mode', mode: m.id })}
          >
            {Icons[m.id]}
            <span>{m.name}</span>
          </button>
        ))}
      </nav>

      <div className="actions" ref={menuRef}>
        <button
          type="button"
          className="button outline"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          Download
        </button>
        {menuOpen && (
          <ul className="download-menu">
            {EXPORTS.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => download(e.id)} disabled={!!saving}>
                  <span>{e.name}</span>
                  <small>{saving === e.id ? 'Saving…' : e.hint}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}
