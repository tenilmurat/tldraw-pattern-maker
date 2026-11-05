import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import type { Editor } from 'tldraw'
import { drawTileSize, withLiveStroke, type DrawRenderer } from '../engine/draw'
import { PEN } from '../engine/pens'
import type { Renderer } from '../engine/renderer'
import type { ShapeRenderer } from '../engine/shapes'
import type { DrawArt } from '../engine/tldraw'
import { paletteOf, type Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { Icons } from './controls'
import { DrawToolbar } from './draw/DrawToolbar'
import { useStrokeInput } from './draw/useStrokeInput'
import { DrawFrame } from './frame/DrawFrame'
import { ShapeFrame } from './frame/ShapeFrame'
import { frameBox, WorkFrame } from './frame/WorkFrame'
import { HOME, usePanZoom, type Camera } from './usePanZoom'
import { zoomedValue, zoomKnob } from '../engine/zoomKnob'

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
  art,
  onArt,
}: {
  renderer: Renderer
  state: PatternState
  dispatch: Dispatch<Action>
  art: DrawArt | null
  onArt: (art: DrawArt | null) => void
}) {
  // The tldraw canvas in the drawing frame, while it's open; the pen bar drives it.
  const [editor, setEditor] = useState<Editor | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rendererRef = useRef(renderer)
  const [view, setView] = useState({ w: 0, h: 0 })
  // Each time you come to a mode its frame starts the same way: Shapes opens on the whole
  // pattern with the frame tucked behind "Edit your tile"; Draw opens with its frame out.
  // Showing or hiding it yourself lasts until you switch mode or surface.
  const frameKey = `${state.mode}:${state.draw.surface}`
  const [choice, setChoice] = useState<{ key: string; hidden: boolean } | null>(null)
  // Leaving a mode forgets the choice, so coming back starts the way it always does.
  const [lastKey, setLastKey] = useState(frameKey)
  if (lastKey !== frameKey) {
    setLastKey(frameKey)
    setChoice(null)
  }
  const frameHidden = choice?.key === frameKey ? choice.hidden : state.mode === 'shapes'
  const [cursor, setCursor] = useState<[number, number] | null>(null)

  // Where you're looking on the endless pattern (pan and zoom).
  const camera = useRef<Camera>(HOME)

  /** Where the pattern's origin sits in the canvas: one repeat centred, then moved, snapped to device pixels. */
  const originOf = useCallback((r: Renderer): [number, number] => {
    const dpr = window.devicePixelRatio || 1
    const { w, h } = sizeRef.current
    const { x, y } = camera.current
    return [Math.round((w / 2 - r.tileW / 2 + x) * dpr) / dpr, Math.round((h / 2 - r.tileH / 2 + y) * dpr) / dpr]
  }, [])

  const paint = useCallback(
    (r: Renderer) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const { w, h } = sizeRef.current
      const ctx = canvas.getContext('2d')!
      const [ox, oy] = originOf(r)
      ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr)
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
  const drawFrameSurface = isDraw && state.draw.surface === 'frame'
  const hasFrame = (state.mode === 'shapes' || drawFrameSurface) && !frameHidden
  // The drawing canvas is always square, whatever the repeat style; Shapes shows one tile.
  const aspect = isDraw ? 1 : renderer.tileH / renderer.tileW
  const box = view.w ? frameBox(view.w, view.h, aspect, isDraw) : null

  // Where the pen bar sits: hanging off the bottom of the frame, or at the foot of the window.
  const narrow = view.w <= 720
  const freeW = narrow ? view.w : view.w - 344
  const barPosition =
    hasFrame && box
      ? { left: box.left + box.w / 2, top: box.top + box.h - 38 }
      : narrow
        ? { left: view.w / 2, top: 12 }
        : { left: freeW / 2, top: view.h - 100 }

  // Move and zoom the pattern like an endless canvas.
  // Zooming moves the pattern's size slider. Many pinch events land before React
  // re-renders, so the latest value is kept here too.
  const knob = zoomKnob(state)
  const knobValue = useRef(knob.value)
  useEffect(() => {
    knobValue.current = knob.value
  }, [knob.value])
  const pan = usePanZoom({
    target: canvasRef,
    size: () => sizeRef.current,
    canDrag: !drawOnPattern,
    onMove: (cam, now) => {
      camera.current = cam
      // A zoom's new position is painted together with its new size, when the renderer changes.
      if (now) paint(rendererRef.current)
    },
    onZoom: (factor) => {
      const from = knobValue.current
      const to = zoomedValue(knob, from, factor)
      if (to === from) return 1
      knobValue.current = to
      dispatch(knob.set(to))
      return knob.px(to) / knob.px(from)
    },
  })
  const zoomShare = Math.round(((knob.value - knob.min) / (knob.max - knob.min)) * 100)

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
          paper: paletteOf(state).paper,
          rotation: state.draw.rotation,
          art,
          turned: state.draw.turned,
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
    <div
      className={`preview ${drawOnPattern ? 'is-draw' : 'can-pan'} ${pan.dragging ? 'is-panning' : ''} ${hasFrame ? 'has-frame' : ''}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          if (pan.handlers.onPointerDown(e)) return
          if (drawOnPattern) patternInput.handlers.onPointerDown(e)
        }}
        onPointerUp={(e) => {
          if (pan.handlers.onPointerUp(e)) return
          if (drawOnPattern) patternInput.handlers.onPointerUp(e)
        }}
        onPointerCancel={(e) => {
          if (pan.handlers.onPointerUp(e)) return
          if (drawOnPattern) patternInput.handlers.onPointerCancel(e)
        }}
        onPointerMove={(e) => {
          if (pan.handlers.onPointerMove(e)) return
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

      {/* In Draw the tldraw canvas stays mounted while the frame is tucked away: the pattern is made from it. */}
      {(hasFrame || drawFrameSurface) && box && (
        <WorkFrame
          collapsed={!hasFrame}
          box={box}
          paper={paletteOf(state).paper}
          title={frameTitle}
          hint={frameHint}
          onHide={() => setChoice({ key: frameKey, hidden: true })}
        >
          {isDraw ? (
            <DrawFrame
              state={state}
              dispatch={dispatch}
              box={box}
              active={hasFrame}
              onEditor={setEditor}
              onArt={onArt}
            />
          ) : (
            <ShapeFrame state={state} dispatch={dispatch} renderer={renderer as ShapeRenderer} box={box} />
          )}
        </WorkFrame>
      )}

      <div className="zoom-pill" role="group" aria-label="Zoom">
        <button type="button" onClick={() => pan.zoomAt(view.w / 2, view.h / 2, 1 / 1.25)} aria-label="Zoom out">
          −
        </button>
        <button
          type="button"
          className="zoom-value"
          onClick={pan.reset}
          title="Size, the same as the slider. Click to move the pattern back to the middle."
          aria-label={`Size ${zoomShare}%. Move the pattern back to the middle`}
        >
          {zoomShare}%
        </button>
        <button type="button" onClick={() => pan.zoomAt(view.w / 2, view.h / 2, 1.25)} aria-label="Zoom in">
          +
        </button>
      </div>

      {frameHidden && (state.mode === 'shapes' || drawFrameSurface) && (
        <button type="button" className="show-frame" onClick={() => setChoice({ key: frameKey, hidden: false })}>
          {Icons.draw}
          Edit your tile
        </button>
      )}

      {isDraw && view.w > 0 && (drawOnPattern || hasFrame) && (
        <DrawToolbar
          state={state}
          dispatch={dispatch}
          hidden={patternInput.drawing}
          position={barPosition}
          editor={hasFrame ? editor : null}
        />
      )}
    </div>
  )
}
