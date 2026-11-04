import type { Dispatch } from 'react'
import { PALETTES } from '../engine/color'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { Icons, Section } from './controls'

/** Named colour sets plus one Shuffle that only ever produces sets that go together. */
export function ColoursSection({ state, dispatch }: { state: PatternState; dispatch: Dispatch<Action> }) {
  const current = state.palette
  const same = (a: typeof current, b: typeof current) => a.name === b.name && a.paper === b.paper
  const isCurated = PALETTES.some((p) => same(p, current))
  const list = isCurated ? PALETTES : [current, ...PALETTES]

  return (
    <Section
      title="Colours"
      aside={
        <button type="button" className="chip" onClick={() => dispatch({ type: 'shufflePalette' })}>
          {Icons.shuffle}
          Shuffle
        </button>
      }
    >
      <div className="palette-grid" role="radiogroup" aria-label="Colours">
        {list.map((p, i) => (
          <button
            key={`${p.name}-${i}`}
            type="button"
            role="radio"
            aria-checked={same(p, current)}
            className="palette"
            title={p.name}
            onClick={() => dispatch({ type: 'palette', palette: p })}
          >
            <span className="palette-swatch" style={{ background: p.paper }}>
              {p.inks.map((ink, j) => (
                <span key={j} style={{ background: ink }} />
              ))}
            </span>
            <span className="palette-name">{p.name}</span>
          </button>
        ))}
      </div>
    </Section>
  )
}
