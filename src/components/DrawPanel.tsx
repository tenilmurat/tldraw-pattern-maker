import { useMemo, type Dispatch } from 'react'
import { PALETTES } from '../engine/color'
import { createDrawRenderer } from '../engine/draw'
import { DRAW_SYMMETRIES, SYMMETRIES } from '../engine/symmetry'
import type { DrawArt } from '../engine/tldraw'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { OptionCard, Section, Slider } from './controls'
import { MiniPattern } from './MiniPattern'

const PAPERS = ['#ffffff', ...new Set(PALETTES.map((p) => p.paper))]

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
  const paper = state.palette.paper

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
            <b>A frame</b>
            <span>A free canvas. Draw anything; the pattern is made from it.</span>
          </button>
          <button
            type="button"
            className="surface-card"
            aria-pressed={surface === 'pattern'}
            onClick={() => dispatch({ type: 'surface', surface: 'pattern' })}
          >
            <b>The pattern</b>
            <span>Draw anywhere on the repeat itself.</span>
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
          {PAPERS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={paper === c}
              className="ink"
              style={{ background: c }}
              title={c}
              onClick={() => dispatch({ type: 'palette', palette: { ...state.palette, name: 'Custom', paper: c } })}
            >
              <span className="sr-only">{c}</span>
            </button>
          ))}
        </div>
        <p className="note">Pens and colours are in the bar. In the frame, pick Select to move, resize or turn what you drew.</p>
      </Section>
    </>
  )
}
