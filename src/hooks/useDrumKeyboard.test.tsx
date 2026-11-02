import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDrumKeyboard } from './useDrumKeyboard'
import type { PadId } from '../drums'

const padMap = new Map<string, PadId>([
  ['KeyW', 'tom-1'],
  ['KeyJ', 'snare'],
])

interface HarnessProps {
  enabled?: boolean
  onTrigger?: (padId: PadId) => void
}

function Harness({ enabled = true, onTrigger = () => {} }: HarnessProps) {
  const active = useDrumKeyboard(padMap, onTrigger, enabled)
  return (
    <div>
      <button type="button" aria-pressed={active.has('tom-1')}>
        Tom 1 state
      </button>
      <input aria-label="Input field" />
      <textarea aria-label="Notes" />
      <select aria-label="Choice"><option>one</option></select>
      <div contentEditable="true" suppressContentEditableWarning aria-label="Editable notes">
        <span data-testid="editable-child">editable</span>
      </div>
    </div>
  )
}

function drumKey(
  type: 'keyDown' | 'keyUp',
  target: Window | HTMLElement = window,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type === 'keyDown' ? 'keydown' : 'keyup', {
    code: 'KeyW',
    key: 'q',
    bubbles: true,
    cancelable: true,
    ...init,
  })
  act(() => target.dispatchEvent(event))
  return event
}

describe('useDrumKeyboard', () => {
  it('maps the physical KeyboardEvent.code even when the character key differs', () => {
    const onTrigger = vi.fn()
    render(<Harness onTrigger={onTrigger} />)

    const event = drumKey('keyDown')

    expect(onTrigger).toHaveBeenCalledExactlyOnceWith('tom-1')
    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByRole('button', { name: 'Tom 1 state' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('ignores repeat events and does not prevent their default action', () => {
    const onTrigger = vi.fn()
    render(<Harness onTrigger={onTrigger} />)
    drumKey('keyDown')
    const repeated = drumKey('keyDown', window, { repeat: true })

    expect(onTrigger).toHaveBeenCalledTimes(1)
    expect(repeated.defaultPrevented).toBe(false)
  })

  it('ignores form fields and descendants of contenteditable', () => {
    const onTrigger = vi.fn()
    render(<Harness onTrigger={onTrigger} />)
    const targets = [
      screen.getByRole('textbox', { name: 'Input field' }),
      screen.getByRole('textbox', { name: 'Notes' }),
      screen.getByRole('combobox', { name: 'Choice' }),
      screen.getByTestId('editable-child'),
    ]

    for (const target of targets) {
      const event = drumKey('keyDown', target)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('blocks modifier and composition shortcuts', () => {
    const onTrigger = vi.fn()
    render(<Harness onTrigger={onTrigger} />)
    for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }]) {
      expect(drumKey('keyDown', window, init).defaultPrevented).toBe(false)
    }
    fireEvent.compositionStart(window)
    drumKey('keyDown')
    fireEvent.compositionEnd(window)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('does not act when shortcuts are disabled and clears a held pad on change', () => {
    const onTrigger = vi.fn()
    const view = render(<Harness onTrigger={onTrigger} />)
    drumKey('keyDown')
    view.rerender(<Harness enabled={false} onTrigger={onTrigger} />)
    expect(screen.getByRole('button', { name: 'Tom 1 state' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    drumKey('keyDown', window, { code: 'KeyJ' })
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('releases a held pad on keyup, window blur, and when the tab becomes hidden', () => {
    render(<Harness />)
    const button = screen.getByRole('button', { name: 'Tom 1 state' })

    drumKey('keyDown')
    drumKey('keyUp')
    expect(button).toHaveAttribute('aria-pressed', 'false')

    drumKey('keyDown')
    fireEvent.blur(window)
    expect(button).toHaveAttribute('aria-pressed', 'false')

    drumKey('keyDown')
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    fireEvent(document, new Event('visibilitychange', { bubbles: true }))
    expect(button).toHaveAttribute('aria-pressed', 'false')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  it('prevents defaults only for a mapped and enabled shortcut', () => {
    render(<Harness />)
    const unknown = drumKey('keyDown', window, { code: 'KeyQ' })
    const mapped = drumKey('keyDown')
    expect(unknown.defaultPrevented).toBe(false)
    expect(mapped.defaultPrevented).toBe(true)
  })
})
