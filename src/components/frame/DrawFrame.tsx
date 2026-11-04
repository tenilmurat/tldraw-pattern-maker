import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { drawPlain, forgetStroke } from '../../engine/draw'
import { PEN } from '../../engine/pens'
import type { Action } from '../../state/reducer'
import type { PatternState, Stroke } from '../../state/types'
import { useStrokeInput } from '../draw/useStrokeInput'
import type { FrameBox } from './WorkFrame'

const RING_R = 12.5
const RING_C = 2 * Math.PI * RING_R

/**
 * A free drawing canvas. What you draw here stays exactly as you drew it:
 * no mirrors, no wrapping. The pattern behind the frame is where the repeat
 * style turns this drawing into a pattern.
 */
export function DrawFrame({
  state,
  dispatch,
  box,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  box: FrameBox
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Finished strokes, drawn once; live drawing copies this and adds one stroke.
  const doneRef = useRef<HTMLCanvasElement | null>(null)
  const [cursor, setCursor] = useState<[number, number] | null>(null)
  // The canvas is one tile unit square.
  const unitPx = box.w
  const pen = PEN[state.draw.pen]
  const { strokes, rotation } = state.draw
  const [turning, setTurning] = useState(false)
  const turnRef = useRef<{ from: number; start: number } | null>(null)
  const lastTapRef = useRef(0)

  const render = useCallback(
    (list: Stroke[]) => {
      const dpr = window.devicePixelRatio || 1
      const layer = document.createElement('canvas')
      layer.width = Math.round(box.w * dpr)
      layer.height = Math.round(box.h * dpr)
      const ctx = layer.getContext('2d')!
      ctx.scale(dpr, dpr)
      drawPlain(ctx, list, unitPx, rotation)
      return layer
    },
    [box.w, box.h, unitPx, rotation],
  )

  const show = (layer: HTMLCanvasElement) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(layer, 0, 0)
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(box.w * dpr)
    canvas.height = Math.round(box.h * dpr)
    doneRef.current = render(strokes)
    show(doneRef.current)
  }, [strokes, render, box.w, box.h])

  const toLocal = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  const input = useStrokeInput({
    state,
    dispatch,
    toLocal,
    unitPx,
    origin: () => [0, 0],
    onLive: (stroke) => {
      const done = doneRef.current
      if (!done) return
      const dpr = window.devicePixelRatio || 1
      const layer = document.createElement('canvas')
      layer.width = done.width
      layer.height = done.height
      const ctx = layer.getContext('2d')!
      ctx.drawImage(done, 0, 0)
      ctx.scale(dpr, dpr)
      forgetStroke(stroke)
      drawPlain(ctx, [stroke], unitPx, rotation)
      show(layer)
    },
  })

  const size = state.draw.sizes[pen.id]

  // --- Turning the drawing ----------------------------------------------------
  // Drag the handle around the middle of the canvas. Straight (0°) is a detent:
  // the drawing stops there and holds until you turn clearly past it, with a
  // small "thunk" you can see (and feel, on phones that can buzz). It also
  // clicks onto 90° and 180°; Shift steps in 15°. Reset, or a double-tap, eases it back.
  const [bump, setBump] = useState(0)
  const atZeroRef = useRef(rotation === 0)
  const tweenRef = useRef(0)

  const thunk = () => {
    setBump((b) => b + 1)
    navigator.vibrate?.(8)
  }

  const angleAt = (e: React.PointerEvent) => {
    const [x, y] = toLocal(e)
    return (Math.atan2(y - box.h / 2, x - box.w / 2) * 180) / Math.PI
  }

  /** Ease the drawing back to straight instead of jumping. */
  const resetTurn = () => {
    cancelAnimationFrame(tweenRef.current)
    const from = rotation
    if (from === 0) return
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 320)
      const eased = 1 - (1 - t) ** 3
      dispatch({ type: 'drawRotation', deg: Math.round(from * (1 - eased)) })
      if (t < 1) tweenRef.current = requestAnimationFrame(step)
      else {
        atZeroRef.current = true
        thunk()
      }
    }
    tweenRef.current = requestAnimationFrame(step)
  }

  const onTurnDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    cancelAnimationFrame(tweenRef.current)
    // A second tap within a moment puts the drawing straight again.
    if (e.timeStamp - lastTapRef.current < 350) {
      lastTapRef.current = 0
      resetTurn()
      return
    }
    lastTapRef.current = e.timeStamp
    e.currentTarget.setPointerCapture(e.pointerId)
    turnRef.current = { from: angleAt(e), start: rotation }
    atZeroRef.current = rotation === 0
    setTurning(true)
  }

  const onTurnMove = (e: React.PointerEvent) => {
    const t = turnRef.current
    if (!t) return
    let deg = t.start + angleAt(e) - t.from
    deg = ((((deg + 180) % 360) + 360) % 360) - 180
    if (e.shiftKey) deg = Math.round(deg / 15) * 15
    else if (Math.abs(deg) < 10) deg = 0
    else {
      const nearest = Math.round(deg / 90) * 90
      if (Math.abs(deg - nearest) < 4) deg = nearest
    }
    deg = Math.round(deg)
    if (deg === 0 && !atZeroRef.current) thunk()
    atZeroRef.current = deg === 0
    dispatch({ type: 'drawRotation', deg })
  }

  const onTurnUp = () => {
    turnRef.current = null
    setTurning(false)
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="frame-canvas is-draw"
        {...input.handlers}
        onPointerMove={(e) => {
          setCursor(toLocal(e))
          input.handlers.onPointerMove(e)
        }}
        onPointerLeave={() => setCursor(null)}
        aria-label="Drawing canvas"
      />
      {turning && <span className="turn-guide" aria-hidden="true" />}
      <div className={`turn-control ${turning ? 'is-turning' : ''}`}>
        <button
          type="button"
          className="turn-handle"
          onPointerDown={onTurnDown}
          onPointerMove={onTurnMove}
          onPointerUp={onTurnUp}
          onPointerCancel={onTurnUp}
          aria-label={`Turn drawing, now ${rotation} degrees`}
          title="Drag to turn"
        >
          {/* A ring that fills from 12 o'clock by the turn: clockwise for right, the other way for left. */}
          <svg key={bump} className={bump ? 'is-thunk' : undefined} viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            <circle cx="20" cy="20" r={RING_R} className="turn-track" />
            <circle
              cx="20"
              cy="20"
              r={RING_R}
              className="turn-fill"
              strokeDasharray={`${RING_C} ${RING_C}`}
              strokeDashoffset={RING_C * (1 - Math.abs(rotation) / 360)}
              transform={rotation < 0 ? 'rotate(-90 20 20) scale(1 -1) translate(0 -40)' : 'rotate(-90 20 20)'}
            />
          </svg>
        </button>
        <output key={bump} className={`turn-readout ${bump ? 'is-thunk' : ''}`} aria-live="polite">
          {rotation}°
        </output>
        {rotation !== 0 && !turning && (
          <button type="button" className="turn-reset" onClick={resetTurn} title="Back to 0°">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.3-5.6" />
              <path d="M4 4v4.5h4.5" />
            </svg>
            Reset
          </button>
        )}
      </div>
      {cursor && !turning && (
        <span
          className={`pen-cursor ${pen.erase ? 'is-eraser' : ''}`}
          style={{
            left: cursor[0],
            top: cursor[1],
            width: Math.max(4, size),
            height: Math.max(4, size),
            borderRadius: pen.cap === 'flat' && pen.nib === undefined ? 2 : '50%',
          }}
        />
      )}
    </>
  )
}
