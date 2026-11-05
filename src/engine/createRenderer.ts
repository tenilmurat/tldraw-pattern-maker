import { createDrawRenderer } from './draw'
import { createPaperRenderer } from './paper'
import { createPhotoRenderer, type PhotoImage } from './photo'
import type { Renderer } from './renderer'
import { createShapeRenderer } from './shapes'
import type { PatternState } from '../state/types'
import type { DrawArt } from './tldraw'

/** One entry point: the current state in, something that can paint the pattern out. */
export function createRenderer(state: PatternState, photo: PhotoImage, art: DrawArt | null = null): Renderer {
  switch (state.mode) {
    case 'shapes':
      return createShapeRenderer({
        ...state.shapes,
        size: state.size,
        palette: state.palette,
        seed: state.seed,
      })
    case 'draw':
      return createDrawRenderer({
        strokes: state.draw.strokes,
        symmetry: state.draw.symmetry,
        size: state.size,
        paper: state.palette.paper,
        rotation: state.draw.rotation,
        art,
        turned: state.draw.turned,
      })
    case 'photo':
      return createPhotoRenderer({
        image: photo,
        selection: state.photo.selection,
        symmetry: state.photo.symmetry,
        size: state.size,
      })
    case 'paper':
      return createPaperRenderer({ ...state.paper, palette: state.palette })
  }
}
