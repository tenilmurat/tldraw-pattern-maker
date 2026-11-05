import {
  b64Vecs,
  Box,
  createShapeId,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultSizeStyle,
  getColorValue,
  type Editor,
  type TLDefaultColorStyle,
  type TLDefaultSizeStyle,
  type TLShapePartial,
} from 'tldraw'
import type { PenId } from './pens'
import type { Box as TileBox } from './symmetry'
import type { Stroke } from '../state/types'

/**
 * The drawing frame is a tldraw canvas. One tile is TILE page units square,
 * about the size the frame shows on screen, so tldraw's pens feel the size
 * tldraw meant them to be.
 */
export const TILE = 600

/** The drawing as a picture, for the pattern. `box` is where it sits, in tile units (0..1 is one tile). */
export interface DrawArt {
  image: ImageBitmap
  box: TileBox
}

/** Each pen in the tray is one of tldraw's tools with a size and line style. */
export interface TlPen {
  tool: 'draw' | 'highlight' | 'eraser'
  size?: TLDefaultSizeStyle
  dash?: 'draw' | 'solid'
  opacity?: number
}

export const TL_PENS: Record<PenId, TlPen> = {
  pencil: { tool: 'draw', size: 's', dash: 'draw', opacity: 0.8 },
  pen: { tool: 'draw', size: 'm', dash: 'draw' },
  fineliner: { tool: 'draw', size: 's', dash: 'solid' },
  marker: { tool: 'draw', size: 'l', dash: 'solid' },
  highlighter: { tool: 'highlight', size: 'l' },
  brush: { tool: 'draw', size: 'xl', dash: 'draw' },
  fountain: { tool: 'draw', size: 'l', dash: 'draw' },
  eraser: { tool: 'eraser' },
}

export const TL_SIZES: TLDefaultSizeStyle[] = ['s', 'm', 'l', 'xl']
export const TL_SIZE_NAMES: Record<TLDefaultSizeStyle, string> = { s: 'S', m: 'M', l: 'L', xl: 'XL' }

/** tldraw's own colours, in the order its style panel shows them. */
export const TL_COLOURS: TLDefaultColorStyle[] = [
  'black',
  'grey',
  'light-violet',
  'violet',
  'blue',
  'light-blue',
  'yellow',
  'orange',
  'green',
  'light-green',
  'light-red',
  'red',
  'white',
]

export const colourValue = (editor: Editor, colour: TLDefaultColorStyle) =>
  getColorValue(editor.getCurrentTheme().colors[editor.getColorMode()], colour, 'solid')

/** Pick up a pen: its tldraw tool, size, line style and opacity. */
export function takePen(editor: Editor, pen: PenId) {
  const p = TL_PENS[pen]
  editor.run(() => {
    if (p.size) editor.setStyleForNextShapes(DefaultSizeStyle, p.size)
    if (p.dash) editor.setStyleForNextShapes(DefaultDashStyle, p.dash)
    editor.setOpacityForNextShapes(p.opacity ?? 1)
  })
  editor.setCurrentTool(p.tool)
}

/** How far the drawing in tldraw has been turned, kept in the tldraw document so undo turns it back too. */
export const turnOf = (editor: Editor) => {
  const turn = editor.getDocumentSettings().meta.turn
  return typeof turn === 'number' ? turn : 0
}

/** Turn every shape around the middle of the tile until the drawing is at `deg`. One undo step per turn gesture. */
export function turnTo(editor: Editor, deg: number) {
  const from = turnOf(editor)
  if (from === deg) return
  const ids = [...editor.getCurrentPageShapeIds()]
  const doc = editor.getDocumentSettings()
  editor.run(() => {
    if (ids.length) editor.rotateShapesBy(ids, ((deg - from) * Math.PI) / 180, { center: { x: TILE / 2, y: TILE / 2 } })
    // Straight into the store rather than updateDocumentSettings, which tldraw keeps out of undo.
    editor.store.put([{ ...doc, meta: { ...doc.meta, turn: deg } }])
  })
}

/** Fit the camera so one tile fills the frame, and keep it there. */
export function fitTile(editor: Editor, framePx: number) {
  editor.setCameraOptions({ isLocked: true, wheelBehavior: 'none' })
  editor.setCamera({ x: 0, y: 0, z: framePx / TILE }, { force: true, immediate: true })
}

/** The whole drawing as a transparent picture, or null when the page is empty. */
/**
 * Pixels per page unit for the drawing's picture. Quick while you draw; once you
 * stop, sharp enough for the biggest download (a 4K or A4 tile at full Size is
 * about 1750 px across, and 4 × 600 gives 2400).
 */
const QUICK = 2
const SHARP = 4

export async function exportArt(editor: Editor, scale = QUICK): Promise<DrawArt | null> {
  const ids = [...editor.getCurrentPageShapeIds()]
  const b = editor.getCurrentPageBounds()
  if (!ids.length || !b) return null
  // A little room around the shapes so thick and wobbly lines aren't clipped.
  const pad = 24
  const bounds = new Box(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2)
  const { blob } = await editor.toImage(ids, { format: 'png', background: false, bounds, padding: 0, scale, pixelRatio: 1 })
  const image = await createImageBitmap(blob)
  return {
    image,
    box: {
      minX: bounds.x / TILE,
      minY: bounds.y / TILE,
      maxX: (bounds.x + bounds.w) / TILE,
      maxY: (bounds.y + bounds.h) / TILE,
    },
  }
}

/**
 * Keep a picture of the drawing up to date: a quick one shortly after any
 * change, then a sharp one once you've paused, which is what downloads use.
 * Never two exports at once. Returns a function that stops watching.
 */
export function watchArt(editor: Editor, onArt: (art: DrawArt | null) => void): () => void {
  let quickTimer = 0
  let sharpTimer = 0
  let busy = false
  let alive = true
  // What's waiting to be exported; quick pictures go first so drawing never lags.
  let wantQuick = false
  let wantSharp = false
  // Bumped on every change, so a sharp picture of an older drawing is never shown.
  let version = 0

  const pump = async () => {
    if (busy || !alive) return
    const scale = wantQuick ? QUICK : wantSharp ? SHARP : 0
    if (!scale) return
    if (scale === QUICK) wantQuick = false
    else wantSharp = false
    busy = true
    const at = version
    try {
      const art = await exportArt(editor, scale)
      // A quick picture always helps while you draw; a sharp one only if nothing changed meanwhile.
      if (alive && (scale === QUICK || at === version)) onArt(art)
    } catch {
      // A failed export leaves the last picture in place.
    }
    busy = false
    void pump()
  }
  const schedule = () => {
    if (!quickTimer) {
      quickTimer = window.setTimeout(() => {
        quickTimer = 0
        wantQuick = true
        void pump()
      }, 80)
    }
    clearTimeout(sharpTimer)
    sharpTimer = window.setTimeout(() => {
      wantSharp = true
      void pump()
    }, 500)
  }
  schedule()
  const stop = editor.store.listen(
    () => {
      version++
      schedule()
    },
    { scope: 'document', source: 'all' },
  )
  return () => {
    alive = false
    stop()
    clearTimeout(quickTimer)
    clearTimeout(sharpTimer)
  }
}

const hexRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** The tldraw colour nearest to any hex colour. */
function nearestColour(editor: Editor, hex: string): TLDefaultColorStyle {
  const [r, g, b] = hexRgb(hex)
  let best: TLDefaultColorStyle = 'black'
  let bestD = Infinity
  for (const c of TL_COLOURS) {
    const [r2, g2, b2] = hexRgb(colourValue(editor, c))
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2
    if (d < bestD) {
      best = c
      bestD = d
    }
  }
  return best
}

/** Base stroke widths of tldraw's sizes, in page units. */
const STROKE = { s: 2, m: 3.5, l: 5, xl: 10 }

/**
 * Bring lines drawn before the canvas was tldraw (a drawing saved
 * by an earlier version) into tldraw as draw shapes, so nothing you made is lost.
 */
export function importStrokes(editor: Editor, strokes: Stroke[]) {
  const shapes: TLShapePartial[] = strokes
    .filter((s) => s.pen !== 'eraser' && s.points.length > 1)
    .map((s) => {
      const [x0, y0] = s.points[0]
      const width = s.size * TILE
      const size: TLDefaultSizeStyle = width >= 10 ? 'xl' : width >= 5 ? 'l' : width >= 3.5 ? 'm' : 's'
      return {
        id: createShapeId(),
        type: 'draw',
        x: x0 * TILE,
        y: y0 * TILE,
        opacity: s.opacity,
        props: {
          segments: [
            {
              type: 'free',
              path: b64Vecs.encodePoints(s.points.map(([x, y]) => ({ x: (x - x0) * TILE, y: (y - y0) * TILE, z: 0.5 }))),
            },
          ],
          color: nearestColour(editor, s.colour),
          size,
          dash: 'draw',
          isComplete: true,
          scale: Math.max(0.5, width / STROKE[size]),
        },
      }
    })
  if (!shapes.length) return
  editor.run(() => editor.createShapes(shapes), { history: 'ignore' })
}

export { DefaultColorStyle, DefaultSizeStyle }
