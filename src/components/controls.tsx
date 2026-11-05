import { useId, type ReactElement, type ReactNode } from 'react'
import { ICONOIR, type IconName } from './iconoir'

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
  onReset,
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
  /** Shows a reset icon beside the title that puts the slider back here (e.g. 0°). */
  onReset?: () => void
}) {
  const id = useId()
  return (
    <div className="slider">
      <div className="slider-top">
        <span className="slider-title">
          <label htmlFor={id}>{label}</label>
          {onReset && (
            <button type="button" className="slider-reset" onClick={onReset} title={`Reset ${label.toLowerCase()} to 0°`}>
              {Icons.undo}
              <span className="sr-only">Reset {label.toLowerCase()} to 0°</span>
            </button>
          )}
        </span>
        {readout && <output htmlFor={id}>{readout}</output>}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
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

/** An Iconoir icon, drawn the way Iconoir draws it: outline, 1.5px stroke, in the text colour. */
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      strokeWidth={1.5}
      aria-hidden="true"
      // Iconoir's own markup, kept exactly as published.
      dangerouslySetInnerHTML={{ __html: ICONOIR[name] }}
    />
  )
}

export const Icons = Object.fromEntries(
  (Object.keys(ICONOIR) as IconName[]).map((name) => [name, <Icon key={name} name={name} />]),
) as Record<IconName, ReactElement>
