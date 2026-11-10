import { afterEach, describe, expect, it, vi } from 'vitest'
import { runScaleDegreeLoop, createDefaultSettings, type ScaleDegreeCallbacks, type TrainerState } from './sequencer'
import { isMelodyScaleDegreeQuiz, type ScaleDegreeQuiz } from './keys'
import { loadMelodyFavorites, saveMelodyFavorite } from './melodyFavorites'
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

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
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
    const loop = runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal, [], false, 'melody', { scaleFlavor: 'minor', melodyLength: 7, arcadeMode: false }).then(() => { finished = true })
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

  it('draws only from favorites and aligns the saved pitches to the session key regardless of length', async () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    })
    saveMelodyFavorite({ sequenceType: 'melody', tonicMidi: 60, keyLabel: 'C 大调',
      noteMidis: [48, 64, 79], noteMidi: 79, degrees: [1, 3, 5], degree: 5,
      previousNoteMidi: null, noteBeats: [0.5, 1.5, 1], mastered: true })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const { piano, callbacks, getQuiz } = fixture()
    callbacks.waitForAnswer = async () => {
      const quiz = getQuiz()
      if (!isMelodyScaleDegreeQuiz(quiz)) throw new Error('Expected melody')
      expect(quiz.degrees).toEqual([1, 3, 5])
      expect(quiz.noteMidis).toEqual([quiz.tonicMidi - 12, quiz.tonicMidi + 4, quiz.tonicMidi + 19])
      expect(quiz.noteBeats).toEqual([0.5, 1.5, 1])
      return { selectedDegree: quiz.degrees.join('-') }
    }
    await runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal, [], true, 'melody', { scaleFlavor: 'major', melodyLength: 5, arcadeMode: false })
    expect(loadMelodyFavorites()[0]?.reviewStats).toEqual({ attempts: 1, incorrect: 0 })
    callbacks.waitForAnswer = async () => ({ selectedDegree: '2-3-5' })
    await runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal, [], true, 'melody', { scaleFlavor: 'major', melodyLength: 5, arcadeMode: false })
    expect(loadMelodyFavorites()[0]?.reviewStats).toEqual({ attempts: 2, incorrect: 1 })
  })

  it('does not silently generate new questions when the favorite collection is empty', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    const { piano, callbacks } = fixture()
    await expect(runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal,
      [], true, 'melody')).rejects.toThrow('还没有收藏的旋律')
    expect(piano.playNotes).not.toHaveBeenCalled()
  })

  it('grades minor answers with accidentals and ignores major-only review records', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
    const { piano, callbacks, getQuiz } = fixture()
    await runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, new AbortController().signal, [{ previousNoteMidi: null, targetNoteMidi: 64, correctDegree: 3, wrongDegree: '2' }], true, 'single', { scaleFlavor: 'minor', melodyLength: 3, arcadeMode: false })
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
    const loop = runScaleDegreeLoop(piano, createDefaultSettings('fast'), callbacks, controller.signal, [], false, 'melody')
    const rejected = expect(loop).rejects.toMatchObject({ name: 'AbortError' })
    await waiting
    controller.abort()
    await rejected
    expect(callbacks.onSequenceGroupSubmitted).not.toHaveBeenCalled()
    expect(refs.answerResolverRef.current).toBeNull()
  })
})

it('replays the original rhythm and tempo even when the current speed changes', async () => {
  const { replayMelodyScaleDegreeQuiz } = await import('./sequencer')
  const { piano } = fixture()
  const quiz = {
    tonicMidi: 60, noteMidi: 79, degree: 5, keyLabel: 'C 大调', previousNoteMidi: null,
    sequenceType: 'melody' as const, noteMidis: [48, 64, 79], degrees: [1, 3, 5],
    noteBeats: [0.5, 1.5, 1], playbackTiming: { noteDurationMs: 700, gapMs: 150 },
  }
  await replayMelodyScaleDegreeQuiz(piano, quiz, { noteDurationMs: 300, gapMs: 80 }, new AbortController().signal)
  expect(vi.mocked(piano.playNote).mock.calls.map(([midi, seconds]) => [midi, seconds])).toEqual([[48, 0.35], [64, 1.05], [79, 0.7]])
})

it('shows each speed milestone once per run and keeps the displayed speed tied to the playing question', async () => {
  const { piano, callbacks, getQuiz } = fixture()
  const settings = createDefaultSettings('fast')
  const milestones = vi.fn()
  callbacks.onSpeedMilestone = milestones
  let answered = 0
  callbacks.onSequenceGroupSubmitted = () => ++answered === 30
  callbacks.waitForAnswer = async () => {
    const quiz = getQuiz()
    if (!isMelodyScaleDegreeQuiz(quiz)) throw new Error('Expected melody')
    expect(quiz.playbackSpeedMultiplier).toBeCloseTo(settings.noteDurationMs / quiz.playbackTiming!.noteDurationMs)
    if (answered === 0) expect(quiz.playbackSpeedMultiplier).toBe(1)
    // Drop below the first milestone, then cross it again.
    return { selectedDegree: answered === 6 ? quiz.degrees.map((degree) => degree === 1 ? 2 : 1).join('-') : quiz.degrees.join('-') }
  }
  const run = (arcadeMode: boolean) => runScaleDegreeLoop(piano, settings, callbacks, new AbortController().signal, [], false, 'melody', { scaleFlavor: 'major', melodyLength: 3, arcadeMode })
  await run(true)
  expect(milestones).toHaveBeenCalledTimes(4)
  expect(new Set(milestones.mock.calls.map(([message]) => message)).size).toBe(4)
  answered = 0
  milestones.mockClear()
  await run(true)
  expect(milestones).toHaveBeenCalledTimes(4)
  answered = 0
  milestones.mockClear()
  await run(false)
  expect(milestones).not.toHaveBeenCalled()
})
