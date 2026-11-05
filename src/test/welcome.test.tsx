/**
 * The opening screen: it always waits on "Click anywhere to start", in every
 * browser, and the click is what starts the logo motion (and lets its sound play).
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { Welcome } from '../logo/Welcome'

// Tells React these renders happen inside tests, so `act` waits for them.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('Welcome screen', () => {
  test('always opens on "Click anywhere to start", with "by Murat" below', () => {
    act(() => root.render(<Welcome />))
    expect(host.querySelector('.welcome-ask')?.textContent).toBe('Click anywhere to start')
    expect(host.querySelector('.welcome-by')?.textContent).toBe('by Murat')
  })

  test('waits on the logo dot until someone clicks', () => {
    act(() => root.render(<Welcome />))
    expect(host.querySelector('.welcome-breathe')).not.toBeNull()
  })

  test('a click starts the logo motion and hides the prompt', () => {
    act(() => root.render(<Welcome />))
    act(() => host.querySelector('.welcome')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
    expect(host.querySelector('.welcome-ask')).toBeNull()
    expect(host.querySelector('.welcome-by')).toBeNull()
    expect(host.querySelector('.welcome')).not.toBeNull()
  })

  test('a key press starts it too', () => {
    act(() => root.render(<Welcome />))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })))
    expect(host.querySelector('.welcome-ask')).toBeNull()
  })
})
