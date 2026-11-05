import { useEffect, useRef, useState } from 'react'
import raw from '../assets/logo.svg?raw'
import { BLOOM_AT, parseLogo, SETTLED, STAGE, waitingFrame, welcomeFrame } from './motion'
import { createWelcomeAudio, type WelcomeAudio } from './playSound'

const PATHS = parseLogo(raw)
/** How long the settled logo stays before the page shows through. */
const HOLD = 0.45

type Phase = 'check' | 'ask' | 'play' | 'leaving' | 'gone'

/** Play the motion into `svg` from `start` (a performance.now() time); calls `done` once the logo has settled. Returns stop. */
function play(svg: SVGSVGElement | null, start: number, dotReady: boolean, done: () => void): () => void {
  let raf = 0
  const step = (now: number) => {
    const t = (now - start) / 1000
    if (svg) svg.innerHTML = welcomeFrame(t, PATHS, { dotReady })
    if (t < SETTLED + HOLD) raf = requestAnimationFrame(step)
    else done()
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The opening screen: the logo's welcome motion with its sound, then it
 * fades away to the app.
 *
 * Browsers only allow sound after a visitor has clicked or pressed a key on
 * the page. When sound is already allowed, the welcome simply plays. When
 * it isn't, it waits on the black dot, pulsing softly, with a shimmering
 * "Click anywhere to start" below; that click lets the sound play, and the
 * motion carries on from the dot, still in step. Once playing, a click or
 * any key skips it; with reduced motion it doesn't play at all.
 */
export function Welcome({ onLeave }: { onLeave?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (reducedMotion() ? 'gone' : 'check'))
  const svgRef = useRef<SVGSVGElement>(null)
  const audioRef = useRef<WelcomeAudio | null>(null)
  // One start time for the motion and the sound, so the sound's peak lands on the mark's arrival.
  const startRef = useRef(0)
  const dotReadyRef = useRef(false)

  // Start `t` seconds into the motion, with the sound in step.
  const begin = (t: number, dotReady: boolean) => {
    startRef.current = performance.now() - t * 1000
    dotReadyRef.current = dotReady
    audioRef.current?.play(startRef.current)
    setPhase('play')
  }
  const beginRef = useRef(begin)
  useEffect(() => {
    beginRef.current = begin
  })

  // On opening: get the sound ready, and find out whether the browser allows it yet.
  useEffect(() => {
    if (reducedMotion()) return
    const audio = createWelcomeAudio()
    audioRef.current = audio
    const life = { alive: true }
    if (!audio) beginRef.current(0, false)
    else
      void audio.allowed().then((ok) => {
        if (!life.alive) return
        if (ok) beginRef.current(0, false)
        else setPhase('ask')
      })
    return () => {
      life.alive = false
      audio?.fadeOut()
    }
  }, [])

  // Waiting for a click: the dot, pulsing. A key works too.
  useEffect(() => {
    if (phase !== 'ask') return
    if (svgRef.current) svgRef.current.innerHTML = waitingFrame(PATHS)
    const onKey = () => {
      audioRef.current?.unlock()
      beginRef.current(BLOOM_AT, true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  useEffect(() => {
    if (phase !== 'play') return
    const skip = () => setPhase('leaving')
    const stop = play(svgRef.current, startRef.current, dotReadyRef.current, skip)
    window.addEventListener('keydown', skip)
    // If frames stall (a hidden tab), the app still appears.
    const safety = window.setTimeout(skip, (SETTLED + HOLD + 2) * 1000)
    return () => {
      stop()
      window.removeEventListener('keydown', skip)
      clearTimeout(safety)
    }
  }, [phase])

  // Leaving: show the settled logo while the whole screen fades.
  useEffect(() => {
    if (phase !== 'leaving') return
    // The page arrives as the welcome fades.
    onLeave?.()
    audioRef.current?.fadeOut()
    if (svgRef.current) svgRef.current.innerHTML = welcomeFrame(SETTLED, PATHS)
    const id = window.setTimeout(() => setPhase('gone'), 600)
    return () => clearTimeout(id)
  }, [phase, onLeave])

  if (phase === 'gone') return null
  const { x, y, w, h } = STAGE
  const onPointerDown = () => {
    if (phase === 'ask') {
      // This click is what lets the sound play.
      audioRef.current?.unlock()
      begin(BLOOM_AT, true)
    } else if (phase === 'check') begin(0, false)
    else setPhase('leaving')
  }
  return (
    <div className={`welcome ${phase === 'leaving' ? 'is-leaving' : ''}`} onPointerDown={onPointerDown}>
      <svg ref={svgRef} className="welcome-stage" viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
      {phase === 'ask' && (
        <>
          <p className="welcome-ask">Click anywhere to start</p>
          <p className="welcome-by">by Murat</p>
        </>
      )}
    </div>
  )
}
