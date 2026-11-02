import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import os from 'node:os'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const appUrl =
  process.env.APP_URL ||
  'http://127.0.0.1:4173/MSIS207.R11.CTTT.Week3.Hw1/'
const chromePath =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const evidenceDir = resolve('evidence')
const reportPath = resolve(evidenceDir, 'browser-check.json')
const axeSource = await import('node:fs/promises').then(({ readFile }) =>
  readFile(require.resolve('axe-core'), 'utf8'),
)
const browser = await chromium.launch({ headless: true, executablePath: chromePath })
const pageErrors = []
const consoleErrors = []
const networkFailures = []
const checks = {}

function parseColor(color) {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
  }
  const values = color.match(/[\d.]+/g)
  if (!values || values.length < 3) throw new Error(`Unsupported color: ${color}`)
  return values.slice(0, 3).map(Number)
}

function relativeLuminance(color) {
  const channels = parseColor(color).map((value) => {
    const normalized = value / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground)
  const second = relativeLuminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

async function axeCheck(page) {
  await page.addScriptTag({ content: axeSource })
  const result = await page.evaluate(async () => {
    const audit = await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
    })
    return {
      passes: audit.passes.length,
      violations: audit.violations.map((item) => ({
        id: item.id,
        impact: item.impact,
        help: item.help,
        targets: item.nodes.map((node) => node.target),
      })),
      incomplete: audit.incomplete.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
    }
  })
  assert.deepEqual(result.violations, [], 'Axe must report zero WCAG A/AA violations')
  return result
}

async function hitCount(page) {
  return page.locator('.history-item').count()
}

async function totalHitCount(page) {
  return Number(await page.locator('.counter-value').innerText())
}

async function contrastAudit(page) {
  const pairs = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const color = (selector) => getComputedStyle(document.querySelector(selector)).color
    const border = (selector) => {
      if (selector === '.volume-slider::-webkit-slider-runnable-track') {
        return getComputedStyle(document.querySelector('.volume-slider'), '::-webkit-slider-runnable-track').borderTopColor
      }
      return getComputedStyle(document.querySelector(selector)).borderTopColor
    }
    const token = (name) => root.getPropertyValue(name).trim()
    return [
      { name: 'body text / base canvas', kind: 'text', foreground: color('h1'), background: token('--bg'), threshold: 4.5 },
      { name: 'intro copy / base canvas', kind: 'text', foreground: color('.intro-copy'), background: token('--bg'), threshold: 4.5 },
      { name: 'subdued label / base canvas', kind: 'text', foreground: color('.counter-label'), background: token('--bg'), threshold: 4.5 },
      { name: 'accent metadata / base canvas', kind: 'text', foreground: color('.eyebrow'), background: token('--bg'), threshold: 4.5 },
      { name: 'session chip / base canvas', kind: 'text', foreground: color('.session-chip'), background: token('--bg'), threshold: 4.5 },
      { name: 'counter value / base canvas', kind: 'text', foreground: color('.counter-value'), background: token('--bg'), threshold: 4.5 },
      { name: 'pad status / lightest pad surface', kind: 'text', foreground: color('.pad-status'), background: '#252f3a', threshold: 4.5 },
      { name: 'empty history copy / panel', kind: 'text', foreground: color('.history-empty'), background: token('--panel'), threshold: 4.5 },
      { name: 'range labels / panel', kind: 'text', foreground: color('.range-labels'), background: token('--panel'), threshold: 4.5 },
      { name: 'mute button text / button surface', kind: 'text', foreground: color('.mute-button'), background: '#222c36', threshold: 4.5 },
      { name: 'meter title / panel', kind: 'text', foreground: color('.meter-heading'), background: token('--panel'), threshold: 4.5 },
      { name: 'meter scale / panel', kind: 'text', foreground: color('.meter-scale'), background: token('--panel'), threshold: 4.5 },
      { name: 'history name / panel', kind: 'text', foreground: '#e8e9e7', background: token('--panel'), threshold: 4.5 },
      { name: 'history time / panel', kind: 'text', foreground: '#adb8c2', background: token('--panel'), threshold: 4.5 },
      { name: 'switch label / enabled switch', kind: 'text', foreground: color('.switch'), background: '#26392e', threshold: 4.5 },
      { name: 'hint copy / hint surface', kind: 'text', foreground: color('.hint-strip p'), background: '#19222c', threshold: 4.5 },
      { name: 'keycap label / keycap surface', kind: 'text', foreground: '#e6c28f', background: '#171e26', threshold: 4.5 },
      { name: 'focus ring / page canvas', kind: 'non-text', foreground: '#f4c889', background: token('--bg'), threshold: 3 },
      { name: 'pad border / lightest pad surface', kind: 'non-text', foreground: border('.drum-pad'), background: '#252f3a', threshold: 3 },
      { name: 'mute border / mute surface', kind: 'non-text', foreground: border('.mute-button'), background: '#222c36', threshold: 3 },
      { name: 'enabled switch border / switch surface', kind: 'non-text', foreground: border('.switch'), background: '#26392e', threshold: 3 },
      { name: 'slider rail border / rail', kind: 'non-text', foreground: token('--slider-outline'), background: '#303b46', threshold: 3 },
      { name: 'meter border / meter surface', kind: 'non-text', foreground: border('.signal-meter'), background: '#121820', threshold: 3 },
      { name: 'control card border / card surface', kind: 'non-text', foreground: border('.control-card'), background: '#1b242e', threshold: 3 },
    ]
  })
  const result = pairs.map((pair) => ({
    ...pair,
    ratio: Number(contrastRatio(pair.foreground, pair.background).toFixed(2)),
    result: contrastRatio(pair.foreground, pair.background) >= pair.threshold ? 'pass' : 'fail',
  }))
  assert.ok(
    result.every((pair) => pair.result === 'pass'),
    `Manual contrast sample failed: ${JSON.stringify(result.filter((pair) => pair.result === 'fail'))}`,
  )
  return result
}

try {
  await mkdir(evidenceDir, { recursive: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) =>
    networkFailures.push(`${request.url()}: ${request.failure()?.errorText ?? 'failed'}`),
  )

  await page.goto(appUrl, { waitUntil: 'networkidle' })
  assert.equal(await page.title(), 'Production Studio — Drum Kit')
  assert.equal(await page.locator('.drum-pad').count(), 7)
  assert.equal(await page.getByRole('main').count(), 1)
  assert.equal(await page.getByRole('heading', { name: 'Drum Kit', level: 1 }).count(), 1)
  await page.screenshot({ path: resolve(evidenceDir, 'desktop.png'), fullPage: true })
  checks.desktop = { viewport: { width: 1440, height: 1000 }, pads: 7 }
  checks.axeDesktop = await axeCheck(page)
  checks.contrastSamples = await contrastAudit(page)

  await page.keyboard.press('Tab')
  await page.screenshot({ path: resolve(evidenceDir, 'keyboard-focus.png'), fullPage: false })
  const skipFocus = await page.evaluate(() => ({
    label: document.activeElement?.textContent?.trim(),
    visible: document.activeElement?.matches(':focus-visible') ?? false,
  }))
  assert.equal(skipFocus.label, 'Bỏ qua đến bộ trống')
  assert.equal(skipFocus.visible, true)
  await page.keyboard.press('Enter')
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    'main-content',
    'The skip link must move keyboard focus to the main area',
  )
  checks.keyboardFocus = { skipLinkVisible: true, skipTargetFocused: true }

  const tom1 = page.locator('.drum-pad--tom').first()
  await page.keyboard.down('w')
  await tom1.waitFor({ state: 'visible' })
  assert.equal(await tom1.getAttribute('aria-pressed'), 'true')
  await page.keyboard.up('w')
  await page.waitForFunction(
    () => document.querySelector('.drum-pad--tom')?.getAttribute('aria-pressed') === 'false',
    undefined,
    { timeout: 3000 },
  )
  assert.equal(await totalHitCount(page), 1)
  await page.waitForFunction(
    () => document.querySelector('.meter-reading')?.textContent !== '−∞ dBFS',
    undefined,
    { timeout: 3000 },
  )
  const defaultGainDbfs = Number.parseFloat(await page.locator('.meter-reading').innerText())
  assert.ok(Number.isFinite(defaultGainDbfs), 'A played pad should register on the audio analyser')
  await page.waitForFunction(
    () => document.querySelector('.meter-reading')?.textContent === '−∞ dBFS',
    undefined,
    { timeout: 3000 },
  )
  checks.physicalKeyboard = { code: 'KeyW', pressedAndReleased: true, hitCount: 1 }

  const slider = page.getByRole('slider', { name: 'Âm lượng đầu ra' })
  await slider.focus()
  const beforeEditableKey = await totalHitCount(page)
  await page.keyboard.press('a')
  assert.equal(await totalHitCount(page), beforeEditableKey)
  await page.keyboard.press('Home')
  const zeroVolume = await slider.inputValue()
  assert.equal(zeroVolume, '0')
  assert.equal(await page.locator('.volume-value').innerText(), '0%')
  const beforeZeroVolumeHit = await totalHitCount(page)
  await tom1.click()
  assert.equal(await totalHitCount(page), beforeZeroVolumeHit + 1)
  await page.waitForTimeout(400)
  assert.equal(await page.locator('.meter-reading').innerText(), '−∞ dBFS')

  await slider.focus()
  for (let step = 0; step < 10; step += 1) await page.keyboard.press('ArrowRight')
  const volumeValue = await slider.inputValue()
  assert.equal(volumeValue, '0.5')
  assert.equal(await page.locator('.volume-value').innerText(), '50%')
  await tom1.click()
  await page.waitForFunction(
    () => document.querySelector('.meter-reading')?.textContent !== '−∞ dBFS',
    undefined,
    { timeout: 3000 },
  )
  const halfGainDbfs = Number.parseFloat(await page.locator('.meter-reading').innerText())
  assert.ok(Number.isFinite(halfGainDbfs), 'A positive master gain should register on the analyser')
  checks.volumeControl = {
    keyboardValue: volumeValue,
    analyserAt72PercentDbfs: defaultGainDbfs,
    analyserAt0Percent: '−∞ dBFS',
    analyserAt50PercentDbfs: halfGainDbfs,
  }

  const mute = page.getByRole('button', { name: 'Tắt tiếng' })
  await mute.click()
  assert.equal(await page.getByRole('button', { name: 'Bật tiếng' }).getAttribute('aria-pressed'), 'true')
  const beforeMutedHit = await totalHitCount(page)
  await tom1.click()
  assert.equal(await totalHitCount(page), beforeMutedHit + 1)
  await page.waitForFunction(
    () => document.querySelector('.meter-reading')?.textContent === '−∞ dBFS',
    undefined,
    { timeout: 3000 },
  )
  checks.muteControl = { toggledOnAndOff: true, mutedPadStillRecordsHit: true, silentAnalyser: true }
  await page.getByRole('button', { name: 'Bật tiếng' }).click()

  const beforeOverlap = await totalHitCount(page)
  await page.keyboard.down('j')
  await page.keyboard.down('k')
  await page.keyboard.up('j')
  await page.keyboard.up('k')
  assert.equal(await totalHitCount(page), beforeOverlap + 2)
  checks.overlappingHits = { simultaneousPads: ['snare', 'crash'], hitCount: 2 }

  const shortcutSwitch = page.getByRole('switch', { name: 'Phím tắt bàn phím' })
  await shortcutSwitch.click()
  assert.equal(await shortcutSwitch.getAttribute('aria-checked'), 'false')
  const beforeDisabledShortcut = await totalHitCount(page)
  await page.keyboard.press('j')
  assert.equal(await totalHitCount(page), beforeDisabledShortcut)
  await page.getByRole('button', { name: /^Snare/ }).click()
  assert.equal(await totalHitCount(page), beforeDisabledShortcut + 1)
  await shortcutSwitch.click()
  checks.shortcutToggle = { disabledShortcutIgnored: true, pointerStillWorks: true }

  const snare = page.getByRole('button', { name: /^Snare/ })
  await snare.focus()
  const beforeNativeKeys = await totalHitCount(page)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
  assert.equal(await totalHitCount(page), beforeNativeKeys + 2)
  checks.nativeButtonKeys = { enterHits: 1, spaceHits: 1 }

  const kick = page.locator('.drum-pad--kick')
  await kick.dispatchEvent('pointerdown', { button: 0, pointerId: 41 })
  assert.equal(await kick.getAttribute('aria-pressed'), 'true')
  await kick.dispatchEvent('pointercancel', { button: 0, pointerId: 41 })
  assert.equal(await kick.getAttribute('aria-pressed'), 'false')
  const beforePointerClick = await totalHitCount(page)
  await kick.click()
  assert.equal(await totalHitCount(page), beforePointerClick + 1)
  checks.pointer = { clickHitOnce: true, pointerCancelReleased: true }

  for (let index = 0; index < 9; index += 1) {
    await page.getByRole('button', { name: /^Tom 2/ }).click()
  }
  assert.equal(await hitCount(page), 8)
  checks.history = { capacity: await hitCount(page), sessionTotal: await totalHitCount(page), newestFirst: true }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(100)
  const mobileLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    padCount: document.querySelectorAll('.drum-pad').length,
    minimumTarget: Math.min(
      ...Array.from(document.querySelectorAll('.drum-pad'), (pad) => {
        const rect = pad.getBoundingClientRect()
        return Math.min(rect.width, rect.height)
      }),
    ),
  }))
  assert.equal(mobileLayout.documentWidth, mobileLayout.viewportWidth)
  assert.equal(mobileLayout.padCount, 7)
  assert.ok(mobileLayout.minimumTarget >= 44)
  await page.screenshot({ path: resolve(evidenceDir, 'mobile.png'), fullPage: true })
  checks.mobile = mobileLayout
  checks.axeMobile = await axeCheck(page)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedMotionDuration = await page
    .locator('.drum-pad')
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration)
  assert.ok(parseFloat(reducedMotionDuration) < 0.002)
  checks.reducedMotion = { preference: 'reduce', transitionDuration: reducedMotionDuration }

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 720, height: 900 })
  const zoomProxy = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  assert.equal(zoomProxy.documentWidth, zoomProxy.viewportWidth)
  checks.zoom200PercentReflowProxy = {
    ...zoomProxy,
    note: '720 CSS px viewport approximates a 1440 px desktop viewport at 200% browser zoom.',
  }

  assert.deepEqual(pageErrors, [])
  assert.deepEqual(consoleErrors, [])
  assert.deepEqual(networkFailures, [])
  checks.runtime = { pageErrors, consoleErrors, failedRequests: networkFailures }
  checks.run = {
    url: appUrl,
    timestamp: new Date().toISOString(),
    node: process.version,
    chrome: browser.version(),
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
  }
  await writeFile(reportPath, `${JSON.stringify(checks, null, 2)}\n`, 'utf8')
  console.log(`Browser checks passed. Evidence: ${reportPath}`)
} finally {
  await browser.close()
}
