/**
 * The header logo's hover, in the page: "designed by Murat" while the mouse
 * is over it, the plain logo once it leaves, whatever the mouse does and even
 * if frames stop coming. Time is faked, so each step is exact.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { LogoMark } from '../logo/LogoMark'
import { SWAP_LENGTH } from '../logo/motion'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root
const FULL = SWAP_LENGTH * 1000

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<LogoMark />))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const logo = () => host.querySelector('svg')!
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const enter = () => act(() => logo().dispatchEvent(new PointerEvent('pointerover', { bubbles: true, relatedTarget: document.body })))
const leave = () => act(() => logo().dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body })))

/** What the logo shows: the plain logo, the credit, or something in between. */
const shows = () => {
  const html = logo().innerHTML
  const credit = html.includes('designed by Murat')
  const words = html.includes('logo-tldraw') && html.includes('logo-pattern')
  const whole = !/width="(?!(?:177\.5|184\.5|352)")[\d.]+"/.test(html)
  if (words && !credit && whole) return 'logo'
  if (credit && !words && whole) return 'credit'
  return 'moving'
}

describe('Header logo hover', () => {
  test('starts as the plain logo, named for screen readers', () => {
    expect(shows()).toBe('logo')
    expect(logo().getAttribute('aria-label')).toBe('tldraw pattern, designed by Murat')
  })

  test('hovering shows "designed by Murat", leaving brings the logo back', () => {
    enter()
    wait(FULL + 50)
    expect(shows()).toBe('credit')
    leave()
    wait(FULL + 50)
    expect(shows()).toBe('logo')
  })

  test('leaving midway turns straight back, without finishing first', () => {
    enter()
    wait(FULL * 0.6)
    expect(shows()).toBe('moving')
    leave()
    // It only has to undo the 60% it did, so it's home well before a full swap.
    wait(FULL * 0.6 + 50)
    expect(shows()).toBe('logo')
  })

  test('quick in and out, again and again, still ends on the plain logo', () => {
    for (let k = 0; k < 5; k++) {
      enter()
      wait(40)
      leave()
      wait(30)
    }
    wait(FULL + 50)
    expect(shows()).toBe('logo')
  })

  test('if the "leave" event is lost, moving the mouse anywhere else still brings the logo back', () => {
    enter()
    wait(FULL + 50)
    expect(shows()).toBe('credit')
    // No pointerout reaches the logo (say it was lost on a part redrawn mid-hover);
    // the next movement elsewhere on the page is enough.
    act(() => document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles: true })))
    wait(FULL + 50)
    expect(shows()).toBe('logo')
  })

  test('moving the mouse over the logo itself keeps the credit', () => {
    enter()
    wait(FULL + 50)
    act(() => logo().dispatchEvent(new PointerEvent('pointermove', { bubbles: true })))
    wait(FULL + 50)
    expect(shows()).toBe('credit')
  })

  test('if frames stop coming midway, it still lands where the mouse is', () => {
    // Hand out frames by hand, so they can stop the way they do in a hidden tab.
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    enter()
    wait(300)
    act(() => frames.splice(0).forEach((cb) => cb(performance.now())))
    expect(shows()).toBe('moving')
    leave()
    // No more frames, only time: the safety net lands it on the plain logo.
    wait(FULL + 400)
    expect(shows()).toBe('logo')
    // A late frame, once the tab is back, doesn't undo that.
    act(() => frames.splice(0).forEach((cb) => cb(performance.now())))
    expect(shows()).toBe('logo')
  })
})
