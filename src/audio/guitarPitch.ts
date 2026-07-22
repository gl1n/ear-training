export const GUITAR_ANALYSER_SIZE = 4096
const GUITAR_MIN_FREQUENCY = 75
const GUITAR_MAX_FREQUENCY = 1400
const GUITAR_MIN_CLARITY = 0.85
const GUITAR_MAX_CENTS_ERROR = 40
export const GUITAR_MIN_RMS = 0.008
const GUITAR_HIGH_STRING_MIN_CLARITY = 0.78
const GUITAR_HIGH_STRING_MIN_RMS = 0.004

const HIGH_STRING_SENSITIVITY_START_HZ = 196
const HIGH_STRING_SENSITIVITY_FULL_HZ = 330

const STABLE_FRAME_COUNT = 3
const RELEASE_FRAME_COUNT = 4
const RELEASE_RMS_RATIO = 0.6

export type GuitarPitchReading = {
  frequency: number
  midi: number
  cents: number
  clarity: number
  rms: number
}

export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440)
}

export function guitarDetectionThresholds(frequency: number): { minClarity: number; minRms: number } {
  const highStringRatio = Math.min(1, Math.max(
    0,
    (frequency - HIGH_STRING_SENSITIVITY_START_HZ) /
      (HIGH_STRING_SENSITIVITY_FULL_HZ - HIGH_STRING_SENSITIVITY_START_HZ),
  ))
  return {
    minClarity: GUITAR_MIN_CLARITY +
      (GUITAR_HIGH_STRING_MIN_CLARITY - GUITAR_MIN_CLARITY) * highStringRatio,
    minRms: GUITAR_MIN_RMS +
      (GUITAR_HIGH_STRING_MIN_RMS - GUITAR_MIN_RMS) * highStringRatio,
  }
}

export function frequencyToGuitarPitch(
  frequency: number,
  clarity: number,
  rms: number,
): GuitarPitchReading | null {
  const thresholds = guitarDetectionThresholds(frequency)
  if (
    !Number.isFinite(frequency)
    || frequency < GUITAR_MIN_FREQUENCY
    || frequency > GUITAR_MAX_FREQUENCY
    || clarity < thresholds.minClarity
    || rms < thresholds.minRms
  ) {
    return null
  }

  const preciseMidi = frequencyToMidi(frequency)
  const midi = Math.round(preciseMidi)
  const cents = Math.round((preciseMidi - midi) * 100)
  if (Math.abs(cents) > GUITAR_MAX_CENTS_ERROR) return null

  return { frequency, midi, cents, clarity, rms }
}

export function calculateRms(buffer: Float32Array): number {
  let sum = 0
  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index]! ** 2
  }
  return Math.sqrt(sum / buffer.length)
}

/**
 * Stabilizes noisy frame-by-frame pitch readings and emits each pluck once.
 * Stability is tracked by pitch class so octave jumps on harmonic-rich guitar
 * notes do not prevent an otherwise stable note name from being submitted.
 */
export class GuitarPitchGate {
  private candidatePitchClass: number | null = null
  private candidateFrames = 0
  private releaseFrames = 0
  private emittedPitchClass: number | null = null

  update(reading: GuitarPitchReading | null, rms: number): GuitarPitchReading | null {
    if (!reading) {
      this.candidatePitchClass = null
      this.candidateFrames = 0
      if (rms < GUITAR_MIN_RMS * RELEASE_RMS_RATIO) {
        this.releaseFrames += 1
        if (this.releaseFrames >= RELEASE_FRAME_COUNT) this.emittedPitchClass = null
      } else {
        this.releaseFrames = 0
      }
      return null
    }

    this.releaseFrames = 0
    const pitchClass = ((reading.midi % 12) + 12) % 12
    if (pitchClass !== this.candidatePitchClass) {
      this.candidatePitchClass = pitchClass
      this.candidateFrames = 1
      return null
    }

    this.candidateFrames += 1
    if (
      this.candidateFrames < STABLE_FRAME_COUNT
      || pitchClass === this.emittedPitchClass
    ) {
      return null
    }

    this.emittedPitchClass = pitchClass
    return reading
  }

}
