export const DRUM_PADS = [
  { id: 'tom-1', name: 'Tom 1', keyLabel: 'W', keyCode: 'KeyW', kind: 'tom' },
  { id: 'tom-2', name: 'Tom 2', keyLabel: 'A', keyCode: 'KeyA', kind: 'tom' },
  { id: 'tom-3', name: 'Tom 3', keyLabel: 'S', keyCode: 'KeyS', kind: 'tom' },
  { id: 'tom-4', name: 'Tom 4', keyLabel: 'D', keyCode: 'KeyD', kind: 'tom' },
  { id: 'snare', name: 'Snare', keyLabel: 'J', keyCode: 'KeyJ', kind: 'snare' },
  { id: 'crash', name: 'Crash', keyLabel: 'K', keyCode: 'KeyK', kind: 'crash' },
  { id: 'kick', name: 'Kick', keyLabel: 'L', keyCode: 'KeyL', kind: 'kick' },
] as const

export type PadDefinition = (typeof DRUM_PADS)[number]
export type PadId = PadDefinition['id']

export const PAD_BY_CODE: ReadonlyMap<string, PadId> = new Map(
  DRUM_PADS.map((pad) => [pad.keyCode, pad.id]),
)

export const PAD_BY_ID: ReadonlyMap<PadId, PadDefinition> = new Map(
  DRUM_PADS.map((pad) => [pad.id, pad]),
)

export interface HitRecord {
  id: number
  padId: PadId
  name: string
  time: string
  timestamp: string
}

export function formatHitTime(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function addHitToHistory(
  history: readonly HitRecord[],
  hit: HitRecord,
  limit = 8,
): HitRecord[] {
  return [hit, ...history].slice(0, limit)
}
