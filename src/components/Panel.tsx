import { useState, type Dispatch } from 'react'
import { EXPORTS, exportPng } from '../engine/export'
import type { PhotoImage } from '../engine/photo'
import type { Renderer } from '../engine/renderer'
import type { Action } from '../state/reducer'
import type { Mode, PatternState } from '../state/types'
import { ColoursSection } from './ColoursSection'
import { Icons } from './controls'
import { DrawPanel } from './DrawPanel'
import { PaperPanel } from './PaperPanel'
import { PhotoPanel } from './PhotoPanel'
import { ShapesPanel } from './ShapesPanel'

const MODES: { id: Mode; name: string; hint: string }[] = [
  { id: 'shapes', name: 'Shapes', hint: 'Repeat simple shapes' },
  { id: 'draw', name: 'Draw', hint: 'Draw something and it repeats' },
  { id: 'photo', name: 'Photo', hint: 'Turn part of a photo into a pattern' },
  { id: 'paper', name: 'Paper', hint: 'Dots, squares, lines and more' },
]

export function Panel({
  state,
  dispatch,
  renderer,
  photo,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  renderer: Renderer
  photo: PhotoImage
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

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
    <aside className="panel" aria-label="Pattern settings">
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

      <div className="panel-body">
        {state.mode === 'shapes' && <ShapesPanel state={state} dispatch={dispatch} />}
        {state.mode === 'draw' && <DrawPanel state={state} dispatch={dispatch} />}
        {state.mode === 'photo' && <PhotoPanel state={state} dispatch={dispatch} image={photo} />}
        {state.mode === 'paper' && <PaperPanel state={state} dispatch={dispatch} />}
        {(state.mode === 'shapes' || state.mode === 'paper') && <ColoursSection state={state} dispatch={dispatch} />}
      </div>

      <footer className="panel-foot">
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
        <div className="foot-row">
          <button type="button" className="button" onClick={() => dispatch({ type: 'surprise' })}>
            {Icons.dice}
            Surprise me
          </button>
          <button
            type="button"
            className="button primary"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {Icons.download}
            Download
          </button>
        </div>
      </footer>
    </aside>
  )
}
