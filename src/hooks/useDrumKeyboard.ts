import { useEffect, useRef, useState } from 'react'
import type { PadId } from '../drums'

const EMPTY_PAD_IDS: ReadonlySet<PadId> = new Set()

type TriggerPad = (padId: PadId) => void

interface KeyboardOptions {
  padMap: ReadonlyMap<string, PadId>
  onTriggerPad: TriggerPad
  isEnabled: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    ),
  )
}

export function useDrumKeyboard(
  padMap: ReadonlyMap<string, PadId>,
  onTriggerPad: TriggerPad,
  isEnabled: boolean,
): ReadonlySet<PadId> {
  const optionsRef = useRef<KeyboardOptions>({ padMap, onTriggerPad, isEnabled })
  const pressedCodesRef = useRef(new Map<string, PadId>())
  const composingRef = useRef(false)
  const [activePadIds, setActivePadIds] = useState<ReadonlySet<PadId>>(
    () => new Set(),
  )

  useEffect(() => {
    optionsRef.current = { padMap, onTriggerPad, isEnabled }
  }, [isEnabled, onTriggerPad, padMap])

  useEffect(() => {
    const pressedCodes = pressedCodesRef.current
    const releaseAll = () => {
      if (pressedCodes.size === 0) return
      pressedCodes.clear()
      setActivePadIds(new Set())
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const options = optionsRef.current
      if (
        !options.isEnabled ||
        event.repeat ||
        event.isComposing ||
        composingRef.current ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        isEditableTarget(event.target)
      ) {
        return
      }

      const padId = options.padMap.get(event.code)
      if (!padId || pressedCodesRef.current.has(event.code)) return

      event.preventDefault()
      pressedCodes.set(event.code, padId)
      setActivePadIds((current) => new Set(current).add(padId))
      options.onTriggerPad(padId)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const padId = pressedCodes.get(event.code)
      if (!padId) return
      pressedCodes.delete(event.code)
      setActivePadIds((current) => {
        const next = new Set(current)
        next.delete(padId)
        return next
      })
    }

    const handleCompositionStart = () => {
      composingRef.current = true
      releaseAll()
    }
    const handleCompositionEnd = () => {
      composingRef.current = false
    }
    const handleVisibilityChange = () => {
      if (document.hidden) releaseAll()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', releaseAll)
    window.addEventListener('compositionstart', handleCompositionStart)
    window.addEventListener('compositionend', handleCompositionEnd)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', releaseAll)
      window.removeEventListener('compositionstart', handleCompositionStart)
      window.removeEventListener('compositionend', handleCompositionEnd)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      pressedCodes.clear()
    }
  }, [])

  return isEnabled ? activePadIds : EMPTY_PAD_IDS
}
