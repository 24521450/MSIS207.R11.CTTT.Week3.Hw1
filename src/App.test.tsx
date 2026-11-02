import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Production Studio Drum Kit', () => {
  it('renders seven named pads with shortcut labels and pressed state', () => {
    render(<App />)
    const pads = document.querySelectorAll('.drum-pad')
    expect(pads).toHaveLength(7)
    for (const name of [
      'Tom 1 Sẵn sàng W',
      'Tom 2 Sẵn sàng A',
      'Tom 3 Sẵn sàng S',
      'Tom 4 Sẵn sàng D',
      'Snare Sẵn sàng J',
      'Crash Sẵn sàng K',
      'Kick Sẵn sàng L',
    ]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('plays a pad on Enter and Space exactly once each', async () => {
    const user = userEvent.setup()
    render(<App />)
    const pad = screen.getByRole('button', { name: 'Snare Sẵn sàng J' })
    pad.focus()

    await user.keyboard('{Enter}')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    await user.keyboard(' ')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('records pointer and shortcut hits, flashes the pad, and limits history to eight', async () => {
    render(<App />)
    const kick = screen.getByRole('button', { name: 'Kick Sẵn sàng L' })
    fireEvent.pointerDown(kick, { button: 0, pointerId: 7 })
    expect(kick).toHaveAttribute('aria-pressed', 'true')
    fireEvent.pointerCancel(kick, { pointerId: 7 })
    expect(kick).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(kick)
    expect(kick).toHaveAttribute('aria-pressed', 'true')

    for (let index = 0; index < 10; index += 1) fireEvent.click(kick)
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(8))
    expect(within(screen.getByRole('list')).getAllByText('Kick')).toHaveLength(8)
    expect(screen.getByText('11', { selector: '.counter-value' })).toBeInTheDocument()
    expect(screen.getByText('08', { selector: '.history-count' })).toBeInTheDocument()
  })

  it('controls output volume and mute with labelled controls', async () => {
    render(<App />)
    const volume = screen.getByRole('slider', { name: 'Âm lượng đầu ra' })
    fireEvent.change(volume, { target: { value: '0.05' } })
    expect(volume).toHaveValue('0.05')
    expect(screen.getByText('5%', { selector: '.volume-value' })).toBeInTheDocument()

    const mute = screen.getByRole('button', { name: 'Tắt tiếng' })
    fireEvent.click(mute)
    expect(screen.getByRole('button', { name: 'Bật tiếng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('coalesces a quick run of hits into one polite live update', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Tom 1 Sẵn sàng W' }))
    fireEvent.click(screen.getByRole('button', { name: 'Snare Sẵn sàng J' }))
    await waitFor(
      () => expect(screen.getByText(/2 nhịp nhanh: Tom 1, Snare/)).toBeInTheDocument(),
      { timeout: 1000 },
    )
    expect(document.querySelector('.live-announcement')).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })
})
