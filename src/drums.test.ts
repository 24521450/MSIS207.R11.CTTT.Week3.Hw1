import { addHitToHistory, DRUM_PADS, PAD_BY_CODE } from './drums'
import type { HitRecord } from './drums'
import { describe, expect, it } from 'vitest'

describe('drum pad definitions and hit history', () => {
  it('maps all seven physical codes to the required pads', () => {
    expect([...PAD_BY_CODE.entries()]).toEqual([
      ['KeyW', 'tom-1'],
      ['KeyA', 'tom-2'],
      ['KeyS', 'tom-3'],
      ['KeyD', 'tom-4'],
      ['KeyJ', 'snare'],
      ['KeyK', 'crash'],
      ['KeyL', 'kick'],
    ])
    expect(DRUM_PADS).toHaveLength(7)
  })

  it('keeps the newest entries first and caps history at eight', () => {
    const hits: HitRecord[] = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      padId: 'kick',
      name: 'Kick',
      time: '12:00:00',
      timestamp: '2026-11-02T05:00:00.000Z',
    }))
    const recent = hits.reduce<HitRecord[]>(
      (history, hit) => addHitToHistory(history, hit, 8),
      [],
    )
    expect(recent).toHaveLength(8)
    expect(recent.map((hit) => hit.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3])
  })
})
