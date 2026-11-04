import type { Palette } from './color'
import { MOTIF_BY_ID, type Motif } from './motifs'
import { hash2, newId } from './random'
import { lcm, lerp, mod, type Renderer } from './renderer'
import type { Arrangement, ShapeLayout, Stamp } from '../state/types'

export interface LayoutInfo {
  id: ShapeLayout
  name: string
  hint: string
}

/** Named by what they look like, never by print-industry terms ("half-drop"). */
export const LAYOUTS: LayoutInfo[] = [
  { id: 'grid', name: 'Grid', hint: 'Neat rows and columns' },
  { id: 'bricks', name: 'Bricks', hint: 'Every other row shifts over' },
  { id: 'diamond', name: 'Diamond', hint: 'Set on a slant' },
  { id: 'bigsmall', name: 'Big & small', hint: 'Sizes take turns' },
  { id: 'wave', name: 'Wave', hint: 'Rows ripple up and down' },
  { id: 'spin', name: 'Spin', hint: 'Shapes turn as they go' },
  { id: 'scatter', name: 'Scatter', hint: 'Loose and hand-placed' },
]

/** Motif size in CSS px for the 0..1 Size slider. */
export const shapeSize = (t: number) => lerp(14, 120, t)
/** Gap between shapes, as a multiple of the shape size, for the 0..1 Space slider. */
const gapFor = (t: number) => lerp(0.08, 2.2, t)

const WAVE = 8
const SCATTER = 6

interface Placement {
  x: number
  y: number
  rot: number
  scale: number
  slot: number
}

interface Grid {
  cw: number
  ch: number
  /** Cells before the arrangement repeats, across and down. */
  period: [number, number]
  place(i: number, j: number): Placement
}

function layoutGrid(layout: ShapeLayout, s: number, space: number, slots: number, seed: number): Grid {
  const c = s * (1 + gapFor(space))
  const diag = (i: number, j: number) => mod(i + j, slots)

  switch (layout) {
    case 'grid':
    case 'custom':
      return {
        cw: c,
        ch: c,
        period: [slots, slots],
        place: (i, j) => ({ x: (i + 0.5) * c, y: (j + 0.5) * c, rot: 0, scale: 1, slot: diag(i, j) }),
      }
    case 'bricks':
      return {
        cw: c,
        ch: c,
        period: [slots, lcm(slots, 2)],
        place: (i, j) => ({
          x: (i + 0.5 + (mod(j, 2) ? 0.5 : 0)) * c,
          y: (j + 0.5) * c,
          rot: 0,
          scale: 1,
          slot: diag(i, j),
        }),
      }
    case 'diamond': {
      const cw = c * Math.SQRT2
      const ch = cw / 2
      return {
        cw,
        ch,
        period: [slots, 2 * slots],
        place: (i, j) => ({
          x: (i + 0.5 + (mod(j, 2) ? 0.5 : 0)) * cw,
          y: (j + 0.5) * ch,
          rot: 0,
          scale: 1,
          slot: mod(i + Math.floor(j / 2), slots),
        }),
      }
    }
    case 'bigsmall':
      return {
        cw: c,
        ch: c,
        period: [2 * slots, 2 * slots],
        place: (i, j) => ({
          x: (i + 0.5) * c,
          y: (j + 0.5) * c,
          rot: 0,
          scale: mod(i + j, 2) ? 0.5 : 1.15,
          slot: mod(Math.floor((i + j) / 2), slots),
        }),
      }
    case 'wave':
      return {
        cw: c,
        ch: c,
        period: [WAVE, slots],
        place: (i, j) => ({
          x: (i + 0.5) * c,
          y: (j + 0.5) * c + Math.sin((mod(i, WAVE) / WAVE) * Math.PI * 2) * c * 0.32,
          rot: Math.cos((mod(i, WAVE) / WAVE) * Math.PI * 2) * 22,
          scale: 1,
          slot: mod(j, slots),
        }),
      }
    case 'spin':
      return {
        cw: c,
        ch: c,
        period: [2 * lcm(slots, 2), 2 * lcm(slots, 2)],
        place: (i, j) => ({
          x: (i + 0.5) * c,
          y: (j + 0.5) * c,
          rot: [0, 90, 270, 180][mod(i, 2) + 2 * mod(j, 2)] + 45 * mod(Math.floor(i / 2) + Math.floor(j / 2), 2),
          scale: 1,
          slot: mod(Math.floor(i / 2) + Math.floor(j / 2), slots),
        }),
      }
    case 'scatter': {
      // Jitter comes from a hash of the cell's position inside the repeat,
      // so the "random" look still tiles perfectly.
      const p = Math.max(SCATTER, slots)
      return {
        cw: c,
        ch: c,
        period: [p, p],
        place: (i, j) => {
          const a = mod(i, p)
          const b = mod(j, p)
          const r = (n: number) => hash2(a * 7 + n, b * 13 + n, seed)
          return {
            x: (i + 0.5 + (r(1) - 0.5) * 0.6) * c,
            y: (j + 0.5 + (r(2) - 0.5) * 0.6) * c,
            rot: r(3) * 360,
            scale: 0.7 + r(4) * 0.5,
            slot: Math.floor(r(5) * slots),
          }
        },
      }
    }
  }
}

export interface ShapeOptions {
  active: string[]
  layout: ShapeLayout
  size: number
  space: number
  palette: Palette
  seed: number
  custom: Arrangement | null
}

/** Tile width in CSS px for a hand-made arrangement, from the 0..1 Size slider. */
export const customTileSize = (t: number) => lerp(100, 900, t)
export const customSizeFor = (w: number) => Math.min(1, Math.max(0, (w - 100) / 800))

export interface ShapeRenderer extends Renderer {
  /** Shapes only, no paper: for the working frame, which shows them on graph paper. */
  paintInk(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void
}

function drawMotif(ctx: CanvasRenderingContext2D, motif: Motif, x: number, y: number, size: number, rot: number, ink: string) {
  const k = size / 24
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate((rot * Math.PI) / 180)
  ctx.scale(k, k)
  ctx.translate(-12, -12)
  ctx.fillStyle = ink
  ctx.fill(motif.path)
  ctx.restore()
}

function withPaper(paper: string, r: Omit<ShapeRenderer, 'paint'>): ShapeRenderer {
  return {
    ...r,
    paint(ctx, x, y, w, h) {
      ctx.fillStyle = paper
      ctx.fillRect(x, y, w, h)
      r.paintInk(ctx, x, y, w, h)
    },
  }
}

function createCustomRenderer(o: ShapeOptions, custom: Arrangement): ShapeRenderer {
  const W = customTileSize(o.size)
  const H = W * custom.aspect
  const inks = o.palette.inks
  return withPaper(o.palette.paper, {
    tileW: W,
    tileH: H,
    background: o.palette.paper,
    paintInk(ctx, x, y, w, h) {
      // Every tile that touches the area, plus one more, so shapes hanging
      // over a tile edge come back on the other side.
      const i0 = Math.floor(x / W) - 1
      const i1 = Math.ceil((x + w) / W) + 1
      const j0 = Math.floor(y / H) - 1
      const j1 = Math.ceil((y + h) / H) + 1
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          for (const st of custom.stamps) {
            const motif = MOTIF_BY_ID.get(st.motif)
            if (!motif) continue
            drawMotif(ctx, motif, (i + st.x) * W, (j + st.y) * H, st.size * W, st.rot, inks[st.ink % inks.length])
          }
        }
      }
    },
  })
}

export function createShapeRenderer(o: ShapeOptions): ShapeRenderer {
  if (o.layout === 'custom' && o.custom) return createCustomRenderer(o, o.custom)
  const motifs = o.active.map((id) => MOTIF_BY_ID.get(id)).filter((m): m is Motif => !!m)
  const inks = o.palette.inks
  // One shape cycles through every ink; several shapes each keep their own ink.
  const slots = motifs.length > 1 ? motifs.length : inks.length
  const s = shapeSize(o.size)
  const grid = layoutGrid(o.layout === 'custom' ? 'grid' : o.layout, s, o.space, slots, o.seed)
  const tileW = grid.period[0] * grid.cw
  const tileH = grid.period[1] * grid.ch

  return withPaper(o.palette.paper, {
    tileW,
    tileH,
    background: o.palette.paper,
    paintInk(ctx, x, y, w, h) {
      if (!motifs.length) return
      // Two extra cells on every side, so shapes cut by the edge are still drawn.
      const i0 = Math.floor(x / grid.cw) - 2
      const i1 = Math.ceil((x + w) / grid.cw) + 2
      const j0 = Math.floor(y / grid.ch) - 2
      const j1 = Math.ceil((y + h) / grid.ch) + 2
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const p = grid.place(i, j)
          drawMotif(ctx, motifs[p.slot % motifs.length], p.x, p.y, p.scale * s, p.rot, inks[p.slot % inks.length])
        }
      }
    },
  })
}

/**
 * Turn a preset layout into a hand-made arrangement: every shape whose centre
 * falls inside one tile becomes a stamp you can move. Used the first time
 * someone drags a shape in the working frame.
 */
export function arrangementFrom(o: ShapeOptions): { custom: Arrangement; size: number } {
  const motifs = o.active.map((id) => MOTIF_BY_ID.get(id)).filter((m): m is Motif => !!m)
  const slots = motifs.length > 1 ? motifs.length : o.palette.inks.length
  const s = shapeSize(o.size)
  const grid = layoutGrid(o.layout === 'custom' ? 'grid' : o.layout, s, o.space, slots, o.seed)
  const W = grid.period[0] * grid.cw
  const H = grid.period[1] * grid.ch
  const stamps: Stamp[] = []
    for (let j = -2; j <= grid.period[1] + 2; j++) {
    for (let i = -2; i <= grid.period[0] + 2; i++) {
      const p = grid.place(i, j)
      if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= H) continue
      stamps.push({
        id: newId(),
        motif: motifs[p.slot % motifs.length].id,
        x: p.x / W,
        y: p.y / H,
        size: (p.scale * s) / W,
        rot: p.rot,
        ink: p.slot % o.palette.inks.length,
      })
    }
  }
  // Keep the tile the same size on screen where the Size slider allows it.
  return { custom: { aspect: H / W, stamps }, size: customSizeFor(W) }
}
