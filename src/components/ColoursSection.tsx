import type { Dispatch } from 'react'
import { PALETTES, WHITE } from '../engine/color'
import { paletteOf, type Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { Icons, Section } from './controls'

/** Named colour sets plus one Shuffle that only ever produces sets that go together. */
export function ColoursSection({ state, dispatch }: { state: PatternState; dispatch: Dispatch<Action> }) {
  const current = paletteOf(state)
  const same = (a: typeof current, b: typeof current) => a.name === b.name && a.paper === b.paper
  // Plain white first, so a page can always go back to how it started.
  const sets = [WHITE, ...PALETTES]
  const isCurated = sets.some((p) => same(p, current))
  const list = isCurated ? sets : [current, ...sets]

  return (
    <Section
      title="Colours"
      aside={
        <button type="button" className="chip" onClick={() => dispatch({ type: 'shufflePalette' })}>
          {Icons.palette}
          New colours
        </button>
      }
    >
      {/* Your current colours, each one editable: tap a circle to pick a new colour. */}
      <div className="own-colours">
        <span className="own-colours-label">Your colours · tap to change</span>
        <div className="own-colours-row">
          <ColourWell
            label="Background"
            colour={current.paper}
            onChange={(colour) => dispatch({ type: 'editColour', slot: 'paper', colour })}
          />
          <span className="own-colours-divider" aria-hidden="true" />
          {current.inks.map((ink, i) => (
            <ColourWell
              key={i}
              label={`Colour ${i + 1}`}
              colour={ink}
              onChange={(colour) => dispatch({ type: 'editColour', slot: i, colour })}
            />
          ))}
        </div>
      </div>
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

/** A round swatch over the browser's own colour picker. */
function ColourWell({ label, colour, onChange }: { label: string; colour: string; onChange: (c: string) => void }) {
  return (
    <label className="colour-well" title={label} style={{ background: colour }}>
      <input type="color" value={colour} onChange={(e) => onChange(e.target.value)} />
      <span className="sr-only">{label}</span>
    </label>
  )
}
