import { useRef, useState, type Dispatch } from 'react'
import { turnAbout } from '../../engine/draw'
import { nextWidth, PEN } from '../../engine/pens'
import { apply } from '../../engine/symmetry'
import { newId } from '../../engine/random'
import type { Action } from '../../state/reducer'
import type { PatternState, Stroke } from '../../state/types'

type PointerLike = { clientX: number; clientY: number; pointerType: string; pressure: number; timeStamp: number }

interface Live {
  stroke: Stroke
  last: [number, number]
  start: [number, number]
  time: number
  width: number
}

/**
 * Turns pointer input into a stroke, the same way on the working frame and
 * on the pattern: streamlined, thinned by speed (or pen pressure), and
 * locked to eight directions while Shift is held.
 *
 * `toLocal` maps a pointer to CSS px on the surface; `unitPx` is how many of
 * those px make one tile unit; `origin` is where unit (0, 0) sits.
 */
export function useStrokeInput({
  state,
  dispatch,
  toLocal,
  unitPx,
  origin,
  onLive,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  toLocal: (e: PointerLike) => [number, number]
  unitPx: number
  origin: () => [number, number]
  onLive: (stroke: Stroke) => void
}) {
  const liveRef = useRef<Live | null>(null)
  const frame = useRef(0)
  const [drawing, setDrawing] = useState(false)
  const pen = PEN[state.draw.pen]

  // The drawing may be turned; undo the turn so the line lands under the pointer.
  const unturn = turnAbout(-state.draw.rotation)
  const toUnits = ([x, y]: [number, number]): [number, number] => {
    const [ox, oy] = origin()
    return apply(unturn, [(x - ox) / unitPx, (y - oy) / unitPx])
  }

  const schedule = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const live = liveRef.current
      if (live) onLive({ ...live.stroke, points: [...live.stroke.points] })
    })
  }

  const add = (live: Live, e: PointerLike, shift: boolean) => {
    let [x, y] = toLocal(e)
    if (shift) {
      const [sx, sy] = live.start
      const step = Math.PI / 4
      const angle = Math.round(Math.atan2(y - sy, x - sx) / step) * step
      const len = Math.hypot(x - sx, y - sy)
      live.stroke.points = Array.from({ length: 24 }, (_, i) => {
        const t = i / 23
        const [ux, uy] = toUnits([sx + Math.cos(angle) * len * t, sy + Math.sin(angle) * len * t])
        return [ux, uy, 1]
      })
      return
    }
    const [lx, ly] = live.last
    x = lx + (x - lx) * (1 - pen.streamline)
    y = ly + (y - ly) * (1 - pen.streamline)
    const speed = Math.hypot(x - lx, y - ly) / Math.max(1, e.timeStamp - live.time)
    live.width = nextWidth(pen, live.width, speed, e.pointerType === 'pen' ? e.pressure : null)
    live.last = [x, y]
    live.time = e.timeStamp
    const [ux, uy] = toUnits([x, y])
    live.stroke.points.push([ux, uy, live.width])
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toLocal(e)
    const [ux, uy] = toUnits(p)
    liveRef.current = {
      stroke: {
        id: newId(),
        pen: pen.id,
        points: [[ux, uy, 0.8]],
        size: state.draw.sizes[pen.id] / unitPx,
        colour: pen.ownInk ? state.draw.highlight : state.draw.ink,
        opacity: state.draw.opacities[pen.id],
      },
      last: p,
      start: p,
      time: e.timeStamp,
      width: 0.8,
    }
    setDrawing(true)
    schedule()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const live = liveRef.current
    if (!live) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const ev of events.length ? events : [e.nativeEvent]) add(live, ev, e.shiftKey)
    schedule()
  }

  const onPointerUp = (e?: React.PointerEvent) => {
    const live = liveRef.current
    // Smoothing trails the pointer; finish the line where it was let go.
    if (live && e && !e.shiftKey && live.stroke.points.length > 1) {
      const [ux, uy] = toUnits(toLocal(e))
      live.stroke.points.push([ux, uy, live.width])
    }
    liveRef.current = null
    setDrawing(false)
    if (live) dispatch({ type: 'addStroke', stroke: live.stroke })
  }

  return {
    drawing,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
