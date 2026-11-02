import { useCallback, useEffect, useRef, useState } from 'react'
import DrumPad from './components/DrumPad'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useDrumKeyboard } from './hooks/useDrumKeyboard'
import {
  addHitToHistory,
  DRUM_PADS,
  formatHitTime,
  PAD_BY_CODE,
  PAD_BY_ID,
} from './drums'
import type { HitRecord, PadId } from './drums'

const MAX_HISTORY = 8
const ANNOUNCE_DELAY_MS = 300
const PAD_FLASH_MS = 150

interface PendingAnnouncement {
  count: number
  names: string[]
  lastName: string
  lastTime: string
}

export default function App() {
  const [keyboardEnabled, setKeyboardEnabled] = useState(true)
  const [volume, setVolume] = useState(0.72)
  const [muted, setMuted] = useState(false)
  const [totalHitCount, setTotalHitCount] = useState(0)
  const [history, setHistory] = useState<HitRecord[]>([])
  const [announcedHit, setAnnouncedHit] = useState('Chưa có nhịp gõ.')
  const [pointerSources, setPointerSources] = useState<Map<number, PadId>>(
    () => new Map(),
  )
  const [flashPadId, setFlashPadId] = useState<PadId | null>(null)
  const [meterDbfs, setMeterDbfs] = useState(Number.NEGATIVE_INFINITY)
  const { graphRef, play, audioError } = useAudioEngine(volume, muted)
  const nextHitId = useRef(1)
  const pendingAnnouncement = useRef<PendingAnnouncement | null>(null)
  const announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousMeterValue = useRef(Number.NEGATIVE_INFINITY)
  const pointerSourcesRef = useRef<Map<number, PadId>>(new Map())

  const triggerPad = useCallback(
    (padId: PadId) => {
      const pad = PAD_BY_ID.get(padId)
      if (!pad) return

      const now = new Date()
      const time = formatHitTime(now)
      const hit: HitRecord = {
        id: nextHitId.current,
        padId,
        name: pad.name,
        time,
        timestamp: now.toISOString(),
      }
      nextHitId.current += 1
      setTotalHitCount((current) => current + 1)
      setHistory((current) => addHitToHistory(current, hit, MAX_HISTORY))
      setFlashPadId(padId)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlashPadId(null), PAD_FLASH_MS)

      if (announcementTimer.current) clearTimeout(announcementTimer.current)
      const previousAnnouncement = pendingAnnouncement.current
      pendingAnnouncement.current = previousAnnouncement
        ? {
            count: previousAnnouncement.count + 1,
            names: previousAnnouncement.names.includes(pad.name)
              ? previousAnnouncement.names
              : [...previousAnnouncement.names, pad.name],
            lastName: pad.name,
            lastTime: time,
          }
        : { count: 1, names: [pad.name], lastName: pad.name, lastTime: time }
      announcementTimer.current = setTimeout(() => {
        const summary = pendingAnnouncement.current
        if (!summary) return
        setAnnouncedHit(
          summary.count === 1
            ? `${summary.lastName} · ${summary.lastTime}`
            : `${summary.count} nhịp nhanh: ${summary.names.join(', ')}. Gần nhất: ${summary.lastName} · ${summary.lastTime}`,
        )
        pendingAnnouncement.current = null
      }, ANNOUNCE_DELAY_MS)
      void play(padId)
    },
    [play],
  )

  const activeKeyboardPads = useDrumKeyboard(
    PAD_BY_CODE,
    triggerPad,
    keyboardEnabled,
  )

  const startPointer = useCallback((padId: PadId, pointerId: number) => {
    if (pointerSourcesRef.current.has(pointerId)) return false

    const nextSources = new Map(pointerSourcesRef.current)
    nextSources.set(pointerId, padId)
    pointerSourcesRef.current = nextSources
    setPointerSources(nextSources)
    return true
  }, [])

  const endPointer = useCallback((pointerId: number, padId?: PadId) => {
    const currentPadId = pointerSourcesRef.current.get(pointerId)
    if (!currentPadId || (padId && padId !== currentPadId)) return

    const nextSources = new Map(pointerSourcesRef.current)
    nextSources.delete(pointerId)
    pointerSourcesRef.current = nextSources
    setPointerSources(nextSources)
  }, [])

  useEffect(() => {
    const releasePointer = (event: globalThis.PointerEvent) => {
      endPointer(event.pointerId)
    }
    const clearPointerSources = () => {
      if (pointerSourcesRef.current.size === 0) return
      pointerSourcesRef.current = new Map()
      setPointerSources(new Map())
    }
    const clearPointerSourcesWhenHidden = () => {
      if (document.hidden) clearPointerSources()
    }

    window.addEventListener('pointerup', releasePointer, true)
    window.addEventListener('pointercancel', releasePointer, true)
    window.addEventListener('blur', clearPointerSources)
    document.addEventListener('visibilitychange', clearPointerSourcesWhenHidden)
    return () => {
      window.removeEventListener('pointerup', releasePointer, true)
      window.removeEventListener('pointercancel', releasePointer, true)
      window.removeEventListener('blur', clearPointerSources)
      document.removeEventListener('visibilitychange', clearPointerSourcesWhenHidden)
    }
  }, [endPointer])

  useEffect(
    () => () => {
      if (announcementTimer.current) clearTimeout(announcementTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  useEffect(() => {
    let frameId = 0
    let lastSampleAt = 0
    const sampleMeter = (timestamp: number) => {
      const graph = graphRef.current
      if (graph && timestamp - lastSampleAt >= 70) {
        lastSampleAt = timestamp
        const samples = new Float32Array(graph.analyser.fftSize)
        graph.analyser.getFloatTimeDomainData(samples)
        let squareSum = 0
        for (const sample of samples) squareSum += sample * sample
        const rms = Math.sqrt(squareSum / samples.length)
        const nextDbfs = rms > 0 ? 20 * Math.log10(rms) : Number.NEGATIVE_INFINITY
        const previous = previousMeterValue.current
        if (
          (Number.isFinite(nextDbfs) && Math.abs(nextDbfs - previous) >= 1.3) ||
          (Number.isFinite(nextDbfs) !== Number.isFinite(previous))
        ) {
          previousMeterValue.current = nextDbfs
          setMeterDbfs(nextDbfs)
        }
      }
      frameId = window.requestAnimationFrame(sampleMeter)
    }

    frameId = window.requestAnimationFrame(sampleMeter)
    return () => window.cancelAnimationFrame(frameId)
  }, [graphRef])

  const meterPercentage = Number.isFinite(meterDbfs)
    ? Math.max(0, Math.min(100, ((meterDbfs + 60) / 60) * 100))
    : 0
  const meterLabel = Number.isFinite(meterDbfs)
    ? `${meterDbfs.toFixed(1)} dBFS`
    : '−∞ dBFS'
  const pointerPadIds = new Set(pointerSources.values())

  return (
    <>
      <a className="skip-link" href="#main-content">
        Bỏ qua đến bộ trống
      </a>
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="#main-content">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="brand-name">production<span>studio</span></span>
          </a>
          <div className="session-chip">
            <span className="session-dot" aria-hidden="true" />
            <span>PHÒNG THU TẠI NHÀ</span>
          </div>
        </header>

        <main id="main-content" className="studio-layout" tabIndex={-1}>
          <section className="studio-main" aria-labelledby="studio-title">
            <div className="intro-block">
              <p className="eyebrow">BỘ TRỐNG ĐIỆN TỬ · 07 PAD</p>
              <div className="title-row">
                <div>
                  <h1 id="studio-title">Drum Kit</h1>
                  <p className="intro-copy">
                    Chạm để chơi. Giữ nhịp theo cách của bạn.
                  </p>
                </div>
                <div className="studio-counter">
                  <span className="counter-value">{String(totalHitCount).padStart(2, '0')}</span>
                  <span className="counter-label">TỔNG LƯỢT ĐÁNH</span>
                </div>
              </div>
            </div>

            <div className="instrument-heading">
              <h2>Nhạc cụ</h2>
              <span className="keyboard-hint">
                <span className="keyboard-hint__dot" aria-hidden="true" />
                <span>Chạm pad hoặc dùng phím tắt</span>
              </span>
            </div>

            <div className="pad-grid">
              {DRUM_PADS.map((pad) => {
                const pressed =
                  activeKeyboardPads.has(pad.id) || pointerPadIds.has(pad.id)
                const active = pressed || flashPadId === pad.id
                return (
                  <DrumPad
                    key={pad.id}
                    pad={pad}
                    active={active}
                    pressed={pressed}
                    onHit={() => triggerPad(pad.id)}
                    onPointerStart={startPointer}
                    onPointerEnd={(id, pointerId) => endPointer(pointerId, id)}
                  />
                )
              })}
            </div>

            <div className="hint-strip">
              <span className="hint-icon" aria-hidden="true">↵</span>
              <p>
                Nhấn <kbd>W A S D</kbd> cho tom, <kbd>J</kbd> snare, <kbd>K</kbd> crash, <kbd>L</kbd> kick.
              </p>
              <span className="hint-separator" aria-hidden="true" />
              <p>Enter hoặc Space cũng chơi pad đang chọn.</p>
            </div>
          </section>

          <aside className="studio-side" aria-label="Điều khiển phòng thu">
            <section className="control-card" aria-labelledby="control-title">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">ĐẦU RA</p>
                  <h2 id="control-title">Bàn trộn</h2>
                </div>
                <span className="card-icon" aria-hidden="true">◖</span>
              </div>

              <div className="volume-heading">
                <label htmlFor="master-volume">Âm lượng tổng</label>
                <output htmlFor="master-volume" className="volume-value">
                  {Math.round(volume * 100)}%
                </output>
              </div>
              <input
                id="master-volume"
                className="volume-slider"
                aria-label="Âm lượng đầu ra"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => setVolume(Number(event.currentTarget.value))}
              />
              <div className="range-labels" aria-hidden="true">
                <span>0</span><span>50</span><span>100</span>
              </div>

              <button
                type="button"
                className={`mute-button${muted ? ' is-muted' : ''}`}
                aria-pressed={muted}
                onClick={() => setMuted((current) => !current)}
              >
                <span className="mute-icon" aria-hidden="true">{muted ? '×' : '◖'}</span>
                <span>{muted ? 'Bật tiếng' : 'Tắt tiếng'}</span>
                <span className="button-arrow" aria-hidden="true">↗</span>
              </button>

              <div className="meter-block">
                <div className="meter-heading">
                  <span>Mức tín hiệu</span>
                  <output className="meter-reading">{meterLabel}</output>
                </div>
                <meter
                  className="signal-meter"
                  min="0"
                  max="100"
                  value={meterPercentage}
                  aria-label="Mức tín hiệu đầu ra, đơn vị dBFS"
                />
                <div className="meter-scale" aria-hidden="true">
                  <span>−60 dBFS</span><span>−30</span><span>0</span>
                </div>
              </div>

              <div className="keyboard-setting">
                <div>
                  <span className="setting-title">Phím tắt bàn phím</span>
                  <span className="setting-subtitle">W · A · S · D · J · K · L</span>
                </div>
                <button
                  type="button"
                  className={`switch${keyboardEnabled ? ' is-on' : ''}`}
                  role="switch"
                  aria-checked={keyboardEnabled}
                  aria-label="Phím tắt bàn phím"
                  onClick={() => setKeyboardEnabled((current) => !current)}
                >
                  <span className="switch-knob" />
                  <span className="switch-label">{keyboardEnabled ? 'Bật' : 'Tắt'}</span>
                </button>
              </div>
              {audioError && (
                <p className="audio-error" role="alert">
                  Không phát được âm thanh: {audioError}
                </p>
              )}
            </section>

            <section className="history-card" aria-labelledby="history-title">
              <div className="card-heading history-heading">
                <div>
                  <p className="eyebrow">NHỊP MỚI CHƠI</p>
                  <h2 id="history-title">Lịch sử nhịp</h2>
                </div>
                <span className="history-count">{String(history.length).padStart(2, '0')}</span>
              </div>
              <output className="live-announcement" aria-live="polite" aria-atomic="true">
                {announcedHit}
              </output>
              {history.length === 0 ? (
                <p className="history-empty">Các nhịp bạn vừa chơi sẽ xuất hiện ở đây.</p>
              ) : (
                <ol className="history-list" aria-label="Tám lượt đánh gần nhất">
                  {history.map((hit, index) => (
                    <li className="history-item" key={hit.id}>
                      <span className="history-index" aria-hidden="true">
                        {String(history.length - index).padStart(2, '0')}
                      </span>
                      <span className={`history-instrument history-instrument--${hit.padId}`} aria-hidden="true">
                        ●
                      </span>
                      <span className="history-name">{hit.name}</span>
                      <time className="history-time" dateTime={hit.timestamp}>{hit.time}</time>
                    </li>
                  ))}
                </ol>
              )}
              <div className="history-footer">
                <span className="history-live-dot" aria-hidden="true" />
                <span>Tối đa {MAX_HISTORY} nhịp được lưu trong phiên này</span>
              </div>
            </section>
          </aside>
        </main>

        <footer className="site-footer">
          <span>PRODUCTION STUDIO <span aria-hidden="true">/</span> DRUM KIT</span>
          <span>Âm thanh tạo trực tiếp bằng Web Audio API</span>
        </footer>
      </div>
    </>
  )
}
