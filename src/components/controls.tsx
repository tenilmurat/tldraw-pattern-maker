import { useId, type ReactNode } from 'react'

export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="section">
      <header className="section-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

/**
 * A slider labelled with words at both ends ("smaller ↔ bigger") instead of
 * numbers, because the numbers mean nothing to the people this is for.
 */
export function Slider({
  label,
  low,
  high,
  value,
  min = 0,
  max = 1,
  step = 0.001,
  readout,
  onChange,
}: {
  label: string
  low: string
  high: string
  value: number
  min?: number
  max?: number
  step?: number
  readout?: string
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div className="slider">
      <div className="slider-top">
        <label htmlFor={id}>{label}</label>
        {readout && <output htmlFor={id}>{readout}</output>}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="slider-ends" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}

/** A picture-first choice: what it looks like, then its name. */
export function OptionCard({
  selected,
  label,
  hint,
  onSelect,
  children,
}: {
  selected: boolean
  label: string
  hint?: string
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="option-card"
      aria-pressed={selected}
      title={hint}
      onClick={onSelect}
    >
      <span className="option-art">{children}</span>
      <span className="option-label">{label}</span>
    </button>
  )
}

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

export const Icons = {
  shapes: icon(
    <>
      <circle cx="7.5" cy="7.5" r="3.5" />
      <path d="M16.5 4 21 12h-9z" />
      <rect x="4" y="14" width="7" height="7" rx="1" />
      <path d="M17.5 14v7M14 17.5h7" />
    </>,
  ),
  draw: icon(
    <>
      <path d="M4 20c3-1 4.5-3 6-6 1.6-3.2 4-7 7.5-9 1 1.5.8 3.5-.5 5.5-2 3-5.5 5-8 6.5" />
      <path d="M4 20c0-2 .5-3.5 2-4.5" />
    </>,
  ),
  photo: icon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m21 16-5-5-8 8" />
    </>,
  ),
  paper: icon(
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 8h16M4 12h16M4 16h16" />
    </>,
  ),
  dice: icon(
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r=".9" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r=".9" fill="currentColor" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r=".9" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r=".9" fill="currentColor" />
    </>,
  ),
  shuffle: icon(
    <>
      <path d="M3 7h3.5c4 0 6 10 10 10H21" />
      <path d="M3 17h3.5c1.6 0 2.8-1.5 3.8-3.3M13.7 10.3C14.7 8.5 15.9 7 17.5 7H21" />
      <path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5" />
    </>,
  ),
  download: icon(
    <>
      <path d="M12 4v11M7 10.5l5 5 5-5" />
      <path d="M5 20h14" />
    </>,
  ),
  undo: icon(<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />),
  redo: icon(<path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />),
  trash: icon(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />),
  upload: icon(
    <>
      <path d="M12 16V5M7 9.5l5-5 5 5" />
      <path d="M5 20h14" />
    </>,
  ),
  grip: (
    <svg viewBox="0 0 8 14" width="8" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="6" cy="2" r="1.2" />
      <circle cx="2" cy="7" r="1.2" />
      <circle cx="6" cy="7" r="1.2" />
      <circle cx="2" cy="12" r="1.2" />
      <circle cx="6" cy="12" r="1.2" />
    </svg>
  ),
}
