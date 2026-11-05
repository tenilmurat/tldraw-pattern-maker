import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TOUR_STEPS as STEPS, type TourStep as Step } from './tourSteps'

/** Set once the tour has been seen (finished or skipped), so it shows on the first visit only. */
const SEEN_KEY = 'pattern-maker:tour-seen'

const hasSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage blocked: the tour may show again next time, which is harmless.
  }
}

/** Space around the highlighted part, and between it and the card. */
const PAD = 6
const GAP = 14
const EDGE = 12

/** Where the card goes: below the part if it fits, else to its left, above, then right; else the middle. */
function placeCard(r: DOMRect, w: number, h: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), vw - w - EDGE)
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), vh - h - EDGE)
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const top = r.top - PAD
  const bottom = r.bottom + PAD
  const left = r.left - PAD
  const right = r.right + PAD
  if (bottom + GAP + h <= vh - EDGE) return { x: clampX(cx - w / 2), y: bottom + GAP }
  if (left - GAP - w >= EDGE) return { x: left - GAP - w, y: clampY(cy - h / 2) }
  if (top - GAP - h >= EDGE) return { x: clampX(cx - w / 2), y: top - GAP - h }
  if (right + GAP + w <= vw - EDGE) return { x: right + GAP, y: clampY(cy - h / 2) }
  return { x: clampX((vw - w) / 2), y: clampY((vh - h) / 2) }
}

/**
 * A short walk through the page on the first visit: the modes, the panel,
 * "Edit your tile" and Download, one at a time. The rest of the page is
 * dimmed with a spotlight on the part being explained, and the card sits
 * beside it. Skip, Escape or the last step ends it for good.
 */
export function Tour({ ready }: { ready: boolean }) {
  const [seen, setSeen] = useState(hasSeen)
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  // Once the page has arrived, keep the steps whose parts are on the page.
  useEffect(() => {
    if (!ready || seen || steps) return
    // A moment later, so the page has laid itself out.
    const id = window.setTimeout(() => {
      const found = STEPS.filter((s) => document.querySelector(s.target))
      if (found.length) setSteps(found)
      else setSeen(true)
    }, 50)
    return () => clearTimeout(id)
  }, [ready, seen, steps])

  const step = steps?.[index]

  // Follow the highlighted part as the window changes size.
  useLayoutEffect(() => {
    if (!step) return
    const el = document.querySelector(step.target)
    if (!el) return
    const measure = () => setRect(el.getBoundingClientRect())
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [step])

  // Put the card beside the part, now that both sizes are known.
  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card || !rect) return
    const { x, y } = placeCard(rect, card.offsetWidth, card.offsetHeight)
    card.style.left = `${x}px`
    card.style.top = `${y}px`
  }, [rect, index])

  useEffect(() => {
    if (step) nextRef.current?.focus()
  }, [step])

  const end = () => {
    markSeen()
    setSeen(true)
  }
  const endRef = useRef(end)
  useEffect(() => {
    endRef.current = end
  })

  const last = steps ? index === steps.length - 1 : false
  const next = () => (last ? end() : setIndex((i) => i + 1))
  const back = () => setIndex((i) => Math.max(0, i - 1))

  useEffect(() => {
    if (!step) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  if (seen || !steps || !step || !rect) return null

  // The highlight follows the part's own rounding: round for the pill button, soft corners otherwise.
  const round = step.target === '.show-frame' ? 999 : 12 + PAD

  return (
    <div className="tour">
      <div
        className="tour-hole"
        style={{
          left: rect.left - PAD,
          top: rect.top - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: round,
        }}
      />
      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
      >
        <p className="tour-count">
          {index + 1} of {steps.length}
        </p>
        <h2 id="tour-title" className="tour-title">
          {step.title}
        </h2>
        <p id="tour-body" className="tour-body">
          {step.body}
        </p>
        <div className="tour-foot">
          {last ? (
            <span />
          ) : (
            <button type="button" className="tour-skip" onClick={end}>
              Skip
            </button>
          )}
          <div className="tour-nav">
            {index > 0 && (
              <button type="button" className="button" onClick={back}>
                Back
              </button>
            )}
            <button ref={nextRef} type="button" className="button primary" onClick={next}>
              {last ? 'Start making' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
