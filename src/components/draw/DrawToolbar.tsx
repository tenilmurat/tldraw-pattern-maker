import { useEffect, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import { useValue, type Editor } from 'tldraw'
import { PEN, PENS, SWATCHES } from '../../engine/pens'
import {
  colourValue,
  DefaultColorStyle,
  DefaultSizeStyle,
  takePen,
  TL_COLOURS,
  TL_SIZE_NAMES,
  TL_SIZES,
} from '../../engine/tldraw'
import type { Action } from '../../state/reducer'
import type { PatternState } from '../../state/types'
import { Icons } from '../controls'
import { SVG_ART, type SvgArtShape } from '../frame/SvgArtShape'
import { PenArt } from './PenArt'

type View = 'tools' | 'colours' | 'settings' | 'min'

/** "light-violet" → "Light violet". */
const colourName = (c: string) => c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')


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
  editor,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  hidden: boolean
  /** The tldraw frame, when you're drawing in it. Without it the bar drives the pattern pens. */
  editor: Editor | null
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
  const { pen, ink, sizes, opacities, past, future, strokes } = state.draw
  const current = PEN[pen]

  // In the frame, everything comes from tldraw: its tool, colour, size, opacity and history.
  const tl = useValue(
    'drawing bar',
    () =>
      editor && {
        tool: editor.getCurrentToolId(),
        colour: editor.getStyleForNextShape(DefaultColorStyle),
        size: editor.getStyleForNextShape(DefaultSizeStyle),
        opacity: editor.getInstanceState().opacityForNextShape,
        canUndo: editor.getCanUndo(),
        canRedo: editor.getCanRedo(),
        empty: editor.getCurrentPageShapeIds().size === 0,
        drawing: editor.isInAny('draw.drawing', 'highlight.drawing', 'eraser.erasing'),
        // Selected SVGs, which can also go back to their own colours.
        svgs: editor.getSelectedShapes().filter((s) => s.type === SVG_ART) as SvgArtShape[],
      },
    [editor],
  )
  // Every pen, the highlighter too, shows the colour you picked.
  const colour = editor && tl ? colourValue(editor, tl.colour) : ink
  const selecting = !!tl && tl.tool === 'select'
  const sizeIndex = tl ? TL_SIZES.indexOf(tl.size) : 0
  const opacity = tl ? tl.opacity : opacities[pen]

  const undo = () => (editor ? editor.undo() : dispatch({ type: 'undo' }))
  const redo = () => (editor ? editor.redo() : dispatch({ type: 'redo' }))
  const clear = () => {
    if (!editor) return dispatch({ type: 'clear' })
    editor.markHistoryStoppingPoint('clear')
    editor.deleteShapes([...editor.getCurrentPageShapeIds()])
  }
  const choosePen = (id: keyof typeof PEN) => {
    dispatch({ type: 'pen', pen: id })
    if (editor) takePen(editor, id)
  }

  // Measure the content so the bar's width can animate between shapes.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    // The laid-out width, not scrollWidth: the rolled-up pen reaches past its circle on purpose.
    const measure = () => setWidth(el.offsetWidth)
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
        // tldraw already undoes its own drawing while it has focus.
        if (editor?.getInstanceState().isFocused) return
        e.preventDefault()
        if (editor) {
          if (e.shiftKey) editor.redo()
          else editor.undo()
        } else dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (e.key === 'Escape') {
        setView('tools')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, editor])

  return (
    <div
      ref={wrapRef}
      className={`draw-bar-wrap ${hidden || tl?.drawing ? 'is-drawing' : ''}`}
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
            {/* The pen drawn twice: once inside the circle (hiding the end of the barrel),
                once on the nib's side only, so the tip reaches out past the edge. */}
            <span className="disc-layer is-inside" aria-hidden="true">
              <span className="disc-pen">
                <PenArt pen={pen} ink={colour} />
              </span>
            </span>
            <span className="disc-layer is-tip" aria-hidden="true">
              <span className="disc-pen">
                <PenArt pen={pen} ink={colour} />
              </span>
            </span>
            <span className="sr-only">Show tools</span>
          </button>
        )}

        {view === 'tools' && (
          <>
            <div className="bar-group">
              <button type="button" className="bar-icon" onClick={undo} disabled={tl ? !tl.canUndo : !past.length} data-tip="Undo">
                {Icons.undo}
                <span className="sr-only">Undo</span>
              </button>
              <button type="button" className="bar-icon" onClick={redo} disabled={tl ? !tl.canRedo : !future.length} data-tip="Redo">
                {Icons.redo}
                <span className="sr-only">Redo</span>
              </button>
              <button type="button" className="bar-icon" onClick={clear} disabled={tl ? tl.empty : !strokes.length} data-tip="Clear">
                {Icons.trash}
                <span className="sr-only">Clear</span>
              </button>
            </div>
            <span className="bar-rule" />
            {editor && (
              <button
                type="button"
                className="bar-icon select-tool"
                aria-pressed={selecting}
                onClick={() => editor.setCurrentTool('select')}
                data-tip="Select"
              >
                {Icons.cursor}
                <span className="sr-only">Select, move and resize</span>
              </button>
            )}
            <div className="pen-tray">
              {PENS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  style={{ '--i': i } as React.CSSProperties}
                  className="pen-slot"
                  aria-pressed={pen === p.id && !selecting}
                  data-tip={p.name}
                  onClick={() => choosePen(p.id)}
                >
                  <PenArt pen={p.id} ink={colour} />
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
                    width: tl ? 4 + sizeIndex * 4 : Math.min(16, Math.max(3, sizes[pen] / 2.5)),
                    height: tl ? 4 + sizeIndex * 4 : Math.min(16, Math.max(3, sizes[pen] / 2.5)),
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
              {Icons.collapse}
              <span className="sr-only">Hide tools</span>
            </button>
          </>
        )}

        {view === 'colours' && (
          <>
            <button type="button" className="bar-icon" onClick={() => setView('tools')} data-tip="Back">
              {Icons.back}
              <span className="sr-only">Back to tools</span>
            </button>
            <span className="bar-rule" />
            {editor && tl ? (
              <div className="swatches" role="radiogroup" aria-label="Ink colour">
                {TL_COLOURS.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={tl.colour === c}
                    className="swatch"
                    style={{ background: colourValue(editor, c), '--i': i } as React.CSSProperties}
                    data-tip={colourName(c)}
                    onClick={() => {
                      editor.markHistoryStoppingPoint('colour')
                      editor.setStyleForNextShapes(DefaultColorStyle, c)
                      editor.setStyleForSelectedShapes(DefaultColorStyle, c)
                      // Picking the colour an SVG already has still recolours it.
                      if (tl.svgs.length)
                        editor.updateShapes(tl.svgs.map((s) => ({ id: s.id, type: SVG_ART, props: { tinted: true } })))
                    }}
                  >
                    <span className="sr-only">{colourName(c)}</span>
                  </button>
                ))}
                {tl.svgs.length > 0 && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={tl.svgs.every((s) => !s.props.tinted)}
                    className="swatch own-colours-swatch"
                    data-tip="Its own colours"
                    onClick={() => {
                      editor.markHistoryStoppingPoint('own colours')
                      editor.updateShapes(tl.svgs.map((s) => ({ id: s.id, type: SVG_ART, props: { tinted: false } })))
                    }}
                  >
                    <span className="sr-only">Back to the SVG's own colours</span>
                  </button>
                )}
              </div>
            ) : (
            <>
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
          </>
        )}

        {view === 'settings' && (
          <>
            <button type="button" className="bar-icon" onClick={() => setView('tools')} data-tip="Back">
              {Icons.back}
              <span className="sr-only">Back to tools</span>
            </button>
            <span className="bar-rule" />
            {editor && tl ? (
              <label className="bar-slider">
                <span>
                  Size <b>{TL_SIZE_NAMES[tl.size]}</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={1}
                  value={sizeIndex}
                  style={{ '--fill': `${(sizeIndex / 3) * 100}%` } as React.CSSProperties}
                  onChange={(e) => {
                    const size = TL_SIZES[Number(e.target.value)]
                    editor.setStyleForNextShapes(DefaultSizeStyle, size)
                    editor.setStyleForSelectedShapes(DefaultSizeStyle, size)
                  }}
                />
              </label>
            ) : (
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
            )}
            <span className="bar-rule" />
            <label className="bar-slider">
              <span>
                Opacity <b>{Math.round(opacity * 100)}%</b>
              </span>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={Math.round(opacity * 100)}
                style={{ '--fill': `${((opacity * 100 - 10) / 90) * 100}%` } as React.CSSProperties}
                onChange={(e) => {
                  const value = Number(e.target.value) / 100
                  if (!editor) return dispatch({ type: 'penOpacity', value })
                  editor.setOpacityForNextShapes(value)
                  editor.setOpacityForSelectedShapes(value)
                }}
              />
            </label>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
