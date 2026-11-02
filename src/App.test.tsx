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

  it('plays once at pointerdown and ignores its later pointer click', () => {
    render(<App />)
    const kick = screen.getByRole('button', { name: 'Kick Sẵn sàng L' })

    fireEvent.pointerDown(kick, { button: 0, pointerId: 17 })
    expect(screen.getByText('01', { selector: '.counter-value' })).toBeInTheDocument()
    expect(kick).toHaveAttribute('aria-pressed', 'true')

    fireEvent.pointerUp(kick, { pointerId: 17 })
    expect(kick).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(kick, { detail: 1 })
    expect(screen.getByText('01', { selector: '.counter-value' })).toBeInTheDocument()
  })

  it('tracks independent pointer sources on two pads and one shared pad', () => {
    render(<App />)
    const tom1 = screen.getByRole('button', { name: 'Tom 1 Sẵn sàng W' })
    const crash = screen.getByRole('button', { name: 'Crash Sẵn sàng K' })

    fireEvent.pointerDown(tom1, { button: 0, pointerId: 1 })
    fireEvent.pointerDown(crash, { button: 0, pointerId: 2 })
    fireEvent.pointerDown(tom1, { button: 0, pointerId: 3 })
    expect(tom1).toHaveAttribute('aria-pressed', 'true')
    expect(crash).toHaveAttribute('aria-pressed', 'true')

    fireEvent.pointerUp(tom1, { pointerId: 1 })
    expect(tom1).toHaveAttribute('aria-pressed', 'true')
    expect(crash).toHaveAttribute('aria-pressed', 'true')

    fireEvent.pointerUp(crash, { pointerId: 2 })
    expect(crash).toHaveAttribute('aria-pressed', 'false')
    expect(tom1).toHaveAttribute('aria-pressed', 'true')

    fireEvent.pointerUp(tom1, { pointerId: 3 })
    expect(tom1).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('03', { selector: '.counter-value' })).toBeInTheDocument()
  })

  it('clears pointer sources on cancel, lost capture, blur, and hidden tab', () => {
    render(<App />)
    const kick = screen.getByRole('button', { name: 'Kick Sẵn sàng L' })
    const snare = screen.getByRole('button', { name: 'Snare Sẵn sàng J' })

    fireEvent.pointerDown(kick, { button: 0, pointerId: 21 })
    fireEvent.pointerCancel(kick, { pointerId: 21 })
    expect(kick).toHaveAttribute('aria-pressed', 'false')

    fireEvent.pointerDown(kick, { button: 0, pointerId: 22 })
    fireEvent.lostPointerCapture(kick, { pointerId: 22 })
    expect(kick).toHaveAttribute('aria-pressed', 'false')

    fireEvent.pointerDown(snare, { button: 0, pointerId: 23 })
    fireEvent.blur(window)
    expect(snare).toHaveAttribute('aria-pressed', 'false')

    fireEvent.pointerDown(snare, { button: 0, pointerId: 24 })
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    fireEvent(document, new Event('visibilitychange', { bubbles: true }))
    expect(snare).toHaveAttribute('aria-pressed', 'false')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  it('keeps keyboard and programmatic button activation available without a pointer', () => {
    render(<App />)
    const pad = screen.getByRole('button', { name: 'Snare Sẵn sàng J' })

    fireEvent.click(pad)
    expect(screen.getByText('01', { selector: '.counter-value' })).toBeInTheDocument()
    pad.focus()
    fireEvent.keyDown(pad, { code: 'Enter', key: 'Enter' })
    const repeated = fireEvent.keyDown(pad, {
      code: 'Enter',
      key: 'Enter',
      repeat: true,
    })
    expect(repeated).toBe(false)
    fireEvent.click(pad)
    fireEvent.keyUp(pad, { code: 'Enter', key: 'Enter' })
    expect(screen.getByText('02', { selector: '.counter-value' })).toBeInTheDocument()

    fireEvent.keyDown(pad, { code: 'Enter', key: 'Enter' })
    fireEvent.click(pad)
    fireEvent.keyUp(pad, { code: 'Enter', key: 'Enter' })
    expect(screen.getByText('03', { selector: '.counter-value' })).toBeInTheDocument()
  })

  it('clears a held native activation key when focus or tab visibility is lost', () => {
    render(<App />)
    const pad = screen.getByRole('button', { name: 'Snare Sẵn sàng J' })
    pad.focus()

    fireEvent.keyDown(pad, { code: 'Enter', key: 'Enter' })
    fireEvent.blur(window)
    const afterBlur = fireEvent.keyDown(pad, { code: 'Enter', key: 'Enter' })
    expect(afterBlur).toBe(true)
    fireEvent.click(pad)
    fireEvent.keyUp(pad, { code: 'Enter', key: 'Enter' })

    fireEvent.keyDown(pad, { code: 'Space', key: ' ' })
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    fireEvent(document, new Event('visibilitychange', { bubbles: true }))
    const afterHidden = fireEvent.keyDown(pad, { code: 'Space', key: ' ' })
    expect(afterHidden).toBe(true)
    fireEvent.click(pad)
    fireEvent.keyUp(pad, { code: 'Space', key: ' ' })
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })

    expect(screen.getByText('02', { selector: '.counter-value' })).toBeInTheDocument()
  })

  it('records pointer and shortcut hits, flashes the pad, and limits history to eight', async () => {
    render(<App />)
    const kick = screen.getByRole('button', { name: 'Kick Sẵn sàng L' })
    fireEvent.pointerDown(kick, { button: 0, pointerId: 7 })
    expect(kick).toHaveAttribute('aria-pressed', 'true')
    fireEvent.pointerCancel(kick, { pointerId: 7 })
    expect(kick).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(kick)
    expect(kick).toHaveAttribute('aria-pressed', 'false')

    for (let index = 0; index < 10; index += 1) fireEvent.click(kick)
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(8))
    expect(within(screen.getByRole('list')).getAllByText('Kick')).toHaveLength(8)
    expect(screen.getByText('12', { selector: '.counter-value' })).toBeInTheDocument()
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
