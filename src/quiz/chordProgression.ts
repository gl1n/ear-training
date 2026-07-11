import type { Piano } from '../audio/piano'
import { delay } from '../utils/abort'

export type ChordDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7

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

export function randomChordForDegree(degree: ChordDegree, tonic = 48): PlayedChord {
  const index = degree - 1
  const root = tonic + ROOT_OFFSETS[index]
  const triad = TRIADS[index]
  const choices = degree === 7 ? ['triad', 'seventh', 'inversion'] : ['triad', 'seventh', 'add9', 'inversion']
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
) {
  const beatMs = 60_000 / rhythm.bpm
  for (let beat = 1; beat <= rhythm.countInBeats; beat += 1) {
    callbacks.onBeat(beat, true)
    await delay(beatMs, signal)
  }

  let position = 0
  while (!signal.aborted) {
    const chord = randomChordForDegree(degrees[position])
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
      if (breathing && beat === 3) {
        // 第三拍轻触上方声部，保留低音空间与自然释放。
        await piano.playNotes(chord.midis.slice(1), (beatMs * 1.65) / 1000, 56)
      }
      const remaining = chordStart + beat * beatMs - performance.now()
      if (remaining > 0) await delay(remaining, signal)
    }
    position = (position + 1) % degrees.length
  }
}
