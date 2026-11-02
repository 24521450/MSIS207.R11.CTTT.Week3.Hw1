import type { PointerEvent } from 'react'
import type { PadDefinition } from '../drums'

interface DrumPadProps {
  pad: PadDefinition
  active: boolean
  onHit: () => void
  onContactChange: (padId: PadDefinition['id'], active: boolean) => void
}

export default function DrumPad({
  pad,
  active,
  onHit,
  onContactChange,
}: DrumPadProps) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button === 0) onContactChange(pad.id, true)
  }

  return (
    <button
      type="button"
      className={`drum-pad drum-pad--${pad.kind}${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={onHit}
      onPointerDown={handlePointerDown}
      onPointerUp={() => onContactChange(pad.id, false)}
      onPointerCancel={() => onContactChange(pad.id, false)}
      onLostPointerCapture={() => onContactChange(pad.id, false)}
    >
      <span className="pad-art" aria-hidden="true">
        <span className="pad-art__ring" />
        <span className="pad-art__core" />
      </span>
      <span className="pad-copy">
        <span className="pad-name">{pad.name}</span>
        {' '}
        <span className="pad-status">{active ? 'Đang kích hoạt' : 'Sẵn sàng'}</span>
      </span>
      {' '}
      <span className="keycap">
        {pad.keyLabel}
      </span>
    </button>
  )
}
