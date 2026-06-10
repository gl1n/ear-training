import { describe, expect, it, vi } from 'vitest'
import { resolveAnswerWithCorrection } from './challengeLoopHelpers'

type TestAnswer = {
  selectedId: string
  reactionMs?: number
}

function createOptions(overrides: {
  firstAnswer: TestAnswer
  retryAnswer?: TestAnswer
  isCorrect?: (answer: TestAnswer) => boolean
}) {
  const { firstAnswer, retryAnswer = { selectedId: 'P5' }, isCorrect } = overrides
  const onEnterCorrection = vi.fn()
  const waitForAnswer = vi.fn(async () => retryAnswer)

  const defaultIsCorrect = (answer: TestAnswer) => answer.selectedId === 'M3'

  return {
    firstAnswer,
    isCorrect: isCorrect ?? defaultIsCorrect,
    isEmpty: (answer: TestAnswer) => answer.selectedId === '',
    getSelection: (answer: TestAnswer) => answer.selectedId,
    mergeRetrySelection: (first: TestAnswer, retry: TestAnswer) => ({
      ...first,
      selectedId: retry.selectedId,
    }),
    waitForAnswer,
    onEnterCorrection,
  }
}

describe('resolveAnswerWithCorrection', () => {
  it('returns immediately when the first answer is correct', async () => {
    const options = createOptions({
      firstAnswer: { selectedId: 'M3', reactionMs: 500 },
    })

    const result = await resolveAnswerWithCorrection(options)

    expect(result).toEqual({ answer: { selectedId: 'M3', reactionMs: 500 }, correct: true })
    expect(options.onEnterCorrection).not.toHaveBeenCalled()
    expect(options.waitForAnswer).not.toHaveBeenCalled()
  })

  it('returns immediately when the first answer is empty', async () => {
    const options = createOptions({
      firstAnswer: { selectedId: '' },
    })

    const result = await resolveAnswerWithCorrection(options)

    expect(result).toEqual({ answer: { selectedId: '' }, correct: false })
    expect(options.onEnterCorrection).not.toHaveBeenCalled()
    expect(options.waitForAnswer).not.toHaveBeenCalled()
  })

  it('enters correction and succeeds while preserving first reactionMs', async () => {
    const options = createOptions({
      firstAnswer: { selectedId: 'P5', reactionMs: 420 },
      retryAnswer: { selectedId: 'M3', reactionMs: 900 },
    })

    const result = await resolveAnswerWithCorrection(options)

    expect(result).toEqual({ answer: { selectedId: 'M3', reactionMs: 420 }, correct: true })
    expect(options.onEnterCorrection).toHaveBeenCalledWith('P5')
    expect(options.waitForAnswer).toHaveBeenCalledOnce()
  })

  it('enters correction and fails on the second wrong answer', async () => {
    const options = createOptions({
      firstAnswer: { selectedId: 'P5', reactionMs: 420 },
      retryAnswer: { selectedId: 'M2', reactionMs: 880 },
    })

    const result = await resolveAnswerWithCorrection(options)

    expect(result).toEqual({ answer: { selectedId: 'M2', reactionMs: 880 }, correct: false })
    expect(options.onEnterCorrection).toHaveBeenCalledWith('P5')
    expect(options.waitForAnswer).toHaveBeenCalledOnce()
  })
})
