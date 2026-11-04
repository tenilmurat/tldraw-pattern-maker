import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { drawPlain, forgetStroke } from '../../engine/draw'
import { PEN } from '../../engine/pens'
import type { Action } from '../../state/reducer'
import type { PatternState, Stroke } from '../../state/types'
import { TurnDial } from '../TurnDial'
import { useStrokeInput } from '../draw/useStrokeInput'
import type { FrameBox } from './WorkFrame'

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
      <TurnDial
        value={rotation}
        label="Turn drawing"
        onTurning={setTurning}
        onChange={(deg) => dispatch({ type: 'drawRotation', deg })}
      />
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
