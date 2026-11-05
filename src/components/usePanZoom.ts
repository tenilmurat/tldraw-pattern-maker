import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/** Where you're looking: how far the pattern has been moved from the centred view, in CSS px. */
export interface Camera {
  x: number
  y: number
}

export const HOME: Camera = { x: 0, y: 0 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * The pattern as an endless canvas: two-finger scroll or drag to move it,
 * pinch (or ⌘/Ctrl + scroll) to zoom around the pointer. Zooming is the
 * pattern's own size slider, so `onZoom` makes the pattern bigger and says by
 * how much it really grew (it stops at the slider's ends).
 */
export function usePanZoom({
  target,
  size,
  canDrag,
  onMove,
  onZoom,
}: {
  target: RefObject<HTMLElement | null>
  /** The view's size in CSS px. */
  size: () => { w: number; h: number }
  /** A plain drag moves the pattern (not while drawing straight onto it). */
  canDrag: boolean
  /**
   * Called with every new camera, before React catches up, so painting keeps pace with the fingers.
   * `paint` is false when the pattern is about to be redrawn at a new size anyway.
   */
  onMove: (cam: Camera, paint: boolean) => void
  /** Grow the pattern by `factor`; returns the factor it actually grew by. */
  onZoom: (factor: number) => number
}) {
  const [cam, setCam] = useState<Camera>(HOME)
  const camRef = useRef(cam)
  const onMoveRef = useRef(onMove)
  const onZoomRef = useRef(onZoom)
  const sizeRef = useRef(size)
  useEffect(() => {
    onMoveRef.current = onMove
    onZoomRef.current = onZoom
    sizeRef.current = size
  })

  /** `paint: false` when the pattern is about to be redrawn anyway (a zoom changes its size), so it never flickers. */
  const set = useCallback((next: Camera, paint = true) => {
    camRef.current = next
    onMoveRef.current(next, paint)
    setCam(next)
  }, [])

  /** Zoom by `factor`, keeping the pattern point under (sx, sy) where it is. */
  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      const k = onZoomRef.current(factor)
      if (k === 1) return
      const c = camRef.current
      const { w, h } = sizeRef.current()
      // Everything grows by k around the middle of the view; move it so the point under the pointer stays put.
      set({ x: (sx - w / 2) * (1 - k) + c.x * k, y: (sy - h / 2) * (1 - k) + c.y * k }, false)
    },
    [set],
  )

  const reset = useCallback(() => set(HOME), [set])

  const gestureScale = useRef(1)

  // Trackpad and wheel: scroll pans, pinch (sent as Ctrl + wheel) zooms.
  useEffect(() => {
    const el = target.current
    if (!el) return
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top] as const
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const lines = e.deltaMode === 1 ? 16 : 1
      if (e.ctrlKey || e.metaKey) {
        const [sx, sy] = local(e)
        zoomAt(sx, sy, Math.exp(-clamp(e.deltaY * lines, -60, 60) * 0.01))
      } else {
        const c = camRef.current
        const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * lines
        const dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * lines
        set({ ...c, x: c.x - dx, y: c.y - dy })
      }
    }
    // Safari sends pinches as gesture events instead.
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      gestureScale.current = 1
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const g = e as Event & { scale: number; clientX: number; clientY: number }
      const [sx, sy] = local(g)
      zoomAt(sx, sy, g.scale / gestureScale.current)
      gestureScale.current = g.scale
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart)
    el.addEventListener('gesturechange', onGestureChange)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
    }
  }, [target, zoomAt, set])

  // Dragging: one pointer moves the pattern, two fingers on a touch screen also pinch.
  const pointers = useRef(new Map<number, [number, number]>())
  const [dragging, setDragging] = useState(false)

  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as [number, number]
  }

  /** Returns true when the pointer was taken for moving, so drawing doesn't also start. */
  const onPointerDown = (e: React.PointerEvent) => {
    const middle = e.button === 1
    const touchPinch = e.pointerType === 'touch' && pointers.current.size === 1
    if (!(canDrag || middle || touchPinch) || (e.button !== 0 && !middle)) return false
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, local(e))
    setDragging(true)
    return true
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointers.current
    const prev = p.get(e.pointerId)
    if (!prev) return false
    const next = local(e)
    if (p.size === 2) {
      const [other] = [...p.entries()].filter(([id]) => id !== e.pointerId).map(([, v]) => v)
      const d0 = Math.hypot(prev[0] - other[0], prev[1] - other[1])
      const d1 = Math.hypot(next[0] - other[0], next[1] - other[1])
      if (d0 > 0) zoomAt((next[0] + other[0]) / 2, (next[1] + other[1]) / 2, d1 / d0)
    }
    const c = camRef.current
    const share = p.size === 2 ? 0.5 : 1
    set({ ...c, x: c.x + (next[0] - prev[0]) * share, y: c.y + (next[1] - prev[1]) * share })
    p.set(e.pointerId, next)
    return true
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return false
    if (!pointers.current.size) setDragging(false)
    return true
  }

  return { cam, camRef, dragging, reset, zoomAt, handlers: { onPointerDown, onPointerMove, onPointerUp } }
}
