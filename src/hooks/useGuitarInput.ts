import { useCallback, useEffect, useRef, useState } from 'react'
import { PitchDetector } from 'pitchy'
import { createAudioContext } from '../audio/context'
import {
  guitarInputErrorMessage,
  type MicrophoneEnvironment,
} from '../audio/guitarInputError'
import {
  GUITAR_ANALYSER_SIZE,
  GuitarPitchGate,
  calculateRms,
  frequencyToGuitarPitch,
  type GuitarPitchReading,
} from '../audio/guitarPitch'

export type GuitarInputStatus = 'disabled' | 'starting' | 'listening' | 'error'

type UseGuitarInputOptions = {
  onPitch: (reading: GuitarPitchReading) => void
}

type DocumentWithFeaturePolicy = Document & {
  featurePolicy?: { allowsFeature: (feature: string) => boolean }
  permissionsPolicy?: { allowsFeature: (feature: string) => boolean }
}

async function inspectMicrophoneEnvironment(): Promise<MicrophoneEnvironment> {
  const policyDocument = document as DocumentWithFeaturePolicy
  const policy = policyDocument.permissionsPolicy ?? policyDocument.featurePolicy
  let policyAllowed: boolean | null = null
  let permissionState: PermissionState | null = null

  try {
    if (policy) policyAllowed = policy.allowsFeature('microphone')
  } catch {
    // Permissions Policy introspection is not supported consistently.
  }

  try {
    const permission = await navigator.permissions?.query(
      { name: 'microphone' as PermissionName },
    )
    permissionState = permission?.state ?? null
  } catch {
    // Safari and older browsers may not expose microphone through Permissions API.
  }

  return {
    mediaDevicesAvailable: Boolean(navigator.mediaDevices?.getUserMedia),
    permissionState,
    policyAllowed,
    secureContext: window.isSecureContext,
    topLevel: window.top === window,
  }
}

export function useGuitarInput({ onPitch }: UseGuitarInputOptions) {
  const [status, setStatus] = useState<GuitarInputStatus>('disabled')
  const [reading, setReading] = useState<GuitarPitchReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const onPitchRef = useRef(onPitch)
  const contextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTokenRef = useRef(0)

  useEffect(() => {
    onPitchRef.current = onPitch
  }, [onPitch])

  const stop = useCallback(() => {
    startTokenRef.current += 1
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (contextRef.current) void contextRef.current.close()
    contextRef.current = null
    setReading(null)
    setError(null)
    setStatus('disabled')
  }, [])

  const start = useCallback(async () => {
    if (status === 'starting' || status === 'listening') return

    const token = startTokenRef.current + 1
    startTokenRef.current = token
    setStatus('starting')
    setReading(null)
    setError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is unavailable')
      }

      const context = createAudioContext()
      contextRef.current = context
      void context.resume()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      })

      if (startTokenRef.current !== token) {
        stream.getTracks().forEach((track) => track.stop())
        void context.close()
        return
      }

      streamRef.current = stream
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = GUITAR_ANALYSER_SIZE
      analyser.smoothingTimeConstant = 0
      source.connect(analyser)

      const detector = PitchDetector.forFloat32Array(GUITAR_ANALYSER_SIZE)
      const buffer = new Float32Array(GUITAR_ANALYSER_SIZE)
      const gate = new GuitarPitchGate()
      let displayedMidi: number | null = null
      let quietFrames = 0

      const analyze = () => {
        analyser.getFloatTimeDomainData(buffer)
        const rms = calculateRms(buffer)
        const [frequency, clarity] = detector.findPitch(buffer, context.sampleRate)
        const nextReading = frequencyToGuitarPitch(frequency, clarity, rms)
        const stableReading = gate.update(nextReading, rms)

        if (nextReading) {
          quietFrames = 0
          if (nextReading.midi !== displayedMidi) {
            displayedMidi = nextReading.midi
            setReading(nextReading)
          }
        } else {
          quietFrames += 1
          if (quietFrames >= 8 && displayedMidi !== null) {
            displayedMidi = null
            setReading(null)
          }
        }

        if (stableReading) onPitchRef.current(stableReading)
        animationFrameRef.current = window.requestAnimationFrame(analyze)
      }

      setStatus('listening')
      analyze()
    } catch (caught) {
      if (startTokenRef.current !== token) return
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (contextRef.current) void contextRef.current.close()
      contextRef.current = null
      setStatus('error')
      const environment = await inspectMicrophoneEnvironment()
      const errorName = caught instanceof Error ? caught.name : ''
      setError(guitarInputErrorMessage(errorName, environment))
    }
  }, [status])

  useEffect(() => stop, [stop])

  return { status, reading, error, start, stop }
}
