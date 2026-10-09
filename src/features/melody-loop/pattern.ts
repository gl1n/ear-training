export type Pitch = { degree: number; accidental: number; octave: number }
export type Note = Pitch & { step: number; length: number }
const DEGREE_OFFSETS = [0, 2, 4, 5, 7, 9, 11]
export const noteMidi = (note: Pitch, tonic: number) => tonic + DEGREE_OFFSETS[note.degree - 1] + note.accidental + note.octave * 12
export const noteLabel = (note: Pitch) => `${note.accidental < 0 ? '♭' : note.accidental > 0 ? '♯' : ''}${note.degree}${note.octave > 0 ? ` 高 ${note.octave} 个八度` : note.octave < 0 ? ` 低 ${-note.octave} 个八度` : ''}`
export function randomTonic(previous?: number, random = Math.random): number {
  const choices = Array.from({ length: 12 }, (_, i) => 60 + i).filter((n) => n !== previous)
  return choices[Math.floor(random() * choices.length)]
}
export type Pattern = { beats: number; bars: number; bpm: number; notes: Note[] }
export const initialPattern: Pattern = {
  beats: 4, bars: 2, bpm: 100,
  notes: [1, 3, 5, 3, 2, 4, 5, 1].map((degree, i) => ({ step: i * 4, degree, accidental: 0, octave: i === 7 ? 1 : 0, length: 4 })),
}
export const totalSteps = (pattern: Pattern) => pattern.beats * pattern.bars * 4
export function resizePattern(pattern: Pattern, beats: number, bars: number): Pattern {
  const limit = beats * bars * 4
  // Preserve positions within each bar when changing time signature.
  const notes = pattern.notes.flatMap((note) => {
    const bar = Math.floor(note.step / (pattern.beats * 4))
    const offset = note.step % (pattern.beats * 4)
    const step = bar * beats * 4 + offset
    return bar >= bars || offset >= beats * 4 ? [] : [{ ...note, step, length: Math.min(note.length, beats * 4 - offset, limit - step) }]
  })
  return { ...pattern, beats, bars, notes }
}
export function putNote(pattern: Pattern, note: Note): Pattern {
  const next = pattern.notes.find((n) => n.step > note.step)
  const barEnd = (Math.floor(note.step / (pattern.beats * 4)) + 1) * pattern.beats * 4
  const length = Math.min(note.length, (next?.step ?? totalSteps(pattern)) - note.step, barEnd - note.step)
  // Inserting into a sustained note keeps its leading portion. Existing later
  // onsets limit the new duration instead of being erased by it.
  const notes = pattern.notes.filter((n) => n.step !== note.step).map((n) =>
    n.step < note.step && n.step + n.length > note.step
      ? { ...n, length: note.step - n.step }
      : n,
  )
  return { ...pattern, notes: [...notes, { ...note, length }].sort((a, b) => a.step - b.step) }
}
export function isPattern(value: unknown): value is Pattern {
  if (!value || typeof value !== 'object') return false
  const p = value as Pattern
  if (![2, 3, 4, 5, 6].includes(p.beats) || !Number.isInteger(p.bars) || p.bars < 1 || p.bars > 8 || !Number.isInteger(p.bpm) || p.bpm < 40 || p.bpm > 240 || !Array.isArray(p.notes)) return false
  let end = 0
  return p.notes.every((n) => {
    if (!n || !Number.isInteger(n.step) || n.step < end || !Number.isInteger(n.length) || n.length < 1 || n.step + n.length > totalSteps(p) || !Number.isInteger(n.degree) || n.degree < 1 || n.degree > 7 || ![-1, 0, 1].includes(n.accidental) || ![-2, -1, 0, 1, 2].includes(n.octave)) return false
    end = n.step + n.length
    return true
  })
}
// Migrate the previous absolute-pitch editor using C4 as do.
export function migratePattern(value: unknown): Pattern | null {
  if (isPattern(value)) return value
  if (!value || typeof value !== 'object') return null
  const old = value as { notes?: unknown[] }
  if (!Array.isArray(old.notes)) return null
  const notes = old.notes.map((entry) => {
    if (!entry || typeof entry !== 'object') return null
    const n = entry as { midi: number; step: number; length: number }
    if (!Number.isInteger(n.midi) || n.midi < 48 || n.midi > 84) return null
    const pitchClass = n.midi % 12
    const degreeIndex = DEGREE_OFFSETS.findLastIndex((offset) => offset <= pitchClass)
    return { step: n.step, length: n.length, degree: degreeIndex + 1, accidental: pitchClass - DEGREE_OFFSETS[degreeIndex], octave: Math.floor(n.midi / 12) - 5 }
  })
  const migrated = { ...value, notes }
  return isPattern(migrated) ? migrated : null
}

