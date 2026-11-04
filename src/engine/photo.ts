import { MOTIFS } from './motifs'
import { createRand } from './random'
import { lerp, tileRenderer, type TileRenderer } from './renderer'
import {
  latticeOffsets,
  SYMMETRIES,
  transformBox,
  type Box,
  type Point,
  type SymmetryId,
} from './symmetry'
import type { PhotoSelection } from '../state/types'

export interface PhotoImage {
  source: CanvasImageSource
  width: number
  height: number
}

/** CSS px per tile unit for the 0..1 Size slider. */
export const photoTileSize = (t: number) => lerp(150, 620, t)

/** Selection rectangle in image pixels: centre, width, height, turn (radians). */
export function selectionRect(img: PhotoImage, sel: PhotoSelection, symmetry: SymmetryId) {
  const g = SYMMETRIES[symmetry]
  const w = sel.size * Math.min(img.width, img.height)
  return {
    cx: sel.cx * img.width,
    cy: sel.cy * img.height,
    w,
    h: (w * g.domainH) / g.domainW,
    angle: (sel.angle * Math.PI) / 180,
  }
}

/** Polygon grown outwards a little, so neighbouring slices overlap instead of leaving a hairline gap. */
function grow(poly: Point[], by: number): Point[] {
  let area = 0
  let perimeter = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % poly.length]
    area += (x0 * y1 - x1 * y0) / 2
    perimeter += Math.hypot(x1 - x0, y1 - y0)
    cx += x0 / poly.length
    cy += y0 / poly.length
  }
  const inradius = (2 * Math.abs(area)) / perimeter
  const f = 1 + by / inradius
  return poly.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f])
}

export interface PhotoOptions {
  image: PhotoImage
  selection: PhotoSelection
  symmetry: SymmetryId
  size: number
  /** Override the tile size in CSS px per unit (used for small previews). */
  unit?: number
}

export function createPhotoRenderer(o: PhotoOptions): TileRenderer {
  const g = SYMMETRIES[o.symmetry]
  const T = o.unit ?? photoTileSize(o.size)
  const dw = g.domainW * T
  const dh = g.domainH * T
  const rect = selectionRect(o.image, o.selection, o.symmetry)
  const domainBox: Box = { minX: 0, minY: 0, maxX: g.domainW, maxY: g.domainH }
  const cell = g.ops
    .map((op) => transformBox(op, domainBox))
    .reduce((a, b) => ({
      minX: Math.min(a.minX, b.minX),
      minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX),
      maxY: Math.max(a.maxY, b.maxY),
    }))

  return tileRenderer(g.tileW * T, g.tileH * T, '#ffffff', (ctx, k) => {
    // 1. Cut the selected slice of the photo once, with a small margin.
    const m = 2 / k
    const slice = document.createElement('canvas')
    slice.width = Math.ceil((dw + 2 * m) * k)
    slice.height = Math.ceil((dh + 2 * m) * k)
    const sctx = slice.getContext('2d')!
    sctx.setTransform(k, 0, 0, k, m * k, m * k)
    sctx.translate(dw / 2, dh / 2)
    sctx.scale(dw / rect.w, dw / rect.w)
    sctx.rotate(-rect.angle)
    sctx.translate(-rect.cx, -rect.cy)
    sctx.drawImage(o.image.source, 0, 0, o.image.width, o.image.height)

    // 2. Mirror and turn the slice around every lattice point that touches the tile.
    const clip = grow(g.domain, m / T)
    for (const [ox, oy] of latticeOffsets(g, cell)) {
      for (const op of g.ops) {
        ctx.save()
        ctx.scale(T, T)
        ctx.translate(ox, oy)
        ctx.transform(...op)
        ctx.beginPath()
        clip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
        ctx.closePath()
        ctx.clip()
        ctx.scale(1 / T, 1 / T)
        ctx.drawImage(slice, -m, -m, slice.width / k, slice.height / k)
        ctx.restore()
      }
    }
  })
}

/**
 * Built-in sample "photo": a loose painting made from the take-home's own
 * shapes, so Photo mode opens on a real kaleidoscope instead of an upload box.
 */
export function createSampleImage(): PhotoImage {
  const W = 1200
  const H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const rand = createRand(11)
  const colours = ['#f2b134', '#e8743b', '#c9577a', '#2f6b4f', '#8bb174', '#4fa3c7', '#fff4e8']
  ctx.fillStyle = '#fff4e8'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 70; i++) {
    const motif = MOTIFS[Math.floor(rand() * MOTIFS.length)]
    const s = 60 + rand() * 260
    ctx.save()
    ctx.translate(rand() * W, rand() * H)
    ctx.rotate(rand() * Math.PI * 2)
    ctx.scale(s / 24, s / 24)
    ctx.translate(-12, -12)
    ctx.globalAlpha = 0.75 + rand() * 0.25
    ctx.fillStyle = colours[Math.floor(rand() * colours.length)]
    ctx.fill(motif.path)
    ctx.restore()
  }
  return { source: canvas, width: W, height: H }
}

/** Load a user file, downscaled so mirroring stays fast. */
export async function loadImage(url: string, max = 1800): Promise<PhotoImage> {
  const img = new Image()
  img.src = url
  await img.decode()
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { source: canvas, width: canvas.width, height: canvas.height }
}
