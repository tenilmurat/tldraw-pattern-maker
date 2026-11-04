import { useEffect, useRef, type Dispatch } from 'react'
import { arrangementFrom, type ShapeRenderer } from '../../engine/shapes'
import { newId } from '../../engine/random'
import type { Action } from '../../state/reducer'
import type { Arrangement, PatternState, Stamp } from '../../state/types'
import type { FrameBox } from './WorkFrame'

type Drag =
  | { kind: 'move'; id: number; dx: number; dy: number }
  | { kind: 'resize'; id: number }
  | { kind: 'turn'; id: number; from: number; rot: number }

const wrap = (v: number) => ((v % 1) + 1) % 1

/**
 * Arranging shapes inside one tile. Drag a shape to move it, use its handles
 * to resize or turn it, tap an empty spot to add the chosen shape. The first
 * touch turns a preset layout into your own arrangement, so nothing jumps.
 */
export function ShapeFrame({
  state,
  dispatch,
  renderer,
  box,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  renderer: ShapeRenderer
  box: FrameBox
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const { layout, custom, selected, pick } = state.shapes
  const own = layout === 'custom' && custom ? custom : null
  const sel = own?.stamps.find((s) => s.id === selected) ?? null

  useEffect(() => {
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(box.w * dpr)
    canvas.height = Math.round(box.h * dpr)
    const ctx = canvas.getContext('2d')!
    const s = box.w / renderer.tileW
    ctx.setTransform(dpr * s, 0, 0, dpr * (box.h / renderer.tileH), 0, 0)
    ctx.clearRect(0, 0, renderer.tileW, renderer.tileH)
    renderer.paintInk(ctx, 0, 0, renderer.tileW, renderer.tileH)
  }, [renderer, box.w, box.h])

  // Delete removes the selected shape; Escape lets go of it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea')) return
      if (selected === null) return
      if (e.key === 'Backspace' || e.key === 'Delete') dispatch({ type: 'removeStamp', id: selected })
      if (e.key === 'Escape') dispatch({ type: 'selectStamp', id: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, dispatch])

  const local = (e: React.PointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect()
    return [(e.clientX - r.left) / box.w, (e.clientY - r.top) / box.h]
  }

  /** Which stamp is under a point, counting the copies that wrap round the edges. */
  const hit = (arr: Arrangement, [fx, fy]: [number, number]): Stamp | null => {
    for (const s of [...arr.stamps].reverse()) {
      const r = (s.size * box.w) / 2
      for (const ox of [-1, 0, 1]) {
        for (const oy of [-1, 0, 1]) {
          const dx = (fx - (s.x + ox)) * box.w
          const dy = (fy - (s.y + oy)) * box.h
          if (Math.hypot(dx, dy) <= Math.max(r, 10)) return { ...s, x: s.x + ox, y: s.y + oy }
        }
      }
    }
    return null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = local(e)
    let arr = own
    if (!arr) {
      const made = arrangementFrom({ ...state.shapes, size: state.size, palette: state.palette, seed: state.seed })
      dispatch({ type: 'arrange', ...made })
      arr = made.custom
    }
    const target = hit(arr, p)
    if (target) {
      dispatch({ type: 'selectStamp', id: target.id })
      drag.current = { kind: 'move', id: target.id, dx: p[0] - target.x, dy: p[1] - target.y }
      return
    }
    const stamp: Stamp = {
      id: newId(),
      motif: pick,
      x: p[0],
      y: p[1],
      size: arr.stamps[arr.stamps.length - 1]?.size ?? 0.22,
      rot: 0,
      ink: arr.stamps.length % state.palette.inks.length,
    }
    dispatch({ type: 'addStamp', stamp })
    drag.current = { kind: 'move', id: stamp.id, dx: 0, dy: 0 }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const [fx, fy] = local(e)
    if (d.kind === 'move') {
      dispatch({ type: 'updateStamp', id: d.id, patch: { x: wrap(fx - d.dx), y: wrap(fy - d.dy) } })
    } else if (sel) {
      const cx = sel.x * box.w
      const cy = sel.y * box.h
      const px = fx * box.w
      const py = fy * box.h
      if (d.kind === 'resize') {
        const size = Math.min(1.2, Math.max(0.03, ((Math.hypot(px - cx, py - cy) - 6) * 2) / box.w))
        dispatch({ type: 'updateStamp', id: d.id, patch: { size } })
      } else {
        const now = (Math.atan2(py - cy, px - cx) * 180) / Math.PI
        let rot = d.rot + now - d.from
        if (e.shiftKey) rot = Math.round(rot / 15) * 15
        dispatch({ type: 'updateStamp', id: d.id, patch: { rot } })
      }
    }
  }

  const startHandle = (kind: 'resize' | 'turn') => (e: React.PointerEvent) => {
    if (!sel) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const [fx, fy] = local(e)
    const from = (Math.atan2((fy - sel.y) * box.h, (fx - sel.x) * box.w) * 180) / Math.PI
    drag.current = kind === 'resize' ? { kind, id: sel.id } : { kind, id: sel.id, from, rot: sel.rot }
  }

  const r = sel ? (sel.size * box.w) / 2 + 6 : 0

  return (
    <>
      <canvas ref={canvasRef} className="frame-canvas" aria-hidden="true" />
      <svg
        className="frame-overlay"
        width={box.w}
        height={box.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        role="application"
        aria-label="Arrange shapes in one tile. Tap to add, drag to move."
      >
        {sel && (
          <g transform={`translate(${sel.x * box.w} ${sel.y * box.h}) rotate(${sel.rot})`}>
            <circle r={r} className="sel-ring" />
            <line x1={0} y1={-r} x2={0} y2={-r - 16} className="sel-stem" />
            <circle cx={0} cy={-r - 20} r={7} className="sel-handle turn" onPointerDown={startHandle('turn')} />
            <circle
              cx={r * Math.SQRT1_2}
              cy={r * Math.SQRT1_2}
              r={7}
              className="sel-handle size"
              onPointerDown={startHandle('resize')}
            />
          </g>
        )}
      </svg>
    </>
  )
}
