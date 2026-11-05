import { useMemo, type Dispatch } from 'react'
import { createPaperRenderer, PAPERS, spacingName } from '../engine/paper'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { OptionCard, Section, Slider } from './controls'
import { MiniPattern } from './MiniPattern'

export function PaperPanel({ state, dispatch }: { state: PatternState; dispatch: Dispatch<Action> }) {
  const { kind, spacingMm, weight } = state.paper
  const palette = state.modePalettes.paper

  const options = useMemo(
    () =>
      PAPERS.map((p) => ({
        ...p,
        renderer: createPaperRenderer({ kind: p.id, spacingMm: p.defaultMm, weight: 0.5, palette }),
      })),
    [palette],
  )

  const named = spacingName(kind, spacingMm)

  return (
    <>
      <Section title="Paper">
        <div className="option-grid">
          {options.map((o) => (
            <OptionCard
              key={o.id}
              label={o.name}
              hint={o.hint}
              selected={kind === o.id}
              onSelect={() => dispatch({ type: 'paperKind', kind: o.id })}
            >
              <MiniPattern renderer={o.renderer} zoom={0.75} />
            </OptionCard>
          ))}
        </div>
      </Section>

      <Section title="Look">
        <Slider
          label="Spacing"
          low="Tighter"
          high="Roomier"
          min={2}
          max={15}
          step={0.1}
          value={spacingMm}
          readout={`${spacingMm.toFixed(1)} mm${named ? ` · ${named}` : ''}`}
          onChange={(mm) => dispatch({ type: 'spacing', mm })}
        />
        <Slider
          label="Lines"
          low="Fine"
          high="Bold"
          value={weight}
          onChange={(value) => dispatch({ type: 'weight', value })}
        />
        <p className="note">Sizes are true to life when you download the A4 print.</p>
      </Section>
    </>
  )
}
