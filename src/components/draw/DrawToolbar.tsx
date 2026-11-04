import { useEffect, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import { PEN, PENS, SWATCHES } from '../../engine/pens'
import type { Action } from '../../state/reducer'
import type { PatternState } from '../../state/types'
import { Icons } from '../controls'
import { PenArt } from './PenArt'

type View = 'tools' | 'colours' | 'settings' | 'min'

const chevron = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m14.5 6-6 6 6 6" />
  </svg>
)
const shrink = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 14h6v6M20 10h-6V4M10 14l-6 6M14 10l6-6" />
  </svg>
)

/**
 * The drawing bar. It changes shape instead of opening panels: the pens
 * become the colour row, or two sliders, or roll up into a disc that still
 * shows the pen in your hand. Its width animates between each shape.
 */
export function DrawToolbar({
  state,
  dispatch,
  hidden,
  position,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  hidden: boolean
  /** Centre of the bar's top edge, in px within the preview. */
  position: { left: number; top: number }
}) {
  const [view, setView] = useState<View>('tools')
  const wrapRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)

  // One tooltip for the whole bar. It glides to whichever control is under
  // the pointer, its width morphs, and the old name rolls up as the new one
  // rolls in. Appearing from nothing it fades in where it is, without gliding.
  const [tip, setTip] = useState<{ x: number; label: string; n: number; fresh: boolean }>({
    x: 0,
    label: '',
    n: 0,
    fresh: true,
  })
  const [prev, setPrev] = useState<string | null>(null)
  const [tipOn, setTipOn] = useState(false)
  const [tipW, setTipW] = useState(0)

  const onPointerOver = (e: React.PointerEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-tip]')
    const wrap = wrapRef.current
    if (!el || !wrap || e.pointerType === 'touch') return
    const a = el.getBoundingClientRect()
    const b = wrap.getBoundingClientRect()
    const label = el.dataset.tip!
    if (tipOn && label === tip.label) return
    setPrev(tipOn ? tip.label : null)
    setTip({ x: a.left + a.width / 2 - b.left, label, n: tip.n + 1, fresh: !tipOn })
    setTipOn(true)
  }

  useLayoutEffect(() => {
    if (measureRef.current) setTipW(measureRef.current.offsetWidth)
  }, [tip.label])

  const innerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | undefined>(undefined)
  const { pen, ink, highlight, sizes, opacities, past, future, strokes } = state.draw
  const current = PEN[pen]
  const colour = current.ownInk ? highlight : ink
  const inkFor = (id: keyof typeof PEN) => (PEN[id].ownInk ? highlight : ink)

  // Measure the content so the bar's width can animate between shapes.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const measure = () => setWidth(el.scrollWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view])

  // ⌘Z / ⇧⌘Z undo and redo; Escape returns to the pens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (e.key === 'Escape') {
        setView('tools')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  return (
    <div
      ref={wrapRef}
      className={`draw-bar-wrap ${hidden ? 'is-drawing' : ''}`}
      style={{ left: position.left, top: position.top }}
      onPointerOver={onPointerOver}
      onPointerLeave={() => setTipOn(false)}
    >
      <span className="tip-measure" ref={measureRef} aria-hidden="true">
        {tip.label}
      </span>
      <span
        className={`bar-tip ${tipOn ? 'is-on' : ''} ${tip.fresh ? 'is-fresh' : ''}`}
        style={{ left: tip.x, width: tipW || undefined }}
        role="tooltip"
        aria-hidden={!tipOn}
      >
        <span className="tip-label tip-in" key={tip.n}>
          {tip.label}
          </span>
        {prev && (
          <span className="tip-label tip-out" key={`out-${tip.n}`}>
            {prev}
          </span>
        )}
      </span>
    <div
      className={`draw-bar is-${view}`}
      style={{ width: width !== undefined ? width : undefined }}
      role="toolbar"
      aria-label="Drawing tools"
    >
      <div className="draw-bar-inner" ref={innerRef} key={view}>
        {view === 'min' && (
          <button type="button" className="disc" onClick={() => setView('tools')} data-tip="Show tools">
            <span className="disc-pen">
              <PenArt pen={pen} ink={colour} />
            </span>
          </button>
        )}

        {view === 'tools' && (
          <>
            <div className="bar-group">
              <button type="button" className="bar-icon" onClick={() => dispatch({ type: 'undo' })} disabled={!past.length} data-tip="Undo">
                {Icons.undo}
                <span className="sr-only">Undo</span>
              </button>
              <button type="button" className="bar-icon" onClick={() => dispatch({ type: 'redo' })} disabled={!future.length} data-tip="Redo">
                {Icons.redo}
                <span className="sr-only">Redo</span>
              </button>
              <button type="button" className="bar-icon" onClick={() => dispatch({ type: 'clear' })} disabled={!strokes.length} data-tip="Clear">
                {Icons.trash}
                <span className="sr-only">Clear</span>
              </button>
            </div>
            <span className="bar-rule" />
            <div className="pen-tray">
              {PENS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  style={{ '--i': i } as React.CSSProperties}
                  className="pen-slot"
                  aria-pressed={pen === p.id}
                  data-tip={p.name}
                  onClick={() => dispatch({ type: 'pen', pen: p.id })}
                >
                  <PenArt pen={p.id} ink={inkFor(p.id)} />
                  <span className="sr-only">{p.name}</span>
                </button>
              ))}
            </div>
            <span className="bar-rule" />
            <div className="bar-group">
              <button type="button" className="bar-icon" onClick={() => setView('settings')} data-tip="Size & opacity">
                <span
                  className="size-dot"
                  style={{
                    width: Math.min(16, Math.max(3, sizes[pen] / 2.5)),
                    height: Math.min(16, Math.max(3, sizes[pen] / 2.5)),
                    background: current.erase ? 'var(--bar-ink)' : colour,
                  }}
                />
                <span className="sr-only">Size and opacity</span>
              </button>
              <button type="button" className="bar-icon" onClick={() => setView('colours')} data-tip="Colour">
                <span className="colour-ring">
                  <span style={{ background: colour }} />
                </span>
                <span className="sr-only">Ink colour</span>
              </button>
            </div>
            <span className="bar-rule" />
            <button type="button" className="bar-icon" onClick={() => setView('min')} data-tip="Hide tools">
              {shrink}
              <span className="sr-only">Hide tools</span>
            </button>
          </>
        )}

        {view === 'colours' && (
          <>
            <button type="button" className="bar-icon" onClick={() => setView('tools')} data-tip="Back">
              {chevron}
              <span className="sr-only">Back to tools</span>
            </button>
            <span className="bar-rule" />
            <div className="swatches" role="radiogroup" aria-label="Ink colour">
              {SWATCHES.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c.toLowerCase() === colour.toLowerCase()}
                  className="swatch"
                  style={{ background: c, '--i': i } as React.CSSProperties}
                  title={c}
                  onClick={() => dispatch({ type: 'inkColour', colour: c })}
                >
                  <span className="sr-only">{c}</span>
                </button>
              ))}
            </div>
            <span className="bar-rule" />
            <label className="swatch custom" title="Any colour">
              <input
                type="color"
                value={colour}
                onChange={(e) => dispatch({ type: 'inkColour', colour: e.target.value })}
              />
              <span className="sr-only">Pick any colour</span>
            </label>
          </>
        )}

        {view === 'settings' && (
          <>
            <button type="button" className="bar-icon" onClick={() => setView('tools')} data-tip="Back">
              {chevron}
              <span className="sr-only">Back to tools</span>
            </button>
            <span className="bar-rule" />
            <label className="bar-slider">
              <span>
                Size <b>{Math.round(sizes[pen])}</b>
              </span>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={sizes[pen]}
                style={{ '--fill': `${((sizes[pen] - 1) / 59) * 100}%` } as React.CSSProperties}
                onChange={(e) => dispatch({ type: 'penSize', value: Number(e.target.value) })}
              />
            </label>
            <span className="bar-rule" />
            <label className="bar-slider">
              <span>
                Opacity <b>{Math.round(opacities[pen] * 100)}%</b>
              </span>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={Math.round(opacities[pen] * 100)}
                style={{ '--fill': `${((opacities[pen] * 100 - 10) / 90) * 100}%` } as React.CSSProperties}
                onChange={(e) => dispatch({ type: 'penOpacity', value: Number(e.target.value) / 100 })}
              />
            </label>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
