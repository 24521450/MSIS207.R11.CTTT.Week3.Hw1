import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createGraph, playDrumVoice, stopAudioGraph } from '../audio'
import type { AudioGraph } from '../audio'
import type { PadId } from '../drums'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Trình duyệt không thể khởi tạo âm thanh.'
}

export function useAudioEngine(volume: number, muted: boolean) {
  const graphRef = useRef<AudioGraph | null>(null)
  const outputRef = useRef({ volume, muted })
  const [audioError, setAudioError] = useState<string | null>(null)

  useLayoutEffect(() => {
    outputRef.current = { volume, muted }
    const graph = graphRef.current
    if (graph) {
      const targetGain = muted ? 0 : Math.max(0, volume) * 0.36
      graph.masterGain.gain.setTargetAtTime(
        targetGain,
        graph.context.currentTime,
        0.025,
      )
    }
  }, [muted, volume])

  const play = useCallback(async (padId: PadId) => {
    try {
      const graph = graphRef.current ?? createGraph()
      graphRef.current = graph
      const { volume: currentVolume, muted: currentMuted } = outputRef.current
      graph.masterGain.gain.setTargetAtTime(
        currentMuted ? 0 : Math.max(0, currentVolume) * 0.36,
        graph.context.currentTime,
        0.025,
      )
      if (graph.context.state === 'suspended') await graph.context.resume()
      playDrumVoice(graph, padId)
      setAudioError(null)
    } catch (error) {
      setAudioError(errorMessage(error))
    }
  }, [])

  useEffect(
    () => () => {
      if (graphRef.current) stopAudioGraph(graphRef.current)
      graphRef.current = null
    },
    [],
  )

  return { graphRef, play, audioError }
}
