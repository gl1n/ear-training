export const MODAL_SCALE_IDS = [
  'ionian',
  'aeolian',
  'dorian',
  'mixolydian',
  'phrygian',
  'lydian',
  'locrian',
] as const

export type ModalScaleId = (typeof MODAL_SCALE_IDS)[number]

export type ModalScale = {
  id: ModalScaleId
  label: string
  englishLabel: string
  formula: string
  intervals: readonly number[]
  color: string
}

export type ScalePhraseNote = {
  midi: number
  step: number
  durationSteps: number
  degreeLabel: string
}

export const MODAL_SCALES: Record<ModalScaleId, ModalScale> = {
  ionian: { id: 'ionian', label: '自然大调', englishLabel: 'Ionian', formula: '1 2 3 4 5 6 7', intervals: [0, 2, 4, 5, 7, 9, 11], color: '明亮、稳定' },
  dorian: { id: 'dorian', label: '多利亚', englishLabel: 'Dorian', formula: '1 2 ♭3 4 5 6 ♭7', intervals: [0, 2, 3, 5, 7, 9, 10], color: '小调色彩，明亮六级' },
  phrygian: { id: 'phrygian', label: '弗里几亚', englishLabel: 'Phrygian', formula: '1 ♭2 ♭3 4 5 ♭6 ♭7', intervals: [0, 1, 3, 5, 7, 8, 10], color: '紧张、异域感' },
  lydian: { id: 'lydian', label: '利底亚', englishLabel: 'Lydian', formula: '1 2 3 ♯4 5 6 7', intervals: [0, 2, 4, 6, 7, 9, 11], color: '明亮、悬浮感' },
  mixolydian: { id: 'mixolydian', label: '混合利底亚', englishLabel: 'Mixolydian', formula: '1 2 3 4 5 6 ♭7', intervals: [0, 2, 4, 5, 7, 9, 10], color: '大调色彩，松弛七级' },
  aeolian: { id: 'aeolian', label: '自然小调', englishLabel: 'Aeolian', formula: '1 2 ♭3 4 5 ♭6 ♭7', intervals: [0, 2, 3, 5, 7, 8, 10], color: '柔和、忧郁' },
  locrian: { id: 'locrian', label: '洛克里亚', englishLabel: 'Locrian', formula: '1 ♭2 ♭3 4 ♭5 ♭6 ♭7', intervals: [0, 1, 3, 5, 6, 8, 10], color: '不稳定、暗色' },
}

export const SCALE_PHRASE_STEPS = 16
export const SCALE_COUNT_IN_STEPS = 8
export const SCALE_TONIC_MIN_MIDI = 55
export const SCALE_TONIC_MAX_MIDI = 66

const ASCENDING_DEGREE_LABELS = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do'] as const

export function createScalePhrase(tonicMidi: number, scaleId: ModalScaleId): ScalePhraseNote[] {
  const scale = MODAL_SCALES[scaleId]
  const ascending = [...scale.intervals, 12]
  const intervals = [...ascending, ...scale.intervals.slice(1).reverse(), 0]
  const degreeLabels = [
    ...ASCENDING_DEGREE_LABELS,
    ...ASCENDING_DEGREE_LABELS.slice(1, -1).reverse(),
    'do',
  ]

  return intervals.map((interval, step) => ({
    midi: tonicMidi + interval,
    step,
    durationSteps: step === intervals.length - 1 ? 2 : 0.86,
    degreeLabel: degreeLabels[step]!,
  }))
}

export function shuffleTonicPitchClasses(
  random: () => number = Math.random,
  previousPitchClass?: number,
): number[] {
  const pitchClasses = Array.from({ length: 12 }, (_, pitchClass) => pitchClass)
  for (let index = pitchClasses.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(Math.max(0, random()) * (index + 1)))
    ;[pitchClasses[index], pitchClasses[swapIndex]] = [pitchClasses[swapIndex]!, pitchClasses[index]!]
  }

  if (previousPitchClass !== undefined && pitchClasses[0] === previousPitchClass) {
    ;[pitchClasses[0], pitchClasses[1]] = [pitchClasses[1]!, pitchClasses[0]!]
  }
  return pitchClasses
}

export function tonicMidiForPitchClass(pitchClass: number): number {
  const candidates: number[] = []
  for (let midi = SCALE_TONIC_MIN_MIDI; midi <= SCALE_TONIC_MAX_MIDI; midi += 1) {
    if (midi % 12 === pitchClass) candidates.push(midi)
  }
  return candidates.sort((a, b) => Math.abs(a - 60) - Math.abs(b - 60))[0]!
}

export function isModalScaleId(value: unknown): value is ModalScaleId {
  return MODAL_SCALE_IDS.includes(value as ModalScaleId)
}
