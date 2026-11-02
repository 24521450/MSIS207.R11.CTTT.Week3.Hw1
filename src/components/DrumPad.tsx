import { useEffect, useRef } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { PadDefinition } from '../drums'

interface DrumPadProps {
  pad: PadDefinition
  active: boolean
  pressed: boolean
  onHit: () => void
  onPointerStart: (padId: PadDefinition['id'], pointerId: number) => boolean
  onPointerEnd: (padId: PadDefinition['id'], pointerId: number) => void
}

export default function DrumPad({
  pad,
  active,
  pressed,
  onHit,
  onPointerStart,
  onPointerEnd,
}: DrumPadProps) {
  const heldActivationKeys = useRef(new Set<string>())

  useEffect(() => {
    const clearHeldActivationKeys = () => heldActivationKeys.current.clear()
    const clearHeldActivationKeysWhenHidden = () => {
      if (document.hidden) clearHeldActivationKeys()
    }

    window.addEventListener('blur', clearHeldActivationKeys)
    document.addEventListener('visibilitychange', clearHeldActivationKeysWhenHidden)
    return () => {
      window.removeEventListener('blur', clearHeldActivationKeys)
      document.removeEventListener('visibilitychange', clearHeldActivationKeysWhenHidden)
    }
  }, [])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.code !== 'Enter' && event.code !== 'Space') return

    if (event.repeat || heldActivationKeys.current.has(event.code)) {
      event.preventDefault()
      return
    }
    heldActivationKeys.current.add(event.code)
  }

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    heldActivationKeys.current.delete(event.code)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !onPointerStart(pad.id, event.pointerId)) return

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Window-level pointerup/pointercancel listeners still release this source.
    }
    onHit()
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    onPointerEnd(pad.id, event.pointerId)
  }

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    // Pointer clicks already triggered on pointerdown. Native keyboard and
    // programmatic button clicks use detail 0 and continue through click.
    if (event.detail === 0) onHit()
  }

  return (
    <button
      type="button"
      className={`drum-pad drum-pad--${pad.kind}${active ? ' is-active' : ''}`}
      aria-pressed={pressed}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={() => heldActivationKeys.current.clear()}
    >
      <span className="pad-art" aria-hidden="true">
        <span className="pad-art__ring" />
        <span className="pad-art__core" />
      </span>
      <span className="pad-copy">
        <span className="pad-name">{pad.name}</span>
        {' '}
        <span className="pad-status">{pressed ? 'Đang kích hoạt' : 'Sẵn sàng'}</span>
      </span>
      {' '}
      <span className="keycap">
        {pad.keyLabel}
      </span>
    </button>
  )
}
