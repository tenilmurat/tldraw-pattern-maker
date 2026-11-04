import { harmoniousPalette, PALETTES, type Palette } from '../engine/color'
import { starterStrokes } from '../engine/draw'
import { MOTIFS } from '../engine/motifs'
import { DEFAULT_HIGHLIGHT, PEN, PENS, type PenId } from '../engine/pens'
import { PAPERS } from '../engine/paper'
import { between, createRand, newSeed, pick, shuffled } from '../engine/random'
import { LAYOUTS } from '../engine/shapes'
import { DRAW_SYMMETRIES, PHOTO_SYMMETRIES, type SymmetryId } from '../engine/symmetry'
import type {
  Mode,
  PaperKind,
  PatternState,
  Arrangement,
  DrawSurface,
  PhotoSelection,
  ShapeLayout,
  Stamp,
  Stroke,
} from './types'

export const initialState: PatternState = {
  mode: 'shapes',
  size: 0.32,
  palette: PALETTES[0],
  seed: 7,
  shapes: {
    active: ['leaf', 'dot', 'arch'],
    layout: 'bricks',
    space: 0.45,
    custom: null,
    selected: null,
    pick: 'leaf',
  },
  draw: {
    surface: 'frame',
    rotation: 0,
    symmetry: 'kaleido',
    strokes: starterStrokes(),
    past: [],
    future: [],
    pen: 'pen',
    sizes: Object.fromEntries(PENS.map((p) => [p.id, p.size])) as Record<PenId, number>,
    opacities: Object.fromEntries(PENS.map((p) => [p.id, p.opacity])) as Record<PenId, number>,
    ink: '#151515',
    highlight: DEFAULT_HIGHLIGHT,
  },
  photo: {
    symmetry: 'kaleido',
    selection: { cx: 0.42, cy: 0.46, size: 0.3, angle: 0 },
    src: null,
    name: 'Sample',
  },
  paper: { kind: 'dots', spacingMm: 5, weight: 0.35 },
}

export type Action =
  | { type: 'mode'; mode: Mode }
  | { type: 'size'; value: number }
  | { type: 'palette'; palette: Palette }
  | { type: 'shufflePalette' }
  | { type: 'surprise' }
  | { type: 'toggleShape'; id: string }
  | { type: 'moveShape'; from: number; to: number }
  | { type: 'layout'; layout: ShapeLayout }
  | { type: 'space'; value: number }
  | { type: 'drawSymmetry'; symmetry: SymmetryId }
  | { type: 'addStroke'; stroke: Stroke }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'arrange'; custom: Arrangement; size: number }
  | { type: 'addStamp'; stamp: Stamp }
  | { type: 'updateStamp'; id: number; patch: Partial<Stamp> }
  | { type: 'removeStamp'; id: number }
  | { type: 'selectStamp'; id: number | null }
  | { type: 'pickShape'; id: string }
  | { type: 'surface'; surface: DrawSurface }
  | { type: 'drawRotation'; deg: number }
  | { type: 'pen'; pen: PenId }
  | { type: 'penSize'; value: number }
  | { type: 'penOpacity'; value: number }
  | { type: 'inkColour'; colour: string }
  | { type: 'photoSymmetry'; symmetry: SymmetryId }
  | { type: 'selection'; selection: Partial<PhotoSelection> }
  | { type: 'photoSrc'; src: string | null; name: string }
  | { type: 'paperKind'; kind: PaperKind }
  | { type: 'spacing'; mm: number }
  | { type: 'weight'; value: number }
  | { type: 'restore'; state: PatternState }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Replace the drawing and keep the old one for undo. */
function commit(state: PatternState, strokes: Stroke[]): PatternState {
  return {
    ...state,
    draw: { ...state.draw, strokes, past: [...state.draw.past, state.draw.strokes].slice(-100), future: [] },
  }
}

/** "Surprise me": changes several things at once, always inside ranges that look good. */
function surprise(state: PatternState): PatternState {
  const seed = newSeed()
  const rand = createRand(seed)
  const palette = rand() < 0.35 ? pick(rand, PALETTES) : harmoniousPalette(rand)
  switch (state.mode) {
    case 'shapes': {
      const count = pick(rand, [1, 1, 2, 2, 3, 4])
      return {
        ...state,
        seed,
        palette,
        size: between(rand, 0.15, 0.6),
        shapes: {
          ...state.shapes,
          active: shuffled(rand, MOTIFS.map((m) => m.id)).slice(0, count),
          layout: pick(rand, LAYOUTS).id,
          space: between(rand, 0.15, 0.75),
          selected: null,
        },
      }
    }
    case 'draw':
      return {
        ...state,
        seed,
        palette,
        draw: { ...state.draw, symmetry: pick(rand, DRAW_SYMMETRIES.slice(1)) },
      }
    case 'photo':
      return {
        ...state,
        seed,
        photo: {
          ...state.photo,
          symmetry: pick(rand, PHOTO_SYMMETRIES),
          selection: {
            cx: between(rand, 0.2, 0.8),
            cy: between(rand, 0.2, 0.8),
            size: between(rand, 0.15, 0.45),
            angle: Math.round(between(rand, -180, 180)),
          },
        },
      }
    case 'paper': {
      const paper = pick(rand, PAPERS)
      return {
        ...state,
        seed,
        palette,
        paper: { ...state.paper, kind: paper.id, spacingMm: paper.defaultMm },
      }
    }
  }
}

export function reducer(state: PatternState, action: Action): PatternState {
  switch (action.type) {
    case 'mode':
      return { ...state, mode: action.mode }
    case 'size':
      return { ...state, size: action.value }
    case 'palette':
      return { ...state, palette: action.palette }
    case 'shufflePalette': {
      const seed = newSeed()
      return { ...state, seed, palette: harmoniousPalette(createRand(seed)) }
    }
    case 'surprise':
      return surprise(state)

    case 'toggleShape': {
      const { active } = state.shapes
      const on = active.includes(action.id)
      // Never let the pattern go empty: the last shape can't be switched off.
      if (on && active.length === 1) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          active: on ? active.filter((id) => id !== action.id) : [...active, action.id],
        },
      }
    }
    case 'moveShape': {
      const active = [...state.shapes.active]
      const [moved] = active.splice(action.from, 1)
      active.splice(action.to, 0, moved)
      return { ...state, shapes: { ...state.shapes, active } }
    }
    case 'layout':
      return { ...state, shapes: { ...state.shapes, layout: action.layout, selected: null } }
    case 'arrange':
      return {
        ...state,
        size: action.size,
        shapes: { ...state.shapes, layout: 'custom', custom: action.custom },
      }
    case 'addStamp': {
      const custom = state.shapes.custom ?? { aspect: 1, stamps: [] }
      return {
        ...state,
        shapes: {
          ...state.shapes,
          layout: 'custom',
          custom: { ...custom, stamps: [...custom.stamps, action.stamp] },
          selected: action.stamp.id,
        },
      }
    }
    case 'updateStamp': {
      const custom = state.shapes.custom
      if (!custom) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          custom: {
            ...custom,
            stamps: custom.stamps.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
          },
        },
      }
    }
    case 'removeStamp': {
      const custom = state.shapes.custom
      if (!custom) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          custom: { ...custom, stamps: custom.stamps.filter((s) => s.id !== action.id) },
          selected: null,
        },
      }
    }
    case 'selectStamp':
      return { ...state, shapes: { ...state.shapes, selected: action.id } }
    case 'pickShape':
      // Choosing what to add next lets go of the selected shape, so the next tap adds.
      return { ...state, shapes: { ...state.shapes, pick: action.id, selected: null } }
    case 'drawRotation': {
      // Kept within -180..180 so the readout never says 540°; a half turn reads 180°, not -180°.
      const deg = ((((action.deg + 180) % 360) + 360) % 360) - 180
      return { ...state, draw: { ...state.draw, rotation: deg === -180 ? 180 : deg } }
    }
    case 'surface':
      return { ...state, draw: { ...state.draw, surface: action.surface } }
    case 'space':
      return { ...state, shapes: { ...state.shapes, space: action.value } }

    case 'drawSymmetry':
      return { ...state, draw: { ...state.draw, symmetry: action.symmetry } }
    case 'addStroke':
      return commit(state, [...state.draw.strokes, action.stroke])
    case 'undo': {
      const { past, future, strokes } = state.draw
      if (!past.length) return state
      return {
        ...state,
        draw: { ...state.draw, strokes: past[past.length - 1], past: past.slice(0, -1), future: [...future, strokes] },
      }
    }
    case 'redo': {
      const { past, future, strokes } = state.draw
      if (!future.length) return state
      return {
        ...state,
        draw: { ...state.draw, strokes: future[future.length - 1], future: future.slice(0, -1), past: [...past, strokes] },
      }
    }
    case 'clear':
      return state.draw.strokes.length ? commit(state, []) : state
    case 'pen':
      return { ...state, draw: { ...state.draw, pen: action.pen } }
    case 'penSize': {
      const { pen, sizes } = state.draw
      return { ...state, draw: { ...state.draw, sizes: { ...sizes, [pen]: clamp(action.value, 1, 60) } } }
    }
    case 'penOpacity': {
      const { pen, opacities } = state.draw
      return { ...state, draw: { ...state.draw, opacities: { ...opacities, [pen]: clamp(action.value, 0.1, 1) } } }
    }
    case 'inkColour':
      // A colour choice reaches every pen. The highlighter keeps its own colour
      // unless it's the pen in your hand, so a yellow highlighter survives a black pen.
      return {
        ...state,
        draw: {
          ...state.draw,
          ink: action.colour,
          highlight: PEN[state.draw.pen].ownInk ? action.colour : state.draw.highlight,
        },
      }

    case 'photoSymmetry':
      return { ...state, photo: { ...state.photo, symmetry: action.symmetry } }
    case 'selection': {
      const s = { ...state.photo.selection, ...action.selection }
      return {
        ...state,
        photo: {
          ...state.photo,
          selection: {
            cx: clamp(s.cx, 0, 1),
            cy: clamp(s.cy, 0, 1),
            size: clamp(s.size, 0.04, 1),
            angle: s.angle,
          },
        },
      }
    }
    case 'photoSrc':
      return {
        ...state,
        photo: { ...state.photo, src: action.src, name: action.name, selection: initialState.photo.selection },
      }

    case 'paperKind': {
      const info = PAPERS.find((p) => p.id === action.kind)
      return {
        ...state,
        paper: { ...state.paper, kind: action.kind, spacingMm: info?.defaultMm ?? state.paper.spacingMm },
      }
    }
    case 'spacing':
      return { ...state, paper: { ...state.paper, spacingMm: action.mm } }
    case 'weight':
      return { ...state, paper: { ...state.paper, weight: action.value } }

    case 'restore':
      return action.state
  }
}
