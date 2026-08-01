import { describe, expect, it } from 'vitest'
import {
  CHORD_TONE_ROOTS,
  buildChordToneQuestion,
  classifyChordToneAnswer,
  createChordToneQuestion,
  formatChordToneReactionMs,
} from './chordTonePlay'

describe('chord tone pair questions', () => {
  it('builds the requested third and seventh for each chord quality', () => {
    const c = CHORD_TONE_ROOTS[0]!

    expect(buildChordToneQuestion(c, 'maj7').tones).toMatchObject({
      3: { noteName: 'E', pitchClass: 4, degreeLabel: '3 音' },
      7: { noteName: 'B', pitchClass: 11, degreeLabel: '7 音' },
    })
    expect(buildChordToneQuestion(c, '7').tones[7]).toMatchObject({
      noteName: 'B♭', pitchClass: 10, degreeLabel: '♭7 音',
    })
    expect(buildChordToneQuestion(c, 'm7').tones[3]).toMatchObject({
      noteName: 'E♭', pitchClass: 3, degreeLabel: '♭3 音',
    })
    expect(buildChordToneQuestion(c, 'm7b5').tones[5]).toMatchObject({
      noteName: 'G♭', pitchClass: 6, degreeLabel: '♭5 音',
    })
  })

  it('preserves harmonic spelling instead of replacing it with enharmonic notes', () => {
    const cSharp = CHORD_TONE_ROOTS[1]!
    const question = buildChordToneQuestion(cSharp, 'maj7')

    expect(question.symbol).toBe('C♯maj7')
    expect(question.tones[3].noteName).toBe('E♯')
    expect(question.tones[7].noteName).toBe('B♯')
  })

  it('accepts target tones in any octave and distinguishes other chord tones', () => {
    const question = buildChordToneQuestion(CHORD_TONE_ROOTS[0]!, 'maj7')

    expect(classifyChordToneAnswer(question, 52)).toMatchObject({ kind: 'target', tone: { degree: '3' } })
    expect(classifyChordToneAnswer(question, 71)).toMatchObject({ kind: 'target', tone: { degree: '7' } })
    expect(classifyChordToneAnswer(question, 67)).toMatchObject({ kind: 'other-chord-tone', tone: { degree: '5' } })
    expect(classifyChordToneAnswer(question, 65)).toEqual({ kind: 'outside', pitchClass: 5 })
  })

  it('avoids repeating the same question immediately', () => {
    const first = createChordToneQuestion(() => 0)
    const next = createChordToneQuestion(() => 0, first.id)

    expect(first.id).toBe('0:maj7')
    expect(next.id).not.toBe(first.id)
  })

  it('formats completed-question reaction time in seconds', () => {
    expect(formatChordToneReactionMs(2_349)).toBe('2.3s')
    expect(formatChordToneReactionMs(null)).toBe('—')
  })
})
