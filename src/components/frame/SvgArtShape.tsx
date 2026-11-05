import { useMemo } from 'react'
import {
  BaseBoxShapeUtil,
  createShapeId,
  DefaultColorStyle,
  getColorValue,
  HTMLContainer,
  T,
  useValue,
  type Editor,
  type TLDefaultColorStyle,
  type TLShape,
  type VecLike,
} from 'tldraw'
import { svgSize, svgUrl } from '../../engine/svgArt'

export const SVG_ART = 'svg-art'

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [SVG_ART]: {
      w: number
      h: number
      /** The SVG exactly as it was pasted. */
      svg: string
      color: TLDefaultColorStyle
      /** False until you pick a colour for it: until then it keeps its own colours. */
      tinted: boolean
    }
  }
}

export type SvgArtShape = TLShape<typeof SVG_ART>

/**
 * A pasted or dropped SVG that stays an SVG: sharp at any size, movable and
 * resizable like any shape, and recoloured by the colour row like a pen line.
 */
export class SvgArtShapeUtil extends BaseBoxShapeUtil<SvgArtShape> {
  static override type = SVG_ART
  static override props = {
    w: T.number,
    h: T.number,
    svg: T.string,
    color: DefaultColorStyle,
    tinted: T.boolean,
  }

  getDefaultProps(): SvgArtShape['props'] {
    return { w: 100, h: 100, svg: '<svg xmlns="http://www.w3.org/2000/svg"/>', color: 'black', tinted: false }
  }

  override canEdit() {
    return false
  }

  // Picking a colour for it is what switches it from its own colours to yours.
  override onBeforeUpdate(prev: SvgArtShape, next: SvgArtShape) {
    if (prev.props.color !== next.props.color && !next.props.tinted) {
      return { ...next, props: { ...next.props, tinted: true } }
    }
  }

  private colourOf(shape: SvgArtShape) {
    if (!shape.props.tinted) return null
    const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]
    return getColorValue(colors, shape.props.color, 'solid')
  }

  component(shape: SvgArtShape) {
    return <SvgArt shape={shape} util={this} />
  }

  override toSvg(shape: SvgArtShape) {
    return (
      <image
        href={svgUrl(shape.props.svg, this.colourOf(shape))}
        width={shape.props.w}
        height={shape.props.h}
        preserveAspectRatio="none"
      />
    )
  }

  getIndicatorPath(shape: SvgArtShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function SvgArt({ shape, util }: { shape: SvgArtShape; util: SvgArtShapeUtil }) {
  const { editor } = util
  const colour = useValue(
    'svg colour',
    () =>
      shape.props.tinted
        ? getColorValue(editor.getCurrentTheme().colors[editor.getColorMode()], shape.props.color, 'solid')
        : null,
    [editor, shape.props.tinted, shape.props.color],
  )
  const src = useMemo(() => svgUrl(shape.props.svg, colour), [shape.props.svg, colour])
  return (
    <HTMLContainer>
      <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
    </HTMLContainer>
  )
}

/** Put an SVG on the canvas, centred on `point` (or the middle of the frame), at a size that fits. */
export function placeSvg(editor: Editor, svg: string, point?: VecLike, nudge = 0) {
  const own = svgSize(svg)
  // Between a fifth and two fifths of the tile, keeping its shape: big files shrink, tiny icons grow.
  const longest = Math.max(own.w, own.h)
  const fit = Math.min(240, Math.max(120, longest)) / longest
  const w = Math.max(8, own.w * fit)
  const h = Math.max(8, own.h * fit)
  const at = point ?? editor.getViewportPageBounds().center
  const id = createShapeId()
  editor.markHistoryStoppingPoint('add svg')
  editor.createShape<SvgArtShape>({
    id,
    type: SVG_ART,
    x: at.x - w / 2 + nudge,
    y: at.y - h / 2 + nudge,
    props: { w, h, svg, color: editor.getStyleForNextShape(DefaultColorStyle), tinted: false },
  })
  return id
}
