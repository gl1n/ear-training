import { afterEach, describe, expect, it, vi } from 'vitest'
import { runScaleDegreeLoop, createDefaultSettings, type ScaleDegreeCallbacks, type TrainerState } from './sequencer'
import { isMelodyScaleDegreeQuiz, type ScaleDegreeQuiz } from './keys'
import { degreeAnswer } from './degreePractice'
import type { Piano } from '../audio/piano'
import { createAnswerWaiter } from './createAnswerWaiter'

vi.mock('../audio/speech', () => ({ cancelSpeech: vi.fn(), speakText: vi.fn() }))

vi.mock('../utils/abort', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils/abort')>()
  return { ...original, delay: async (_ms: number, signal: AbortSignal) => {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  } }
})

afterEach(() => vi.restoreAllMocks())
function fixture() {
  const piano: Piano = { playNote: vi.fn(async () => {}), playNotes: vi.fn(async () => {}), stop: vi.fn() }
  const states: TrainerState[] = []
  let quiz: ScaleDegreeQuiz
  const callbacks: ScaleDegreeCallbacks = {
    onSessionStart: vi.fn(),
    onQuiz: (value) => { quiz = value },
    onStateChange: (state) => { states.push(state) },
    waitForGameStart: async () => {},
    waitForAnswer: vi.fn(async () => ({ selectedDegree: degreeAnswer(quiz) })),
    onAnswerSubmitted: vi.fn(() => true),
    onSequenceGroupSubmitted: vi.fn(() => true),
    onSequenceNoteResolved: vi.fn(),
  }
  return { piano, callbacks, states, getQuiz: () => quiz }
}

describe('scale degree loop integration', () => {
  it('plays the entire phrase before accepting it, rejects partial answers and waits at the final reveal', async () => {
    const { piano, callbacks, states, getQuiz } = fixture()
    let next!: () => void
    let reachedReveal!: () => void
    const atReveal = new Promise<void>((resolve) => { reachedReveal = resolve })
    callbacks.waitForNextQuestion = () => { reachedReveal(); return new Promise<void>((resolve) => { next = resolve }) }
    let attempts = 0
    callbacks.waitForAnswer = vi.fn(async () => {
      expect(piano.playNote).toHaveBeenCalledTimes(7)
      const quiz = getQuiz()
      if (!isMelodyScaleDegreeQuiz(quiz)) throw new Error('Expected melody')
      return { selectedDegree: attempts++ === 0 ? '1-2' : quiz.degrees.join('-'), wasReplayed: true }
    })
    let finished = false
    const loop = runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal, [], [], false, 'melody', { scaleFlavor: 'minor', melodyLength: 7, arcadeMode: false }).then(() => { finished = true })
    await atReveal
    expect(finished).toBe(false)
    expect(states.at(-1)).toBe('answer_revealed')
    expect(callbacks.onSequenceGroupSubmitted).toHaveBeenCalledExactlyOnceWith(getQuiz(), true, undefined, true)
    expect(callbacks.onAnswerSubmitted).not.toHaveBeenCalled()
    expect(callbacks.onSequenceNoteResolved).not.toHaveBeenCalled()
    expect(piano.playNotes).toHaveBeenCalledWith(expect.arrayContaining([getQuiz().tonicMidi + 4]), 2.4)
    next()
    await loop
    expect(finished).toBe(true)
  })

  it('uses only matching-length mistakes during review', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { piano, callbacks, getQuiz } = fixture()
    callbacks.waitForAnswer = async () => {
      const quiz = getQuiz()
      if (!isMelodyScaleDegreeQuiz(quiz)) throw new Error('Expected melody')
      expect(quiz.degrees).toEqual([7, 6, 5, 4, 3])
      return { selectedDegree: quiz.degrees.join('-') }
    }
    await runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal, [], [{ pattern: '1-2-3' }, { pattern: '7-6-5-4-3' }], true, 'melody', { scaleFlavor: 'major', melodyLength: 5, arcadeMode: false })
  })

  it('grades minor answers with accidentals and ignores major-only review records', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
    const { piano, callbacks, getQuiz } = fixture()
    await runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal, [{ previousNoteMidi: null, targetNoteMidi: 64, correctDegree: 3, wrongDegree: '2' }], [], true, 'single', { scaleFlavor: 'minor', melodyLength: 3, arcadeMode: false })
    expect(degreeAnswer(getQuiz())).toBe('♭3')
    expect(piano.playNotes).toHaveBeenCalledWith([getQuiz().tonicMidi, getQuiz().tonicMidi + 3, getQuiz().tonicMidi + 7], 2.4)
    expect(callbacks.onAnswerSubmitted).toHaveBeenCalledWith(getQuiz(), expect.objectContaining({ selectedDegree: '♭3' }), true)
  })

  it('aborts a pending whole-phrase answer without counting a question', async () => {
    const { piano, callbacks } = fixture()
    const controller = new AbortController()
    const refs = { answerResolverRef: { current: null }, answerCleanupRef: { current: null } }
    let ready!: () => void
    const waiting = new Promise<void>((resolve) => { ready = resolve })
    callbacks.waitForAnswer = (signal) => {
      const promise = createAnswerWaiter(refs)(signal)
      ready()
      return promise.then((selectedDegree) => ({ selectedDegree }))
    }
    const loop = runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, controller.signal, [], [], false, 'melody')
    const rejected = expect(loop).rejects.toMatchObject({ name: 'AbortError' })
    await waiting
    controller.abort()
    await rejected
    expect(callbacks.onSequenceGroupSubmitted).not.toHaveBeenCalled()
    expect(refs.answerResolverRef.current).toBeNull()
  })
})
