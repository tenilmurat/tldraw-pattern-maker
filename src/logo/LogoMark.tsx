import type { CSSProperties } from 'react'
import raw from '../assets/logo.svg?raw'
import { INK, LOGO, parseLogo } from './motion'

const PATHS = parseLogo(raw)

/** A small grid of dots inside the square, for the ripple. Each knows its place in the wave. */
const RIPPLE: { x: number; y: number; k: number }[] = []
const STEP = LOGO.square.w / 6
for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) RIPPLE.push({ x: STEP * (i + 0.5), y: (LOGO.square.h / 6) * (j + 0.5), k: i + j })

/**
 * The header logo. On hover a little pattern ripples across the square,
 * corner to corner, and the semicolon gives a small nod: the same idea as
 * the welcome motion, quiet enough for a header.
 */
export function LogoMark({ height = 24 }: { height?: number }) {
  return (
    <svg
      className="logo-mark"
      viewBox={`0 0 ${LOGO.w} ${LOGO.h}`}
      height={height}
      width={(height * LOGO.w) / LOGO.h}
      role="img"
      aria-label="tldraw pattern"
    >
      <defs>
        <clipPath id="logo-square">
          <path d={PATHS.bg} />
        </clipPath>
      </defs>
      <path d={PATHS.bg} fill={INK} />
      <g clipPath="url(#logo-square)" className="logo-ripple">
        {RIPPLE.map((d) => (
          <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={1.6} fill="#fff" style={{ '--k': d.k } as CSSProperties} />
        ))}
      </g>
      <g className="logo-semicolon">
        <path d={PATHS.dot} fill="#fff" />
        <path d={PATHS.tail} fill="#fff" fillRule="evenodd" />
      </g>
      <path d={PATHS.tldraw} fill={INK} fillRule="evenodd" />
      <path className="logo-word" d={PATHS.pattern} fill={INK} fillRule="evenodd" />
    </svg>
  )
}
