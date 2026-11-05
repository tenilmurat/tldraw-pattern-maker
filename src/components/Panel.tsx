import type { Dispatch } from 'react'
import type { PhotoImage } from '../engine/photo'
import type { DrawArt } from '../engine/tldraw'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { ColoursSection } from './ColoursSection'
import { Icons } from './controls'
import { DrawPanel } from './DrawPanel'
import { PaperPanel } from './PaperPanel'
import { PhotoPanel } from './PhotoPanel'
import { ShapesPanel } from './ShapesPanel'

/** The style panel on the right: everything about the current mode. */
export function Panel({
  state,
  dispatch,
  photo,
  art,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  photo: PhotoImage
  art: DrawArt | null
}) {
  return (
    <aside className="floating panel" aria-label="Pattern settings">
      <div className="panel-body">
        {state.mode === 'shapes' && <ShapesPanel state={state} dispatch={dispatch} />}
        {state.mode === 'draw' && <DrawPanel state={state} dispatch={dispatch} art={art} />}
        {state.mode === 'photo' && <PhotoPanel state={state} dispatch={dispatch} image={photo} />}
        {state.mode === 'paper' && <PaperPanel state={state} dispatch={dispatch} />}
        {(state.mode === 'shapes' || state.mode === 'paper') && <ColoursSection state={state} dispatch={dispatch} />}
      </div>
      {/* Always in reach at the foot of the panel, whatever the mode. */}
      <footer className="panel-foot">
        <button type="button" className="button wide" onClick={() => dispatch({ type: 'surprise' })}>
          {Icons.dice}
          Surprise me
        </button>
      </footer>
    </aside>
  )
}
