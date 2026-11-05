/**
 * The logo's welcome motion: "a pattern being made".
 *
 * The semicolon's dot appears alone, repeats outward into a soft grid of
 * dots, the grid settles away as the dark square grows in behind the dot,
 * and the lockup slides into place with "tldraw" and then "pattern".
 *
 * Everything is a pure function of time, so the site and the 4K video are
 * the same frames. No browser APIs here: the video is rendered from this
 * file in Node.
 */

export interface LogoPaths {
  /** The dark rounded square. */
  bg: string
  /** The semicolon's dot. */
  dot: string
  /** The semicolon's tail. */
  tail: string
  tldraw: string
  pattern: string
}

/** The logo's five shapes, in the order logo.svg draws them. */
export function parseLogo(svg: string): LogoPaths {
  const d = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])
  return { bg: d[0], dot: d[1], tail: d[2], tldraw: d[3], pattern: d[4] }
}

export const INK = '#111111'

/**
 * Where things are in logo.svg (units of its viewBox): the square is 64 tall
 * at the top left, the dot sits in its upper half, then "tldraw", then "pattern".
 */
export const LOGO = {
  w: 432,
  h: 73,
  square: { w: 62.59, h: 64 },
  dot: { x: 31.38, y: 19.09 },
  tldraw: [74, 251.5] as const,
  pattern: [251.5, 436] as const,
}
/** Seconds until the logo has settled. */
export const SETTLED = 3.1

/**
 * The mark's arrival: the square, the white dot and the tail all land
 * together on this beat, and the welcome sound's peak is placed on it.
 */
export const MARK_AT = 0.95

/**
 * A 16:9 stage in logo units, centred on the lockup. The logo fills about a
 * third of its width; the dots are in logo units too, so they scale with it.
 */
const STAGE_W = 1320
export const STAGE = { x: LOGO.w / 2 - STAGE_W / 2, y: LOGO.h / 2 - (STAGE_W * 9) / 32, w: STAGE_W, h: (STAGE_W * 9) / 16 }

/** Where the dot sits inside the mark, and how far the mark starts from its place: dot in the middle of the stage. */
const DOT = LOGO.dot
const START_SHIFT = LOGO.w / 2 - DOT.x

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const easeOut = (v: number) => 1 - (1 - v) ** 3
const easeInOut = (v: number) => (v < 0.5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2)
const mix = (a: number, b: number, v: number) => a + (b - a) * v
const f = (n: number) => +n.toFixed(3)

/** The grid of dots the pattern blooms into, around where the dot starts. */
const GRID = 36
const DOTS: { i: number; j: number; d: number }[] = []
// Enough rows and columns to reach every edge of the stage.
const COLS = Math.ceil(STAGE_W / 2 / GRID)
const ROWS = Math.ceil((STAGE_W * 9) / 32 / GRID) + 1
for (let j = -ROWS; j <= ROWS; j++) for (let i = -COLS; i <= COLS; i++) if (i || j) DOTS.push({ i, j, d: Math.hypot(i, j) })
const D_MAX = Math.max(...DOTS.map((p) => p.d))

const mixColour = (a: string, b: string, v: number) => {
  const p = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16))
  const [x, y] = [p(a), p(b)]
  return '#' + x.map((c, k) => Math.round(mix(c, y[k], v)).toString(16).padStart(2, '0')).join('')
}

/**
 * The inside of the stage SVG at time `t` (seconds): the dot field and the
 * lockup. At `t >= SETTLED` it is exactly the static logo.
 */
export function welcomeFrame(t: number, paths: LogoPaths, opts: { dotReady?: boolean } = {}): string {
  const parts: string[] = []

  // 1. The pattern: dots bloom outward from the centre, then settle away.
  const cx = DOT.x + START_SHIFT
  for (const p of DOTS) {
    const k = p.d / D_MAX
    const appear = easeOut(span(t, 0.15 + 0.6 * k, 0.65 + 0.6 * k))
    const leave = easeInOut(span(t, 1.2 + 0.5 * k, 1.75 + 0.5 * k))
    const v = appear * (1 - leave)
    if (v <= 0.001) continue
    const drift = 1 + 0.08 * leave
    parts.push(
      `<circle cx="${f(cx + p.i * GRID * drift)}" cy="${f(DOT.y + p.j * GRID * drift)}" r="${f(3 * v)}" fill="${INK}" fill-opacity="${f(0.16 * v)}"/>`,
    )
  }

  // 2. The words, drawn under the mark: they come out from behind it as it slides home.
  const word = (d: string, v: number, x0: number, x1: number, dx: number, dy: number, id: string) => {
    if (v <= 0) return
    parts.push(
      `<clipPath id="${id}"><rect x="${x0}" y="-10" width="${f((x1 - x0) * v)}" height="120"/></clipPath>`,
      `<g clip-path="url(#${id})"><path d="${d}" fill="${INK}" fill-rule="evenodd" fill-opacity="${f(v)}" transform="translate(${f(dx * (1 - v))} ${f(dy * (1 - v))})"/></g>`,
    )
  }
  word(paths.tldraw, easeOut(span(t, 1.9, 2.65)), LOGO.tldraw[0], LOGO.tldraw[1], -10, 0, 'wipe-tldraw')
  word(paths.pattern, easeOut(span(t, 2.2, 3.0)), LOGO.pattern[0], LOGO.pattern[1], 0, 6, 'wipe-pattern')

  // 3. The mark: the dot first, then the square, dot and tail arrive together on one beat; then it slides home.
  const shift = START_SHIFT * (1 - easeInOut(span(t, 1.55, 2.35)))
  // The dot grows in first, unless it's already there (the welcome waited on it for a click).
  const dotScale = opts.dotReady ? 1 : easeOut(span(t, 0, 0.55))
  // The square grows in fast, lands a touch big right on the beat, and settles.
  const grow = easeOut(span(t, MARK_AT - 0.2, MARK_AT))
  const settle = easeInOut(span(t, MARK_AT, MARK_AT + 0.3))
  const square = t < MARK_AT - 0.2 ? 0 : mix(mix(0.35, 1.04, grow), 1, settle)
  const squareIn = easeOut(span(t, MARK_AT - 0.2, MARK_AT - 0.08))
  const dotColour = mixColour(INK, '#ffffff', easeInOut(span(t, MARK_AT - 0.16, MARK_AT - 0.04)))
  // The tail follows a moment later, onto the solid square.
  const tail = easeOut(span(t, MARK_AT - 0.1, MARK_AT))
  const about = (s: number) => `translate(${DOT.x} ${DOT.y}) scale(${f(s)}) translate(${-DOT.x} ${-DOT.y})`
  parts.push(`<g transform="translate(${f(shift)} 0)">`)
  if (square > 0) parts.push(`<path d="${paths.bg}" fill="${INK}" fill-opacity="${f(squareIn)}" transform="${about(square)}"/>`)
  if (tail > 0) parts.push(`<path d="${paths.tail}" fill="#ffffff" fill-rule="evenodd" fill-opacity="${f(tail)}" transform="translate(0 ${f(-5 * (1 - tail))})"/>`)
  if (dotScale > 0) parts.push(`<path d="${paths.dot}" fill="${dotColour}" transform="${about(dotScale)}"/>`)
  parts.push(`</g>`)

  return parts.join('')
}

/** When the dots begin to bloom: a welcome waiting for a click holds just before this, on the dot alone. */
export const BLOOM_AT = 0.15

/**
 * Waiting for a click: the black dot alone in the middle, breathing, with
 * soft rings pulsing out of it. A click carries the motion on from BLOOM_AT.
 */
export function waitingFrame(paths: LogoPaths): string {
  const cx = DOT.x + START_SHIFT
  const ring = (delay: number) =>
    `<circle class="welcome-pulse" cx="${f(cx)}" cy="${DOT.y}" r="5.8" fill="${INK}" style="animation-delay:${delay}s"/>`
  // The second ring starts halfway through the first, so they stay evenly spaced.
  return `${ring(0)}${ring(1.6)}<g transform="translate(${f(START_SHIFT)} 0)"><path class="welcome-breathe" d="${paths.dot}" fill="${INK}"/></g>`
}

/** A whole stage SVG, for the video (and anything else that wants a file). */
export function welcomeSvg(t: number, paths: LogoPaths, size?: { width: number; height: number; background?: string }) {
  const { x, y, w, h } = STAGE
  const dims = size ? ` width="${size.width}" height="${size.height}"` : ''
  const bg = size?.background ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${size.background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"${dims} preserveAspectRatio="xMidYMid slice">${bg}${welcomeFrame(t, paths)}</svg>`
}

/**
 * The header logo's replay, when you hover it: the mark stays exactly where
 * it is, and only the words play again. "tldraw" and "pattern" fade out
 * quickly, then wipe back in the way they arrive in the welcome. At
 * `t >= REPLAY_LENGTH` it is exactly the static logo.
 */
export const REPLAY_LENGTH = 1.0

export function replayFrame(t: number, paths: LogoPaths): string {
  const parts: string[] = []
  // The words dissolve first, then come back one after the other.
  const gone = easeInOut(span(t, 0, 0.15))
  const back = t >= 0.15
  const word = (d: string, v: number, x0: number, x1: number, dx: number, dy: number, id: string) => {
    const wipe = back ? v : 1
    const opacity = back ? v : 1 - gone
    if (opacity <= 0 || wipe <= 0) return
    const shift = back ? 1 - v : 0
    parts.push(
      `<clipPath id="${id}"><rect x="${x0}" y="-10" width="${f((x1 - x0) * wipe)}" height="120"/></clipPath>`,
      `<g clip-path="url(#${id})"><path d="${d}" fill="${INK}" fill-rule="evenodd" fill-opacity="${f(opacity)}" transform="translate(${f(dx * shift)} ${f(dy * shift)})"/></g>`,
    )
  }
  word(paths.tldraw, easeOut(span(t, 0.2, 0.65)), LOGO.tldraw[0], LOGO.tldraw[1], -10, 0, 'replay-tldraw')
  word(paths.pattern, easeOut(span(t, 0.4, 0.95)), LOGO.pattern[0], LOGO.pattern[1], 0, 6, 'replay-pattern')
  // The mark stays as it is.
  parts.push(
    `<path d="${paths.bg}" fill="${INK}"/>`,
    `<path d="${paths.tail}" fill="#ffffff" fill-rule="evenodd"/>`,
    `<path d="${paths.dot}" fill="#ffffff"/>`,
  )
  return parts.join('')
}
