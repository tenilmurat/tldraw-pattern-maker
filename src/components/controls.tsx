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

/** Phosphor icons (regular), the same set as the Figma design. */
const icon = (d: string) => (
  <svg viewBox="0 0 256 256" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)

export const Icons = {
  shapes: icon('M71.59,61.47a8,8,0,0,0-15.18,0l-40,120A8,8,0,0,0,24,192h80a8,8,0,0,0,7.59-10.53ZM35.1,176,64,89.3,92.9,176ZM208,76a52,52,0,1,0-52,52A52.06,52.06,0,0,0,208,76Zm-88,0a36,36,0,1,1,36,36A36,36,0,0,1,120,76Zm104,68H136a8,8,0,0,0-8,8v56a8,8,0,0,0,8,8h88a8,8,0,0,0,8-8V152A8,8,0,0,0,224,144Zm-8,56H144V160h72Z'),
  draw: icon('M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z'),
  photo: icon('M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z'),
  paper: icon('M184,112a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h64A8,8,0,0,1,184,112Zm-8,24H112a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm48-88V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H72V48H48Zm160,0V48H88V208H208Z'),
  dice: icon('M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16ZM104,92A12,12,0,1,1,92,80,12,12,0,0,1,104,92Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,92Zm-72,72a12,12,0,1,1-12-12A12,12,0,0,1,104,164Zm36-36a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm36,36a12,12,0,1,1-12-12A12,12,0,0,1,176,164Z'),
  shuffle: icon('M237.66,178.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L212.69,192H200.94a72.12,72.12,0,0,1-58.59-30.15l-41.72-58.4A56.1,56.1,0,0,0,55.06,80H32a8,8,0,0,1,0-16H55.06a72.12,72.12,0,0,1,58.59,30.15l41.72,58.4A56.1,56.1,0,0,0,200.94,176h11.75l-10.35-10.34a8,8,0,0,1,11.32-11.32ZM143,107a8,8,0,0,0,11.16-1.86l1.2-1.67A56.1,56.1,0,0,1,200.94,80h11.75L202.34,90.34a8,8,0,0,0,11.32,11.32l24-24a8,8,0,0,0,0-11.32l-24-24a8,8,0,0,0-11.32,11.32L212.69,64H200.94a72.12,72.12,0,0,0-58.59,30.15l-1.2,1.67A8,8,0,0,0,143,107Zm-30,42a8,8,0,0,0-11.16,1.86l-1.2,1.67A56.1,56.1,0,0,1,55.06,176H32a8,8,0,0,0,0,16H55.06a72.12,72.12,0,0,0,58.59-30.15l1.2-1.67A8,8,0,0,0,113,149Z'),
  download: icon('M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z'),
  undo: icon('M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z'),
  redo: icon('M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z'),
  trash: icon('M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z'),
  upload: icon('M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0ZM93.66,77.66,120,51.31V144a8,8,0,0,0,16,0V51.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,77.66Z'),
  expand: icon('M216,48V96a8,8,0,0,1-16,0V67.31l-42.34,42.35a8,8,0,0,1-11.32-11.32L188.69,56H160a8,8,0,0,1,0-16h48A8,8,0,0,1,216,48ZM98.34,146.34,56,188.69V160a8,8,0,0,0-16,0v48a8,8,0,0,0,8,8H96a8,8,0,0,0,0-16H67.31l42.35-42.34a8,8,0,0,0-11.32-11.32ZM208,152a8,8,0,0,0-8,8v28.69l-42.34-42.35a8,8,0,0,0-11.32,11.32L188.69,200H160a8,8,0,0,0,0,16h48a8,8,0,0,0,8-8V160A8,8,0,0,0,208,152ZM67.31,56H96a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8V96a8,8,0,0,0,16,0V67.31l42.34,42.35a8,8,0,0,0,11.32-11.32Z'),
  back: icon('M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z'),
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
