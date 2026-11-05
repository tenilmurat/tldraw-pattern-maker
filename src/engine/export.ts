import type { Renderer } from './renderer'

export interface ExportPreset {
  id: string
  name: string
  hint: string
  /** Output size in pixels; omitted for "one tile". */
  width?: number
  height?: number
  /** Device pixels per CSS pixel. A4 uses 300/96 so 5 mm on screen is 5 mm on paper. */
  k: number
}

/** The repeat on its own, then the PNG sizes people ask for most. */
export const EXPORTS: ExportPreset[] = [
  { id: 'tile', name: 'One tile', hint: 'Repeats seamlessly', k: 3 },
  { id: '1080', name: '1080 × 1080', hint: 'Square', width: 1080, height: 1080, k: 2 },
  { id: '2048', name: '2048 × 2048', hint: 'Large square', width: 2048, height: 2048, k: 2 },
  { id: '1080x1350', name: '1080 × 1350', hint: 'Portrait 4:5', width: 1080, height: 1350, k: 2 },
  { id: '1920x1080', name: '1920 × 1080', hint: 'Full HD 16:9', width: 1920, height: 1080, k: 2 },
  { id: '3840x2160', name: '3840 × 2160', hint: '4K 16:9', width: 3840, height: 2160, k: 3 },
  { id: 'a4', name: '2480 × 3508', hint: 'A4 at 300 dpi, true size', width: 2480, height: 3508, k: 300 / 96 },
]

/** Paint a repeat into a canvas of `width` × `height` device pixels, centred the way the preview is. */
export function paintCentred(ctx: CanvasRenderingContext2D, renderer: Renderer, width: number, height: number, k: number) {
  ctx.setTransform(k, 0, 0, k, 0, 0)
  const ox = width / k / 2 - renderer.tileW / 2
  const oy = height / k / 2 - renderer.tileH / 2
  ctx.translate(ox, oy)
  renderer.paint(ctx, -ox, -oy, width / k, height / k, k)
}

/** Hand a file to the browser to save. */
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportPng(renderer: Renderer, preset: ExportPreset, name: string) {
  // Keep very large repeats (many shapes, lots of space) under ~6000 px.
  const k = preset.width ? preset.k : Math.min(preset.k, 6000 / Math.max(renderer.tileW, renderer.tileH))
  const width = preset.width ?? Math.round(renderer.tileW * k)
  const height = preset.height ?? Math.round(renderer.tileH * k)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  if (preset.width) {
    paintCentred(ctx, renderer, width, height, k)
  } else {
    ctx.setTransform(width / renderer.tileW, 0, 0, height / renderer.tileH, 0, 0)
    renderer.paint(ctx, 0, 0, renderer.tileW, renderer.tileH, k)
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (blob) download(blob, `${name}-${preset.id}.png`)
}
