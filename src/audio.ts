import type { PadId } from './drums'

interface AudioGraph {
  context: AudioContext
  masterGain: GainNode
  analyser: AnalyserNode
  noiseBuffer: AudioBuffer
  activeSources: Set<AudioScheduledSourceNode>
  activeNodes: Set<AudioNode>
}

function createGraph(): AudioGraph {
  const context = new AudioContext({ latencyHint: 'interactive' })
  const masterGain = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const analyser = context.createAnalyser()
  const noiseBuffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * 2),
    context.sampleRate,
  )
  const channel = noiseBuffer.getChannelData(0)
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1
  }

  masterGain.gain.value = 0.36
  compressor.threshold.value = -16
  compressor.knee.value = 18
  compressor.ratio.value = 8
  compressor.attack.value = 0.003
  compressor.release.value = 0.18
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.72
  masterGain.connect(compressor)
  compressor.connect(analyser)
  analyser.connect(context.destination)

  return {
    context,
    masterGain,
    analyser,
    noiseBuffer,
    activeSources: new Set(),
    activeNodes: new Set(),
  }
}

function trackSource(
  graph: AudioGraph,
  source: AudioScheduledSourceNode,
  ...nodes: AudioNode[]
): void {
  const trackedNodes = [source, ...nodes]
  for (const node of trackedNodes) graph.activeNodes.add(node)
  graph.activeSources.add(source)
  source.addEventListener(
    'ended',
    () => {
      graph.activeSources.delete(source)
      for (const node of trackedNodes) {
        graph.activeNodes.delete(node)
        node.disconnect()
      }
    },
    { once: true },
  )
}

function envelope(
  gain: GainNode,
  now: number,
  peak: number,
  duration: number,
  attack = 0.004,
): void {
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(peak, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
}

function playTone(
  graph: AudioGraph,
  startFrequency: number,
  endFrequency: number,
  duration: number,
  peak: number,
  type: OscillatorType,
  detune = 0,
): void {
  const { context } = graph
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime
  oscillator.type = type
  oscillator.detune.value = detune
  oscillator.frequency.setValueAtTime(startFrequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration)
  envelope(gain, now, peak, duration)
  oscillator.connect(gain)
  gain.connect(graph.masterGain)
  trackSource(graph, oscillator, gain)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

function playNoise(
  graph: AudioGraph,
  duration: number,
  peak: number,
  filterType: BiquadFilterType,
  frequency: number,
  q = 0.7,
): void {
  const { context } = graph
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  const now = context.currentTime
  source.buffer = graph.noiseBuffer
  filter.type = filterType
  filter.frequency.value = frequency
  filter.Q.value = q
  envelope(gain, now, peak, duration, 0.008)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(graph.masterGain)
  trackSource(graph, source, filter, gain)
  source.start(now)
  source.stop(now + duration + 0.03)
}

export function playDrumVoice(graph: AudioGraph, padId: PadId): void {
  switch (padId) {
    case 'tom-1':
      playTone(graph, 190, 92, 0.32, 0.66, 'sine')
      break
    case 'tom-2':
      playTone(graph, 155, 75, 0.35, 0.72, 'triangle')
      break
    case 'tom-3':
      playTone(graph, 122, 59, 0.39, 0.78, 'sine')
      break
    case 'tom-4':
      playTone(graph, 96, 46, 0.43, 0.82, 'triangle')
      break
    case 'snare':
      playNoise(graph, 0.2, 0.74, 'highpass', 1250, 0.75)
      playTone(graph, 205, 135, 0.16, 0.48, 'triangle')
      break
    case 'crash':
      playNoise(graph, 1.65, 0.62, 'highpass', 4800, 0.55)
      playTone(graph, 660, 250, 0.58, 0.12, 'square', -17)
      playTone(graph, 917, 338, 0.64, 0.1, 'square', 13)
      break
    case 'kick':
      playTone(graph, 152, 42, 0.18, 0.95, 'sine')
      playNoise(graph, 0.035, 0.18, 'lowpass', 1100, 0.5)
      break
  }
}

export function stopAudioGraph(graph: AudioGraph): void {
  for (const source of graph.activeSources) {
    try {
      source.stop()
    } catch {
      // A source may already have ended between unmount and cleanup.
    }
  }
  for (const node of graph.activeNodes) node.disconnect()
  graph.activeSources.clear()
  graph.activeNodes.clear()
  void graph.context.close()
}

export type { AudioGraph }
export { createGraph }
