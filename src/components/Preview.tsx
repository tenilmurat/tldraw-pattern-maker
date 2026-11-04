import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import { drawTileSize, withLiveStroke, type DrawRenderer } from '../engine/draw'
import { PEN } from '../engine/pens'
import type { Renderer } from '../engine/renderer'
import type { ShapeRenderer } from '../engine/shapes'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { DrawToolbar } from './draw/DrawToolbar'
import { useStrokeInput } from './draw/useStrokeInput'
import { DrawFrame } from './frame/DrawFrame'
import { ShapeFrame } from './frame/ShapeFrame'
import { frameBox, WorkFrame } from './frame/WorkFrame'

/**
 * The pattern itself, filling the window. It is always shown repeated many
 * times over, never as one tile with edges, so a seam would have nowhere to hide.
 *
 * In Shapes and Draw a working frame floats on top: one tile on graph paper
 * where you make the thing that repeats. Draw can also switch the frame off
 * and draw straight onto the pattern.
 */
export function Preview({
  renderer,
  state,
  dispatch,
}: {
  renderer: Renderer
  state: PatternState
  dispatch: Dispatch<Action>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rendererRef = useRef(renderer)
  const [view, setView] = useState({ w: 0, h: 0 })
  // Hiding the frame lasts until you switch mode or surface.
  const [hiddenFor, setHiddenFor] = useState<string | null>(null)
  const frameKey = `${state.mode}:${state.draw.surface}`
  const frameHidden = hiddenFor === frameKey
  const [cursor, setCursor] = useState<[number, number] | null>(null)

  /** Where the pattern's origin sits in the canvas: one repeat centred, snapped to device pixels. */
  const originOf = useCallback((r: Renderer): [number, number] => {
    const dpr = window.devicePixelRatio || 1
    const { w, h } = sizeRef.current
    return [Math.round((w / 2 - r.tileW / 2) * dpr) / dpr, Math.round((h / 2 - r.tileH / 2) * dpr) / dpr]
  }, [])

  const paint = useCallback(
    (r: Renderer) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const { w, h } = sizeRef.current
      const ctx = canvas.getContext('2d')!
      const [ox, oy] = originOf(r)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.translate(ox, oy)
      r.paint(ctx, -ox, -oy, w, h, dpr)
    },
    [originOf],
  )

  useEffect(() => {
    rendererRef.current = renderer
    paint(renderer)
  }, [renderer, paint])

  useLayoutEffect(() => {
    const canvas = canvasRef.current!
    const fit = (width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = { w: width, h: height }
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      setView({ w: width, h: height })
      paint(rendererRef.current)
    }
    // Measure straight away so the frame and pen bar appear on the first paint,
    // then keep following the window.
    const r = canvas.getBoundingClientRect()
    fit(r.width, r.height)
    const observer = new ResizeObserver(([entry]) => fit(entry.contentRect.width, entry.contentRect.height))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [paint])

  // --- What's on screen ------------------------------------------------------

  const isDraw = state.mode === 'draw'
  const drawOnPattern = isDraw && state.draw.surface === 'pattern'
  const hasFrame = (state.mode === 'shapes' || (isDraw && state.draw.surface === 'frame')) && !frameHidden
  // The drawing canvas is always square, whatever the repeat style; Shapes shows one tile.
  const aspect = isDraw ? 1 : renderer.tileH / renderer.tileW
  const box = view.w ? frameBox(view.w, view.h, aspect, isDraw) : null

  // Where the pen bar sits: hanging off the bottom of the frame, or at the foot of the window.
  const narrow = view.w <= 720
  const freeW = narrow ? view.w : view.w - 364
  const barPosition =
    hasFrame && box
      ? { left: box.left + box.w / 2, top: box.top + box.h - 38 }
      : narrow
        ? { left: view.w / 2, top: 12 }
        : { left: freeW / 2, top: view.h - 100 }

  // Drawing straight onto the pattern.
  const T = drawTileSize(state.size)
  const pen = PEN[state.draw.pen]
  const patternInput = useStrokeInput({
    state,
    dispatch,
    toLocal: (e) => {
      const r = canvasRef.current!.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    },
    unitPx: T,
    origin: () => originOf(rendererRef.current),
    onLive: (stroke) =>
      paint(
        withLiveStroke(rendererRef.current as DrawRenderer, stroke, {
          strokes: state.draw.strokes,
          symmetry: state.draw.symmetry,
          size: state.size,
          paper: state.palette.paper,
          rotation: state.draw.rotation,
        }),
      ),
  })

  const frameTitle = isDraw ? 'Your drawing' : 'Your tile'
  const frameHint = isDraw
    ? 'Draw anything. The pattern behind is made from it.'
    : state.shapes.layout === 'custom'
      ? 'Drag to move, tap to add, Delete to remove.'
      : 'Drag a shape to arrange it yourself, or tap to add one.'

  return (
    <div className={`preview ${drawOnPattern ? 'is-draw' : ''} ${hasFrame ? 'has-frame' : ''}`}>
      <canvas
        ref={canvasRef}
        {...(drawOnPattern ? patternInput.handlers : {})}
        onPointerMove={(e) => {
          if (!drawOnPattern) return
          setCursor([e.clientX - e.currentTarget.getBoundingClientRect().left, e.clientY - e.currentTarget.getBoundingClientRect().top])
          patternInput.handlers.onPointerMove(e)
        }}
        onPointerLeave={() => setCursor(null)}
        aria-label="Pattern preview"
        role="img"
      />

      {drawOnPattern && cursor && (
        <span
          className={`pen-cursor ${pen.erase ? 'is-eraser' : ''}`}
          style={{
            left: cursor[0],
            top: cursor[1],
            width: Math.max(4, state.draw.sizes[pen.id]),
            height: Math.max(4, state.draw.sizes[pen.id]),
            borderRadius: pen.cap === 'flat' && pen.nib === undefined ? 2 : '50%',
          }}
        />
      )}

      {hasFrame && box && (
        <WorkFrame
          box={box}
          paper={state.palette.paper}
          title={frameTitle}
          hint={frameHint}
          onHide={() => setHiddenFor(frameKey)}
        >
          {isDraw ? (
            <DrawFrame state={state} dispatch={dispatch} box={box} />
          ) : (
            <ShapeFrame state={state} dispatch={dispatch} renderer={renderer as ShapeRenderer} box={box} />
          )}
        </WorkFrame>
      )}

      {frameHidden && (state.mode === 'shapes' || isDraw) && (
        <button type="button" className="show-frame" onClick={() => setHiddenFor(null)}>
          Edit your tile
        </button>
      )}

      {isDraw && view.w > 0 && (drawOnPattern || hasFrame) && (
        <DrawToolbar state={state} dispatch={dispatch} hidden={patternInput.drawing} position={barPosition} />
      )}
    </div>
  )
}
