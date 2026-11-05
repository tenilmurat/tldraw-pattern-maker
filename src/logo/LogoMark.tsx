import { useRef } from 'react'
import raw from '../assets/logo.svg?raw'
import { LOGO, parseLogo, REPLAY_LENGTH, replayFrame } from './motion'

const PATHS = parseLogo(raw)
const STILL = replayFrame(REPLAY_LENGTH, PATHS)

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Play the replay into `svg`, frame by frame, then leave the still logo. */
function replay(svg: SVGSVGElement, done: () => void) {
  const start = performance.now()
  const step = (now: number) => {
    const t = (now - start) / 1000
    svg.innerHTML = replayFrame(Math.min(t, REPLAY_LENGTH), PATHS)
    if (t < REPLAY_LENGTH) requestAnimationFrame(step)
    else done()
  }
  requestAnimationFrame(step)
}

/**
 * The header logo. Hover it and the words play again: the mark stays put
 * while "tldraw" and "pattern" fade out and wipe back in, as they do in the
 * welcome. It plays once per hover and never interrupts itself.
 */
export function LogoMark({ height = 24 }: { height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const playing = useRef(false)

  const onEnter = () => {
    const svg = ref.current
    if (!svg || playing.current || reducedMotion()) return
    playing.current = true
    replay(svg, () => {
      playing.current = false
    })
  }

  return (
    <svg
      ref={ref}
      className="logo-mark"
      viewBox={`0 0 ${LOGO.w} ${LOGO.h}`}
      height={height}
      width={(height * LOGO.w) / LOGO.h}
      role="img"
      aria-label="tldraw pattern"
      onPointerEnter={onEnter}
      dangerouslySetInnerHTML={{ __html: STILL }}
    />
  )
}
