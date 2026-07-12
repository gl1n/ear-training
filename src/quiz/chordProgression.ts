import type { Piano } from '../audio/piano'
import { delay } from '../utils/abort'

export type ChordDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type ChordKey = 'random' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export const CHORD_KEY_OPTIONS: { value: ChordKey; label: string }[] = [
  { value: 'random', label: '随机（每次开始）' },
  ...['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'].map(
    (name, value) => ({ value: value as ChordKey, label: `${name} 大调` }),
  ),
]

export function chordKeyLabel(pitchClass: number) {
  return CHORD_KEY_OPTIONS.find((option) => option.value === pitchClass)?.label ?? ''
}

export type PlayedChord = {
  degree: ChordDegree
  name: string
  midis: number[]
}

export type ChordRhythm = {
  bpm: number
  beatsPerChord: 1 | 2 | 4
  countInBeats: 0 | 4
  feel: 'sustain' | 'breathe'
}

const ROOT_OFFSETS = [0, 2, 4, 5, 7, 9, 11]
const TRIADS = [[0, 4, 7], [0, 3, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 3, 7], [0, 3, 6]]
const SEVENTHS = [11, 10, 10, 11, 10, 10, 10]
const DEGREE_NAMES = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']

function invert(notes: number[], times: number) {
  const result = [...notes]
  for (let index = 0; index < times; index += 1) result.push(result.shift()! + 12)
  return result
}

export function chordToneMelody(midis: number[], noteCount: number): number[] {
  if (midis.length === 0 || noteCount <= 0) return []

  // 七音与 add9 虽属于和弦，但放在持续和弦上方容易产生明显张力；旋律只取基础三和弦。
  const pitchClasses = [...new Set(midis.slice(0, 3).map((midi) => ((midi % 12) + 12) % 12))]
  const melodyFloor = Math.max(...midis) + 1
  const available = pitchClasses
    .flatMap((pitchClass) => {
      const first = melodyFloor + ((pitchClass - melodyFloor) % 12 + 12) % 12
      return [first, first + 12]
    })
    .filter((midi) => midi <= melodyFloor + 16)
    .sort((a, b) => a - b)

  // 固定向上琶音比每拍随机选音更容易形成清楚、稳定的旋律线。
  return Array.from({ length: noteCount }, (_, index) => available[index % available.length])
}

export function randomChordForDegree(degree: ChordDegree, tonic = 48): PlayedChord {
  const index = degree - 1
  const root = tonic + ROOT_OFFSETS[index]
  const triad = TRIADS[index]
  const choices = degree === 3 || degree === 7
    ? ['triad', 'seventh', 'inversion']
    : ['triad', 'seventh', 'add9', 'inversion']
  const choice = choices[Math.floor(Math.random() * choices.length)]
  let intervals = [...triad]
  let suffix = ''

  if (choice === 'seventh') {
    intervals.push(SEVENTHS[index])
    suffix = '7'
  } else if (choice === 'add9') {
    intervals.push(14)
    suffix = 'add9'
  } else if (choice === 'inversion') {
    const inversion = Math.random() < 0.5 ? 1 : 2
    intervals = invert(intervals.map((value) => root + value), inversion).map((midi) => midi - root)
    suffix = inversion === 1 ? '/3' : '/5'
  }

  return { degree, name: `${DEGREE_NAMES[index]}${suffix}`, midis: intervals.map((value) => root + value) }
}

export async function runChordProgressionLoop(
  piano: Piano,
  degrees: ChordDegree[],
  rhythm: ChordRhythm,
  callbacks: {
    onChord: (chord: PlayedChord, position: number) => void
    onBeat: (beat: number, isCountIn: boolean) => void
  },
  signal: AbortSignal,
  tonic = 48,
  melodyEnabled = false,
) {
  const beatMs = 60_000 / rhythm.bpm
  for (let beat = 1; beat <= rhythm.countInBeats; beat += 1) {
    callbacks.onBeat(beat, true)
    await delay(beatMs, signal)
  }

  let position = 0
  while (!signal.aborted) {
    const chord = randomChordForDegree(degrees[position], tonic)
    const melody = melodyEnabled
      ? chordToneMelody(chord.midis, Math.max(0, rhythm.beatsPerChord - 1))
      : []
    callbacks.onChord(chord, position)
    callbacks.onBeat(1, false)
    const breathing = rhythm.feel === 'breathe' && rhythm.beatsPerChord >= 4
    await piano.playNotes(
      chord.midis,
      (beatMs * (breathing ? 1.72 : rhythm.beatsPerChord * 0.92)) / 1000,
      78,
    )
    const chordStart = performance.now()
    for (let beat = 1; beat <= rhythm.beatsPerChord; beat += 1) {
      if (beat > 1) callbacks.onBeat(beat, false)
      if (melodyEnabled && beat > 1) {
        // 在和弦上方用组成音走一条短旋律，不改变当前和声的性质。
        await piano.playNote(melody[beat - 2], (beatMs * 0.72) / 1000, breathing ? 62 : 56)
      }
      const remaining = chordStart + beat * beatMs - performance.now()
      if (remaining > 0) await delay(remaining, signal)
    }
    position = (position + 1) % degrees.length
  }
}
