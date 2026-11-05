import { useMemo, useState, type Dispatch } from 'react'
import { MOTIF_BY_ID, MOTIFS } from '../engine/motifs'
import { newId } from '../engine/random'
import { createShapeRenderer, LAYOUTS } from '../engine/shapes'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { Icons, OptionCard, Section, Slider } from './controls'
import { MiniPattern } from './MiniPattern'

function MotifIcon({ id }: { id: string }) {
  const motif = MOTIF_BY_ID.get(id)
  return motif ? <span className="motif-icon" dangerouslySetInnerHTML={{ __html: motif.svg }} /> : null
}

export function ShapesPanel({ state, dispatch }: { state: PatternState; dispatch: Dispatch<Action> }) {
  const { active, layout, space, custom, selected } = state.shapes
  const own = layout === 'custom'
  const inks = state.palette.inks
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const stamp = own ? custom?.stamps.find((s) => s.id === selected) : undefined
  const used = new Set(own ? custom?.stamps.map((s) => s.motif) : [])

  const layoutRenderers = useMemo(() => {
    const base = { active, size: 0.28, space: 0.5, palette: state.palette, seed: state.seed }
    const presets = LAYOUTS.map((l) => ({
      ...l,
      renderer: createShapeRenderer({ ...base, layout: l.id, custom: null }),
    }))
    if (!custom) return presets
    return [
      {
        id: 'custom' as const,
        name: 'Yours',
        hint: 'The arrangement you made in the frame',
        renderer: createShapeRenderer({ ...base, size: 0.15, layout: 'custom', custom }),
      },
      ...presets,
    ]
  }, [active, custom, state.palette, state.seed])

  return (
    <>
      <Section
        title="Shapes"
        aside={
          <span className="aside">
            {own ? 'Tap the frame to add more' : 'Pick one or more'}
          </span>
        }
      >
        <div className="motif-grid">
          {MOTIFS.map((m) => {
            // In your own arrangement the grid shows the shapes in your tile;
            // otherwise the shapes the layout repeats. Either way a tap turns one on or off.
            const on = own ? used.has(m.id) : active.includes(m.id)
            const last = on && (own ? used.size : active.length) === 1
            return (
              <button
                key={m.id}
                type="button"
                className="motif-toggle"
                aria-pressed={on}
                title={last ? 'Your pattern needs at least one shape' : m.name}
                onClick={() => dispatch({ type: 'toggleShape', id: m.id })}
              >
                <MotifIcon id={m.id} />
                <span className="sr-only">{m.name}</span>
              </button>
            )
          })}
        </div>

        {!own && active.length > 1 && (
          <div className="order">
            <span className="order-label">Order · drag to rearrange</span>
            <ol className="order-list">
              {active.map((id, i) => (
                <li
                  key={id}
                  draggable
                  className={dragFrom === i ? 'is-dragging' : undefined}
                  onDragStart={() => setDragFrom(i)}
                  onDragEnd={() => setDragFrom(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom !== null && dragFrom !== i) dispatch({ type: 'moveShape', from: dragFrom, to: i })
                    setDragFrom(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' && i > 0) dispatch({ type: 'moveShape', from: i, to: i - 1 })
                    if (e.key === 'ArrowRight' && i < active.length - 1)
                      dispatch({ type: 'moveShape', from: i, to: i + 1 })
                  }}
                  tabIndex={0}
                  aria-label={`${MOTIF_BY_ID.get(id)?.name}, position ${i + 1}. Use left and right arrows to move.`}
                  style={{ color: inks[i % inks.length] }}
                >
                  <span className="grip">{Icons.grip}</span>
                  <MotifIcon id={id} />
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="button-row">
          <button
            type="button"
            className="button"
            title="New places and sizes for your shapes"
            onClick={() => dispatch({ type: 'scatterShapes' })}
          >
            {Icons.shuffle}
            Shuffle
          </button>
          <button
            type="button"
            className="button"
            title="A new set of colours that go together"
            onClick={() => dispatch({ type: 'shufflePalette' })}
          >
            {Icons.palette}
            New colours
          </button>
        </div>
      </Section>

      {stamp && (
        <Section
          title="Selected shape"
          aside={
            <button type="button" className="chip" onClick={() => dispatch({ type: 'selectStamp', id: null })}>
              Done
            </button>
          }
        >
          <div className="ink-row" role="radiogroup" aria-label="Colour">
            {inks.map((c, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={stamp.ink % inks.length === i}
                className="ink"
                style={{ background: c }}
                onClick={() => dispatch({ type: 'updateStamp', id: stamp.id, patch: { ink: i } })}
              >
                <span className="sr-only">Colour {i + 1}</span>
              </button>
            ))}
          </div>
          <Slider
            label="Size"
            low="Smaller"
            high="Bigger"
            min={0.03}
            max={0.8}
            value={stamp.size}
            onChange={(size) => dispatch({ type: 'updateStamp', id: stamp.id, patch: { size } })}
          />
          <Slider
            label="Turn"
            low="Left"
            high="Right"
            min={-180}
            max={180}
            step={1}
            readout={`${Math.round(stamp.rot)}°`}
            value={((stamp.rot + 540) % 360) - 180}
            onChange={(rot) => dispatch({ type: 'updateStamp', id: stamp.id, patch: { rot } })}
            onReset={() => dispatch({ type: 'updateStamp', id: stamp.id, patch: { rot: 0 } })}
          />
          <div className="button-row">
            <button
              type="button"
              className="button"
              onClick={() =>
                dispatch({
                  type: 'addStamp',
                  stamp: { ...stamp, id: newId(), x: (stamp.x + 0.12) % 1, y: (stamp.y + 0.12) % 1 },
                })
              }
            >
              Duplicate
            </button>
            <button type="button" className="button" onClick={() => dispatch({ type: 'removeStamp', id: stamp.id })}>
              {Icons.trash}
              Remove
            </button>
          </div>
        </Section>
      )}

      <Section title="Layout">
        <div className="option-grid">
          {layoutRenderers.map((l) => (
            <OptionCard
              key={l.id}
              label={l.name}
              hint={l.hint}
              selected={layout === l.id}
              onSelect={() => dispatch({ type: 'layout', layout: l.id })}
            >
              <MiniPattern renderer={l.renderer} zoom={0.45} />
            </OptionCard>
          ))}
        </div>
      </Section>

      <Section title="Look">
        <Slider
          label={own ? 'Tile size' : 'Size'}
          low="Smaller"
          high="Bigger"
          value={state.size}
          onChange={(value) => dispatch({ type: 'size', value })}
        />
        {!own && (
          <Slider
            label="Space"
            low="Tighter"
            high="Roomier"
            value={space}
            onChange={(value) => dispatch({ type: 'space', value })}
          />
        )}
      </Section>
    </>
  )
}
