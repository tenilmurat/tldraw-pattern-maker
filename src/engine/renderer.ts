/**
 * A renderer knows one repeating tile and how to paint the pattern over any
 * rectangle. Coordinates are CSS pixels in "pattern space"; `k` is how many
 * device pixels one CSS pixel gets (devicePixelRatio on screen, more for print).
 *
 * Two strategies sit behind this one interface:
 * - Shapes and Paper paint directly, cell by cell, so they stay sharp at any size.
 * - Draw and Photo build one tile canvas and fill with it as a pattern,
 *   because their tiles are expensive to compute and cheap to repeat.
 */
export interface Renderer {
  /** Size of one repeat, in CSS pixels. */
  tileW: number
  tileH: number
  background: string
  paint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number): void
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mod = (n: number, m: number) => ((n % m) + m) % m
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
export const lcm = (a: number, b: number) => (a * b) / gcd(a, b)

/** Largest side, in device pixels, we let a cached tile grow to. */
const MAX_TILE_PX = 4096

/** The pixel density a cached tile actually gets once it is capped. */
export const tileDensity = (k: number, tileW: number, tileH: number) =>
  Math.min(k, MAX_TILE_PX / Math.max(tileW, tileH))

export interface TileRenderer extends Renderer {
  tileAt(k: number): HTMLCanvasElement
}

/**
 * Wrap a "draw one tile" function into a renderer that caches the tile per
 * pixel density and fills with it. Tile canvases are whole pixels on purpose:
 * a fractional tile is what produces the hairline seams people complain about.
 */
export function tileRenderer(
  tileW: number,
  tileH: number,
  background: string,
  drawTile: (ctx: CanvasRenderingContext2D, k: number) => void,
): TileRenderer {
  const cache = new Map<number, HTMLCanvasElement>()

  const tileAt = (k: number) => {
    const kk = tileDensity(k, tileW, tileH)
    let canvas = cache.get(kk)
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(tileW * kk))
      canvas.height = Math.max(1, Math.round(tileH * kk))
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(canvas.width / tileW, 0, 0, canvas.height / tileH, 0, 0)
      ctx.fillStyle = background
      ctx.fillRect(0, 0, tileW, tileH)
      drawTile(ctx, kk)
      cache.set(kk, canvas)
    }
    return canvas
  }

  return {
    tileW,
    tileH,
    background,
    tileAt,
    paint(ctx, x, y, w, h, k) {
      const tile = tileAt(k)
      ctx.imageSmoothingQuality = 'high'
      const pattern = ctx.createPattern(tile, 'repeat')
      if (!pattern) return
      pattern.setTransform(new DOMMatrix([tileW / tile.width, 0, 0, tileH / tile.height, 0, 0]))
      ctx.fillStyle = pattern
      ctx.fillRect(x, y, w, h)
    },
  }
}
