import { useEffect, useRef } from 'react'
import type { Renderer } from '../engine/renderer'

/** A small live swatch of any renderer, used on every picture-first choice. */
export function MiniPattern({
  renderer,
  zoom = 0.5,
  width = 72,
  height = 56,
}: {
  renderer: Renderer
  zoom?: number
  width?: number
  height?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const ctx = canvas.getContext('2d')!
    const k = dpr * zoom
    const w = width / zoom
    const h = height / zoom
    const ox = w / 2 - renderer.tileW / 2
    const oy = h / 2 - renderer.tileH / 2
    ctx.setTransform(k, 0, 0, k, 0, 0)
    ctx.translate(ox, oy)
    renderer.paint(ctx, -ox, -oy, w, h, k)
  }, [renderer, zoom, width, height])

  return <canvas ref={ref} className="mini" style={{ width, height }} aria-hidden="true" />
}
