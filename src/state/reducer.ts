import { harmoniousPalette, PALETTES, WHITE, type Palette } from '../engine/color'
import { starterStrokes } from '../engine/draw'
import { MOTIFS } from '../engine/motifs'
import { PENS, type PenId } from '../engine/pens'
import { PAPERS } from '../engine/paper'
import { between, createRand, newId, newSeed, pick, shuffled } from '../engine/random'
import { LAYOUTS, scatterStamps } from '../engine/shapes'
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
  modePalettes: { draw: WHITE, paper: WHITE },
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
    turned: 0,
    symmetry: 'kaleido',
    strokes: starterStrokes(),
    past: [],
    future: [],
    pen: 'pen',
    sizes: Object.fromEntries(PENS.map((p) => [p.id, p.size])) as Record<PenId, number>,
    opacities: Object.fromEntries(PENS.map((p) => [p.id, p.opacity])) as Record<PenId, number>,
    ink: '#151515',
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
  | { type: 'editColour'; slot: 'paper' | number; colour: string }
  | { type: 'scatterShapes' }
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
  | { type: 'surface'; surface: DrawSurface }
  | { type: 'drawRotation'; deg: number }
  | { type: 'drawTurned'; deg: number }
  | { type: 'adoptStrokes' }
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

/** The colours the current mode uses: Draw and Paper have their own, everything else shares Shapes'. */
export const paletteOf = (state: PatternState, mode: Mode = state.mode): Palette =>
  mode === 'draw' || mode === 'paper' ? state.modePalettes[mode] : state.palette

/** Change the colours of the current mode only. */
function withPalette(state: PatternState, palette: Palette): PatternState {
  const mode = state.mode
  if (mode === 'draw' || mode === 'paper') return { ...state, modePalettes: { ...state.modePalettes, [mode]: palette } }
  return { ...state, palette }
}

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
      return withPalette(
        { ...state, seed, draw: { ...state.draw, symmetry: pick(rand, DRAW_SYMMETRIES.slice(1)) } },
        palette,
      )
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
      return withPalette(
        { ...state, seed, paper: { ...state.paper, kind: paper.id, spacingMm: paper.defaultMm } },
        palette,
      )
    }
  }
}

/**
 * "Shuffle shapes": new places and sizes for the shapes, as your own
 * arrangement so you can keep moving them in the frame. Shapes you already
 * placed keep their shape and colour; otherwise the chosen shapes are spread out.
 */
function scatter(state: PatternState): PatternState {
  const rand = createRand(newSeed())
  const { active, layout, custom } = state.shapes
  const inks = state.palette.inks.length
  const own = layout === 'custom' && custom && custom.stamps.length > 0
  const base = own
    ? custom.stamps
    : Array.from({ length: active.length === 1 ? 6 : Math.min(10, Math.max(6, active.length * 2)) }, (_, i) => ({
        id: newId(),
        motif: active[i % active.length],
        rot: 0,
        // One shape cycles through the colours; several shapes each keep their own.
        ink: (active.length > 1 ? i % active.length : i) % inks,
      }))
  return {
    ...state,
    size: own ? state.size : Math.max(state.size, 0.3),
    shapes: {
      ...state.shapes,
      layout: 'custom',
      custom: { aspect: own ? custom.aspect : 1, stamps: scatterStamps(rand, base) },
      selected: null,
    },
  }
}

/**
 * In your own arrangement the shape grid shows what's in the tile. Turning a
 * shape on drops two of it into the roomiest spots (and makes it what a tap in
 * the frame adds); turning it off takes every copy out. The last shape stays.
 */
function toggleInArrangement(state: PatternState, custom: Arrangement, id: string, pick: string): PatternState {
  const used = [...new Set(custom.stamps.map((s) => s.motif))]
  let stamps: Stamp[]
  let nextPick = pick
  if (used.includes(id)) {
    if (used.length === 1) return state
    stamps = custom.stamps.filter((s) => s.motif !== id)
    if (pick === id) nextPick = stamps[0].motif
  } else {
    const ink = used.length % state.palette.inks.length
    const fresh = [0, 1].map(() => ({ id: newId(), motif: id, rot: 0, ink }))
    stamps = [...custom.stamps, ...scatterStamps(createRand(newSeed()), fresh, custom.stamps)]
    nextPick = id
  }
  return {
    ...state,
    shapes: {
      ...state.shapes,
      // Kept in step, so a preset layout picked next uses the same shapes.
      active: [...new Set(stamps.map((s) => s.motif))],
      custom: { ...custom, stamps },
      selected: null,
      pick: nextPick,
    },
  }
}

export function reducer(state: PatternState, action: Action): PatternState {
  switch (action.type) {
    case 'mode':
      return { ...state, mode: action.mode }
    case 'size':
      return { ...state, size: action.value }
    case 'palette':
      return withPalette(state, action.palette)
    case 'shufflePalette': {
      const seed = newSeed()
      return withPalette({ ...state, seed }, harmoniousPalette(createRand(seed)))
    }
    case 'editColour': {
      // Your own edit turns the set into "Yours", so it never pretends to be a named set.
      const { paper, inks } = paletteOf(state)
      return withPalette(state, {
        name: 'Yours',
        paper: action.slot === 'paper' ? action.colour : paper,
        inks: inks.map((c, i) => (i === action.slot ? action.colour : c)),
      })
    }
    case 'surprise':
      return surprise(state)
    case 'scatterShapes':
      return scatter(state)

    case 'toggleShape': {
      const { active, layout, custom, pick } = state.shapes
      if (layout === 'custom' && custom) return toggleInArrangement(state, custom, action.id, pick)
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
    case 'drawRotation': {
      // Kept within -180..180 so the readout never says 540°; a half turn reads 180°, not -180°.
      const deg = ((((action.deg + 180) % 360) + 360) % 360) - 180
      return { ...state, draw: { ...state.draw, rotation: deg === -180 ? 180 : deg } }
    }
    case 'drawTurned':
      return { ...state, draw: { ...state.draw, turned: action.deg } }
    case 'adoptStrokes':
      // The lines now live in the tldraw frame, unturned; the frame turns them to match.
      return { ...state, draw: { ...state.draw, strokes: [], past: [], future: [], turned: 0 } }
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
      // One colour for every pen, the highlighter included.
      return { ...state, draw: { ...state.draw, ink: action.colour } }

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
