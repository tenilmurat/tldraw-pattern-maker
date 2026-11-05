import { grainFor, outlinePath, PEN } from './pens'
import { lerp, tileDensity, tileRenderer, type TileRenderer } from './renderer'
import { latticeOffsets, multiply, SYMMETRIES, transformBox, type Affine, type Box, type SymmetryId } from './symmetry'
import type { Stroke } from '../state/types'
import type { DrawArt } from './tldraw'

/** Turn by `deg` around the middle of the drawing canvas (0.5, 0.5 in tile units). */
export function turnAbout(deg: number): Affine {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [c, s, -s, c, 0.5 - c * 0.5 + s * 0.5, 0.5 - s * 0.5 - c * 0.5]
}

/** CSS px per tile unit for the 0..1 Size slider. */
export const drawTileSize = (t: number) => lerp(150, 560, t)

interface StrokeShape {
  path: Path2D
  box: Box
}

const shapeCache = new WeakMap<Stroke, StrokeShape>()

function shapeOf(stroke: Stroke): StrokeShape {
  let shape = shapeCache.get(stroke)
  if (!shape) {
    const r = stroke.size / 2
    const xs = stroke.points.map((p) => p[0])
    const ys = stroke.points.map((p) => p[1])
    shape = {
      path: outlinePath(stroke.points, stroke.pen, stroke.size),
      box: {
        minX: Math.min(...xs) - r,
        minY: Math.min(...ys) - r,
        maxX: Math.max(...xs) + r,
        maxY: Math.max(...ys) + r,
      },
    }
    shapeCache.set(stroke, shape)
  }
  return shape
}

/** Draw one stroke with every mirror/turn of the group, wrapped into the tile. */
function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, symmetry: SymmetryId, T: number, turn: Affine) {
  const g = SYMMETRIES[symmetry]
  const pen = PEN[stroke.pen]
  const { path, box } = shapeOf(stroke)

  ctx.save()
  ctx.globalAlpha = stroke.opacity
  ctx.globalCompositeOperation = pen.erase ? 'destination-out' : 'source-over'
  for (const g0 of g.ops) {
    // The drawing's own turn goes first, then the repeat style's mirrors.
    const op = multiply(g0, turn)
    for (const [ox, oy] of latticeOffsets(g, transformBox(op, box))) {
      ctx.save()
      ctx.scale(T, T)
      ctx.translate(ox, oy)
      ctx.transform(...op)
      if (pen.grain) {
        // Grain is pinned to device pixels, so it stays fine at every size.
        const grain = ctx.createPattern(grainFor(stroke.colour), 'repeat')!
        grain.setTransform(ctx.getTransform().inverse())
        ctx.fillStyle = grain
      } else {
        ctx.fillStyle = pen.erase ? '#000' : stroke.colour
      }
      ctx.fill(path)
      ctx.restore()
    }
  }
  ctx.restore()
}

/**
 * The tldraw drawing, as a picture, with every mirror/turn of the group and
 * wrapped into the tile, exactly like a stroke. `turn` is any turn the
 * picture doesn't already have in it.
 */
function drawArt(ctx: CanvasRenderingContext2D, art: DrawArt, symmetry: SymmetryId, T: number, turn: Affine) {
  const g = SYMMETRIES[symmetry]
  const { minX, minY, maxX, maxY } = art.box
  for (const g0 of g.ops) {
    const op = multiply(g0, turn)
    for (const [ox, oy] of latticeOffsets(g, transformBox(op, art.box))) {
      ctx.save()
      ctx.scale(T, T)
      ctx.translate(ox, oy)
      ctx.transform(...op)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(art.image, minX, minY, maxX - minX, maxY - minY)
      ctx.restore()
    }
  }
}

/**
 * Strokes exactly as drawn: no mirrors, no wrapping. This is the free canvas
 * in the working frame; the repeat style is only applied to the pattern.
 * `unitPx` is CSS px per tile unit; ctx should already be scaled for the screen.
 */
export function drawPlain(ctx: CanvasRenderingContext2D, strokes: Stroke[], unitPx: number, rotation = 0) {
  const turn = turnAbout(rotation)
  for (const stroke of strokes) {
    const pen = PEN[stroke.pen]
    const { path } = shapeOf(stroke)
    ctx.save()
    ctx.globalAlpha = stroke.opacity
    ctx.globalCompositeOperation = pen.erase ? 'destination-out' : 'source-over'
    ctx.scale(unitPx, unitPx)
    ctx.transform(...turn)
    if (pen.grain) {
      const grain = ctx.createPattern(grainFor(stroke.colour), 'repeat')!
      grain.setTransform(ctx.getTransform().inverse())
      ctx.fillStyle = grain
    } else {
      ctx.fillStyle = pen.erase ? '#000' : stroke.colour
    }
    ctx.fill(path)
    ctx.restore()
  }
}

/** Forget the cached outline of a stroke that is still growing. */
export const forgetStroke = (s: Stroke) => shapeCache.delete(s)

export interface DrawOptions {
  strokes: Stroke[]
  symmetry: SymmetryId
  size: number
  paper: string
  /** Turn of the whole drawing, in degrees, around the middle of the canvas. */
  rotation: number
  /** The drawing made in the tldraw frame, if any. */
  art?: DrawArt | null
  /** How much of `rotation` the tldraw drawing already has in it. */
  turned?: number
}

export interface DrawRenderer extends TileRenderer {
  /** The ink on its own, on a clear background, so the eraser has something to rub out. */
  inkAt(k: number): HTMLCanvasElement
}

/** Paint strokes onto a clear layer the same size as `target`, then lay it over the paper. */
function composite(
  target: CanvasRenderingContext2D,
  draw: (layer: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const layer = document.createElement('canvas')
  layer.width = target.canvas.width
  layer.height = target.canvas.height
  const lctx = layer.getContext('2d')!
  lctx.setTransform(target.getTransform())
  draw(lctx)
  target.save()
  target.setTransform(1, 0, 0, 1, 0, 0)
  target.drawImage(layer, 0, 0)
  target.restore()
  return layer
}

export function createDrawRenderer(o: DrawOptions): DrawRenderer {
  const g = SYMMETRIES[o.symmetry]
  const T = drawTileSize(o.size)
  const turn = turnAbout(o.rotation)
  const ink = new Map<number, HTMLCanvasElement>()
  const base = tileRenderer(g.tileW * T, g.tileH * T, o.paper, (ctx, k) => {
    ink.set(
      k,
      composite(ctx, (layer) => {
        if (o.art) drawArt(layer, o.art, o.symmetry, T, turnAbout(o.rotation - (o.turned ?? 0)))
        for (const s of o.strokes) drawStroke(layer, s, o.symmetry, T, turn)
      }),
    )
  })
  return {
    ...base,
    inkAt(k) {
      base.tileAt(k)
      return ink.get(tileDensity(k, base.tileW, base.tileH))!
    },
  }
}

/** Finished ink plus the stroke in progress, on a clear layer (for the working frame). */
export function liveInk(base: DrawRenderer, live: Stroke, o: DrawOptions, k: number): HTMLCanvasElement {
  const T = drawTileSize(o.size)
  const done = base.inkAt(k)
  const layer = document.createElement('canvas')
  layer.width = done.width
  layer.height = done.height
  const ctx = layer.getContext('2d')!
  ctx.drawImage(done, 0, 0)
  ctx.setTransform(done.width / base.tileW, 0, 0, done.height / base.tileH, 0, 0)
  shapeCache.delete(live)
  drawStroke(ctx, live, o.symmetry, T, turnAbout(o.rotation))
  return layer
}

/**
 * The stroke being drawn right now, on top of the finished ones. Reuses the
 * finished ink so each pointer move only costs one stroke.
 */
export function withLiveStroke(base: DrawRenderer, live: Stroke, o: DrawOptions): TileRenderer {
  return tileRenderer(base.tileW, base.tileH, o.paper, (ctx, k) => {
    const ink = liveInk(base, live, o, k)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(ink, 0, 0)
    ctx.restore()
  })
}

/** A starter drawing so Draw never opens on an empty page. */
export function starterStrokes(): Stroke[] {
  const curve = (
    id: number,
    pen: Stroke['pen'],
    f: (t: number) => [number, number],
    size: number,
    colour: string,
    w: (t: number) => number = () => 1,
  ): Stroke => ({
    id,
    pen,
    size,
    colour,
    opacity: PEN[pen].opacity,
    points: Array.from({ length: 32 }, (_, i) => {
      const t = i / 31
      const [x, y] = f(t)
      return [x, y, w(t)]
    }),
  })
  // A small sprig in the middle of the canvas.
  return [
    curve(1, 'brush', (t) => [0.5 + Math.sin(t * Math.PI) * 0.04, 0.78 - t * 0.46], 0.035, '#3f9a50', (t) => 1 - t * 0.6),
    curve(2, 'brush', (t) => [0.5 + t * 0.2, 0.6 - Math.sin(t * Math.PI) * 0.08 - t * 0.05], 0.06, '#88b93a', (t) => Math.sin(t * Math.PI)),
    curve(3, 'brush', (t) => [0.5 - t * 0.18, 0.5 - Math.sin(t * Math.PI) * 0.07 - t * 0.06], 0.055, '#88b93a', (t) => Math.sin(t * Math.PI)),
    curve(4, 'marker', (t) => [0.52 + Math.cos(t * Math.PI * 2) * 0.03, 0.27 + Math.sin(t * Math.PI * 2) * 0.03], 0.045, '#f0a92e'),
    curve(5, 'fineliner', (t) => [0.3 + t * 0.08, 0.8 - Math.sin(t * Math.PI) * 0.04], 0.008, '#151515'),
  ]
}
