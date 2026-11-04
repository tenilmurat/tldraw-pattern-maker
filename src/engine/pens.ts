/**
 * Pens: each one behaves like the thing it's named after.
 *
 * A stroke is a list of points [x, y, w] where w is a width factor (0..1)
 * worked out while drawing, from speed and pen pressure. This file turns
 * those points into one filled outline — no drawing library involved.
 */

export type PenId =
  | 'pencil'
  | 'pen'
  | 'fineliner'
  | 'marker'
  | 'highlighter'
  | 'brush'
  | 'fountain'
  | 'eraser'

export type StrokePoint = [number, number, number]

export interface PenDef {
  id: PenId
  name: string
  /** Default diameter, in CSS px. */
  size: number
  /** How much speed thins the line (0 = constant width). */
  thinning: number
  /** The thinnest a fast line may get, as a share of the full width. */
  minWidth: number
  /** Taper at the start and end, in multiples of the size. */
  taper: [number, number]
  cap: 'round' | 'flat'
  opacity: number
  /** Drawn with a fixed nib angle (fountain pen). */
  nib?: number
  /** Graphite grain (pencil). */
  grain?: boolean
  /** Rubs out instead of adding. */
  erase?: boolean
  /** Keeps its own colour instead of sharing the ink (highlighter). */
  ownInk?: boolean
  /** How much the line lags behind the pointer to smooth out shake (0..1). */
  streamline: number
}

export const PENS: PenDef[] = [
  { id: 'pencil', name: 'Pencil', size: 3, thinning: 0.3, minWidth: 0.6, taper: [1.5, 2], cap: 'round', opacity: 0.92, grain: true, streamline: 0.25 },
  { id: 'pen', name: 'Pen', size: 5, thinning: 0.45, minWidth: 0.5, taper: [1.5, 3], cap: 'round', opacity: 1, streamline: 0.35 },
  { id: 'fineliner', name: 'Fineliner', size: 2.5, thinning: 0, minWidth: 1, taper: [0, 0], cap: 'round', opacity: 1, streamline: 0.3 },
  { id: 'marker', name: 'Marker', size: 12, thinning: 0, minWidth: 1, taper: [0, 0], cap: 'round', opacity: 1, streamline: 0.4 },
  { id: 'highlighter', name: 'Highlighter', size: 22, thinning: 0, minWidth: 1, taper: [0, 0], cap: 'flat', opacity: 0.45, ownInk: true, streamline: 0.5 },
  { id: 'brush', name: 'Brush', size: 16, thinning: 0.7, minWidth: 0.3, taper: [2.5, 5], cap: 'round', opacity: 1, streamline: 0.4 },
  { id: 'fountain', name: 'Fountain Pen', size: 9, thinning: 0, minWidth: 1, taper: [0, 0], cap: 'flat', opacity: 1, nib: 45, streamline: 0.35 },
  { id: 'eraser', name: 'Eraser', size: 24, thinning: 0, minWidth: 1, taper: [0, 0], cap: 'round', opacity: 1, erase: true, streamline: 0.2 },
]

export const PEN = Object.fromEntries(PENS.map((p) => [p.id, p])) as Record<PenId, PenDef>

/** The colour row: neutrals, then the spectrum. */
export const SWATCHES = [
  '#151515', '#5e5e5e', '#9c9c9c', '#ffffff',
  '#9e3a2f', '#d9443a', '#ea7a2c', '#f0a92e', '#f7d64a',
  '#88b93a', '#3f9a50', '#2f9e8f', '#3a9bc1', '#3d7be0',
  '#4b56e2', '#7a4fe0', '#b04bc9', '#d2456f',
]

export const DEFAULT_HIGHLIGHT = '#f7d64a'

/**
 * Width factor for the next point, from how fast the pointer moved.
 * `speed` is CSS px per millisecond. Smoothed so the line swells and
 * thins gradually instead of jumping.
 */
export function nextWidth(pen: PenDef, prev: number, speed: number, pressure: number | null) {
  // A brisk hand-drawn line is around 1–3 px/ms; only a real flick reaches full thinning.
  let target = 1 - pen.thinning * Math.min(1, speed / 4)
  if (pressure !== null && pen.thinning > 0) target *= 0.35 + pressure * 0.9
  return prev + (target - prev) * 0.28
}

/** Ease for tapered ends: quick to swell, soft at the very tip. */
const ease = (t: number) => Math.sin((Math.min(1, Math.max(0, t)) * Math.PI) / 2)

/** Drop points that sit on top of each other and soften the path a little. */
function prepare(points: StrokePoint[], size: number): StrokePoint[] {
  const min = size * 0.08
  const kept: StrokePoint[] = []
  for (const p of points) {
    const last = kept[kept.length - 1]
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > min) kept.push(p)
  }
  if (kept.length < 3) return kept
  // One pass of neighbour averaging; the ends stay where they were drawn.
  return kept.map((p, i) => {
    if (i === 0 || i === kept.length - 1) return p
    const a = kept[i - 1]
    const b = kept[i + 1]
    return [(a[0] + p[0] * 2 + b[0]) / 4, (a[1] + p[1] * 2 + b[1]) / 4, p[2]] as StrokePoint
  })
}

type Vec = [number, number]

/** Smooth curve through a list of points, using midpoints as curve ends. */
function curveThrough(path: Path2D, pts: Vec[]) {
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    path.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
  }
  const last = pts[pts.length - 1]
  path.lineTo(last[0], last[1])
}

/** One filled outline for a stroke, in the same units as its points. */
export function outlinePath(points: StrokePoint[], penId: PenId, size: number): Path2D {
  const pen = PEN[penId]
  const pts = prepare(points, size)
  const path = new Path2D()
  const r0 = size / 2
  const minR = size * 0.07

  if (pts.length === 0) return path
  if (pts.length === 1) {
    const [x, y, w] = pts[0]
    const r = Math.max(minR, r0 * (pen.thinning ? 0.6 + w * 0.4 : 1))
    if (pen.cap === 'flat') path.rect(x - r, y - r * 0.6, r * 2, r * 1.2)
    else path.arc(x, y, r, 0, Math.PI * 2)
    return path
  }

  // Distance along the stroke, for the tapers.
  const along = [0]
  for (let i = 1; i < pts.length; i++) {
    along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  const total = along[along.length - 1]
  const tStart = Math.min(pen.taper[0] * size, total * 0.45)
  const tEnd = Math.min(pen.taper[1] * size, total * 0.45)

  const left: Vec[] = []
  const right: Vec[] = []
  const nibAngle = ((pen.nib ?? 0) * Math.PI) / 180
  const nib: Vec = [Math.cos(nibAngle), Math.sin(nibAngle)]

  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const dx = (b[0] - a[0]) / len
    const dy = (b[1] - a[1]) / len
    const [x, y, w] = pts[i]

    if (pen.nib !== undefined) {
      // A flat nib: the offset always points the same way, so moving along
      // the nib gives a hairline and moving across it gives the full width.
      const hair = size * 0.06
      left.push([x + nib[0] * r0 - dy * hair, y + nib[1] * r0 + dx * hair])
      right.push([x - nib[0] * r0 + dy * hair, y - nib[1] * r0 - dx * hair])
      continue
    }

    let r = r0 * (pen.thinning ? Math.max(pen.minWidth, w) : 1)
    if (tStart > 0) r *= 0.15 + 0.85 * ease(along[i] / tStart)
    if (tEnd > 0) r *= 0.15 + 0.85 * ease((total - along[i]) / tEnd)
    r = Math.max(minR, r)
    left.push([x - dy * r, y + dx * r])
    right.push([x + dy * r, y - dx * r])
  }

  const end = pts[pts.length - 1]
  const start = pts[0]
  path.moveTo(left[0][0], left[0][1])
  curveThrough(path, left)

  // End cap, then back along the other side, then the start cap.
  const capArc = (p: StrokePoint, from: Vec, to: Vec) => {
    if (pen.cap === 'flat' || pen.nib !== undefined) {
      path.lineTo(to[0], to[1])
      return
    }
    const r = Math.hypot(from[0] - p[0], from[1] - p[1])
    const a0 = Math.atan2(from[1] - p[1], from[0] - p[0])
    const a1 = Math.atan2(to[1] - p[1], to[0] - p[0])
    path.arc(p[0], p[1], r, a0, a1, true)
  }

  capArc(end, left[left.length - 1], right[right.length - 1])
  curveThrough(path, [...right].reverse())
  capArc(start, right[0], left[0])
  path.closePath()
  return path
}

// --- Pencil grain -------------------------------------------------------------

const grainCache = new Map<string, HTMLCanvasElement>()

/** A small tile of speckled colour, used as the pencil's fill. */
export function grainFor(colour: string): HTMLCanvasElement {
  let tile = grainCache.get(colour)
  if (tile) return tile
  tile = document.createElement('canvas')
  tile.width = 48
  tile.height = 48
  const ctx = tile.getContext('2d')!
  ctx.fillStyle = colour
  ctx.fillRect(0, 0, 48, 48)
  const img = ctx.getImageData(0, 0, 48, 48)
  let seed = 1
  for (let i = 3; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647
    const n = seed / 2147483647
    img.data[i] = Math.round(255 * (0.35 + n * n * 0.65))
  }
  ctx.putImageData(img, 0, 0)
  grainCache.set(colour, tile)
  return tile
}
