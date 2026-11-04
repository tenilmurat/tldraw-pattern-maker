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

export const EXPORTS: ExportPreset[] = [
  { id: 'tile', name: 'One tile', hint: 'Repeats forever. For Canva, Cricut, Spoonflower', k: 3 },
  { id: 'phone', name: 'Phone wallpaper', hint: '1290 × 2796', width: 1290, height: 2796, k: 3 },
  { id: 'desktop', name: 'Desktop wallpaper', hint: '2880 × 1800', width: 2880, height: 1800, k: 2 },
  { id: 'square', name: 'Square post', hint: '2160 × 2160', width: 2160, height: 2160, k: 2 },
  { id: 'a4', name: 'A4 print', hint: 'True size at 300 dpi', width: 2480, height: 3508, k: 300 / 96 },
]

export async function exportPng(renderer: Renderer, preset: ExportPreset, name: string) {
  // Keep very large repeats (many shapes, lots of space) under ~6000 px.
  const k = preset.width ? preset.k : Math.min(preset.k, 6000 / Math.max(renderer.tileW, renderer.tileH))
  const width = preset.width ?? Math.round(renderer.tileW * k)
  const height = preset.height ?? Math.round(renderer.tileH * k)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.scale(k, k)
  if (preset.width) {
    // Centre a repeat in the image, the same way the preview does.
    const ox = width / k / 2 - renderer.tileW / 2
    const oy = height / k / 2 - renderer.tileH / 2
    ctx.translate(ox, oy)
    renderer.paint(ctx, -ox, -oy, width / k, height / k, k)
  } else {
    ctx.setTransform(width / renderer.tileW, 0, 0, height / renderer.tileH, 0, 0)
    renderer.paint(ctx, 0, 0, renderer.tileW, renderer.tileH, k)
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${preset.id}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
