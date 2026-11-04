import { useId, type ReactNode } from 'react'
import type { PenId } from '../../engine/pens'

/**
 * Pen illustrations for the tray, lit as objects rather than outlined:
 * a barrel, a black collar with a sheen, a band and a tip in the ink colour.
 * Every coloured part takes the ink you picked, so the whole tray shows the
 * colour you're holding. Barrel colours come from CSS variables so light and
 * dark themes share the same artwork.
 *
 * Drawn on a 28 × 84 box; the barrel starts at y = 40.
 */
export function PenArt({ pen, ink }: { pen: PenId; ink: string }) {
  const id = useId().replace(/:/g, '')
  const u = (name: string) => `url(#${name}-${id})`

  /** An ink-coloured shape with a soft highlight down its left side. */
  const inked = (d: string) => (
    <>
      <path d={d} fill={ink} />
      <path d={d} fill={u('gloss')} />
    </>
  )
  /** The coloured ring between collar and barrel. */
  const band = (colour = ink) => (
    <>
      <rect x="4" y="35.6" width="20" height="4.4" fill={colour} />
      <rect x="4" y="35.6" width="20" height="4.4" fill={u('gloss')} />
    </>
  )
  /** Black moulded collar: shoulders from the barrel up to a narrower top. */
  const collar = (top: number, inset: number, shoulder: number) => (
    <path
      d={`M4 35.6V${shoulder}L${4 + inset} ${top}H${24 - inset}L24 ${shoulder}V35.6Z`}
      fill={u('collar')}
    />
  )

  const art: Record<PenId, ReactNode> = {
    pencil: (
      <>
        {/* Sharpened wood in three facets, graphite in the ink colour. */}
        <path d="M4 35.6V33L14 6.3 24 33v2.6Z" fill="#e7d4ae" />
        <path d="M10.7 35.6 14 6.3 17.3 35.6Z" fill="#f2e6c9" />
        <path d="M17.3 35.6 14 6.3 24 33v2.6Z" fill="#dbc398" />
        {/* The lead is the sharpened top of the same cone: it follows the wood's
            edges and is cut straight across, with the same three facets. */}
        <path d="M14 6.3 9.6 18H18.4Z" fill={ink} />
        <path d="M14 6.3 12.5 18H15.5Z" fill="#fff" opacity=".2" />
        <path d="M14 6.3 15.5 18H18.4Z" fill="#000" opacity=".2" />
        {band()}
      </>
    ),
    pen: (
      <>
        {inked('M10.4 23.7 14 6.3l3.6 17.4Z')}
        {collar(23.7, 3.7, 31.8)}
        {band()}
      </>
    ),
    fineliner: (
      <>
        {inked('M13 26.4V7.3a1 1 0 0 1 2 0v19.1Z')}
        <path d="M11 29.4 11.9 26.3h4.2l.9 3.1Z" fill={u('metal')} />
        {collar(29.4, 6, 32.6)}
        {band()}
      </>
    ),
    marker: (
      <>
        {inked('M9.7 25 10.6 8.7C10.7 7.2 11.6 6.3 13 6.3h2c1.4 0 2.3.9 2.4 2.4l.9 16.3Z')}
        {collar(25, 5.7, 32)}
        {band()}
      </>
    ),
    highlighter: (
      <>
        {/* The highlighter keeps its own colour, passed in as `ink`. */}
        {inked('M7.3 24.5V14.6L19.4 9.7C20.1 9.4 20.7 9.9 20.7 10.6V24.5Z')}
        {collar(24.5, 3.3, 32)}
        {band()}
      </>
    ),
    brush: (
      <>
        {inked('M8.4 27.6C7.6 21.5 10 14.5 14 6.5c4 8 6.4 15 5.6 21.1Z')}
        <path d="M4 35.6V28.7c0-.7.5-1.2 1.2-1.2h17.6c.7 0 1.2.5 1.2 1.2v6.9Z" fill={u('metal')} />
        <rect x="4" y="27.5" width="20" height="1.4" rx=".7" fill="#fff" opacity=".18" />
        {band()}
      </>
    ),
    fountain: (
      <>
        <path d="M10.4 25.6C10.4 18.6 11.6 12.4 14 6.3c2.4 6.1 3.6 12.3 3.6 19.3Z" fill={u('gold')} />
        <path d="M14 9.5V16.6" stroke="#7a5f22" strokeWidth=".8" strokeLinecap="round" />
        <circle cx="14" cy="17.4" r="1.2" fill="#7a5f22" />
        {collar(25.6, 6.3, 32)}
        {band()}
      </>
    ),
    eraser: (
      <>
        <path d="M4.6 31.4V10.2c0-2.2 1.7-3.9 3.9-3.9h11c2.2 0 3.9 1.7 3.9 3.9v21.2Z" fill={u('rubber')} />
        <path d="M3.7 31.2h20.6V40H3.7Z" fill={u('metal')} />
        <rect x="3.7" y="31.2" width="20.6" height="1" fill="#fff" opacity=".25" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 28 84" width="28" height="84" aria-hidden="true" className="pen-art">
      <defs>
        <linearGradient id={`barrel-${id}`} x1="0" x2="1">
          <stop offset="0" style={{ stopColor: 'var(--barrel-edge)' }} />
          <stop offset=".28" style={{ stopColor: 'var(--barrel-light)' }} />
          <stop offset=".62" style={{ stopColor: 'var(--barrel-mid)' }} />
          <stop offset="1" style={{ stopColor: 'var(--barrel-edge)' }} />
        </linearGradient>
        <linearGradient id={`collar-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#0c0c0e" />
          <stop offset=".22" stopColor="#2f2f33" />
          <stop offset=".45" stopColor="#131315" />
          <stop offset=".8" stopColor="#1d1d20" />
          <stop offset="1" stopColor="#0a0a0b" />
        </linearGradient>
        <linearGradient id={`gloss-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".12" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id={`metal-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#5d5d63" />
          <stop offset=".3" stopColor="#c9c9d0" />
          <stop offset=".6" stopColor="#8e8e95" />
          <stop offset="1" stopColor="#56565c" />
        </linearGradient>
        <linearGradient id={`gold-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#b8913b" />
          <stop offset=".35" stopColor="#f3dc8e" />
          <stop offset=".7" stopColor="#d4b05a" />
          <stop offset="1" stopColor="#a8822f" />
        </linearGradient>
        <linearGradient id={`rubber-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#e9bcae" />
          <stop offset=".35" stopColor="#f4d3c8" />
          <stop offset=".75" stopColor="#e7b8aa" />
          <stop offset="1" stopColor="#c99a8d" />
        </linearGradient>
      </defs>
      <rect x="4" y="40" width="20" height="50" fill={u('barrel')} />
      {art[pen]}
    </svg>
  )
}
