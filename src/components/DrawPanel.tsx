import { useMemo, type Dispatch } from 'react'
import { createDrawRenderer } from '../engine/draw'
import { DRAW_SYMMETRIES, SYMMETRIES } from '../engine/symmetry'
import type { DrawArt } from '../engine/tldraw'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { OptionCard, Section, Slider } from './controls'
import { MiniPattern } from './MiniPattern'

/** Iconoir "frame-simple": one tile with its corners. */
const frameIcon = (
  <svg className="surface-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.9984 2H2V4.9984H4.9984V2Z" />
    <path d="M4.9978 3.50098H18.998" />
    <path d="M3.49878 4.99805V19" />
    <path d="M20.4968 4.99951V19.0015" />
    <path d="M4.9978 20.501H18.998" />
    <path d="M4.9984 19H2V21.9984H4.9984V19Z" />
    <path d="M21.9964 2.00195H18.998V5.00035H21.9964V2.00195Z" />
    <path d="M21.9964 19.002H18.998V22.0004H21.9964V19.002Z" />
  </svg>
)

/** Iconoir "view-grid": the repeat, tile after tile. */
const patternIcon = (
  <svg className="surface-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M14 20.4V14.6C14 14.2686 14.2686 14 14.6 14H20.4C20.7314 14 21 14.2686 21 14.6V20.4C21 20.7314 20.7314 21 20.4 21H14.6C14.2686 21 14 20.7314 14 20.4Z" />
    <path d="M3 20.4V14.6C3 14.2686 3.26863 14 3.6 14H9.4C9.73137 14 10 14.2686 10 14.6V20.4C10 20.7314 9.73137 21 9.4 21H3.6C3.26863 21 3 20.7314 3 20.4Z" />
    <path d="M14 9.4V3.6C14 3.26863 14.2686 3 14.6 3H20.4C20.7314 3 21 3.26863 21 3.6V9.4C21 9.73137 20.7314 10 20.4 10H14.6C14.2686 10 14 9.73137 14 9.4Z" />
    <path d="M3 9.4V3.6C3 3.26863 3.26863 3 3.6 3H9.4C9.73137 3 10 3.26863 10 3.6V9.4C10 9.73137 9.73137 10 9.4 10H3.6C3.26863 10 3 9.73137 3 9.4Z" />
  </svg>
)

/** Soft whites to draw on, from pure white to warm and cool off-whites. */
const PAPERS = [
  { colour: '#ffffff', name: 'White' },
  { colour: '#fbf9f4', name: 'Ivory' },
  { colour: '#f8f3e8', name: 'Cream' },
  { colour: '#f5f1ea', name: 'Linen' },
  { colour: '#fbf4f1', name: 'Blush white' },
  { colour: '#f3f6f2', name: 'Mint white' },
  { colour: '#f2f5f9', name: 'Cool white' },
]

/** Pens live in the bar on the canvas; this panel is only about how the drawing repeats. */
export function DrawPanel({
  state,
  dispatch,
  art,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  art: DrawArt | null
}) {
  const { symmetry, strokes, rotation, turned } = state.draw
  const palette = state.modePalettes.draw
  const paper = palette.paper

  // Each choice previews *your* drawing in that style, not a stock picture.
  const options = useMemo(
    () =>
      DRAW_SYMMETRIES.map((id) => ({
        ...SYMMETRIES[id],
        renderer: createDrawRenderer({ strokes, symmetry: id, size: 0, paper, rotation, art, turned }),
      })),
    [strokes, paper, rotation, art, turned],
  )

  const surface = state.draw.surface
  const own = !PAPERS.some((p) => p.colour === paper)
  const setPaper = (colour: string) => dispatch({ type: 'palette', palette: { ...palette, name: 'Custom', paper: colour } })

  return (
    <>
      <Section title="Draw on">
        <div className="surface-grid">
          <button
            type="button"
            className="surface-card"
            aria-pressed={surface === 'frame'}
            onClick={() => dispatch({ type: 'surface', surface: 'frame' })}
          >
            {frameIcon}
            <b>A frame</b>
            <span>Draw one tile. We'll repeat it.</span>
          </button>
          <button
            type="button"
            className="surface-card"
            aria-pressed={surface === 'pattern'}
            onClick={() => dispatch({ type: 'surface', surface: 'pattern' })}
          >
            {patternIcon}
            <b>The pattern</b>
            <span>Draw right on the repeat.</span>
          </button>
        </div>
      </Section>

      <Section title="Repeat style" aside={<span className="aside">For the pattern</span>}>
        <div className="option-grid">
          {options.map((o) => (
            <OptionCard
              key={o.id}
              label={o.name}
              hint={o.hint}
              selected={symmetry === o.id}
              onSelect={() => dispatch({ type: 'drawSymmetry', symmetry: o.id })}
            >
              <MiniPattern renderer={o.renderer} zoom={0.35} />
            </OptionCard>
          ))}
        </div>
        <Slider
          label="Turn drawing"
          low="Left"
          high="Right"
          min={-180}
          max={180}
          step={1}
          readout={`${rotation}°`}
          value={rotation}
          onChange={(deg) => dispatch({ type: 'drawRotation', deg })}
          onReset={() => dispatch({ type: 'drawRotation', deg: 0 })}
        />
        <Slider
          label="Size"
          low="Smaller"
          high="Bigger"
          value={state.size}
          onChange={(value) => dispatch({ type: 'size', value })}
        />
      </Section>

      <Section title="Paper">
        <div className="ink-row" role="radiogroup" aria-label="Paper colour">
          {PAPERS.map((p) => (
            <button
              key={p.colour}
              type="button"
              role="radio"
              aria-checked={paper === p.colour}
              className="ink"
              style={{ background: p.colour }}
              title={p.name}
              onClick={() => setPaper(p.colour)}
            >
              <span className="sr-only">{p.name}</span>
            </button>
          ))}
          {/* Any colour you like: the circle shows your colour once you've picked one. */}
          <label
            className="ink paper-picker"
            title="Pick any colour"
            aria-checked={own}
            role="radio"
            style={own ? ({ '--own': paper } as React.CSSProperties) : undefined}
          >
            <input type="color" value={paper} onChange={(e) => setPaper(e.target.value)} />
            <span className="sr-only">Pick any colour for the paper</span>
          </label>
        </div>
        <p className="note">Pens and colours are in the bar. In the frame, pick Select to move, resize or turn what you drew.</p>
      </Section>
    </>
  )
}
