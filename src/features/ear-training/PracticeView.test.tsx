import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PracticeView } from './PracticeView'
import { EMPTY_SESSION_STATS, recordMelodyGroupResult } from '../../quiz/stats'

function renderPractice(arcadeMode: boolean, completedQuestions: number) {
  let stats = EMPTY_SESSION_STATS
  for (let i = 0; i < 12; i++) stats = recordMelodyGroupResult(stats, '1-3-5', i % 2 === 0, false)
  // Only the active melody branch is rendered; inactive modes need no handlers.
  const props = {
    mode: 'scaleDegree', state: 'answer_revealed', isRunning: true,
    settingsControls: { enabledIntervalIds: [] }, loadStatus: {},
    scaleDegreeGameStarted: true, scaleDegreeTrainingMode: 'melody',
    degreePractice: { scaleFlavor: 'major', melodyLength: 3, arcadeMode },
    sessionStats: stats, completedQuestions, sessionSize: 10,
    lastScaleDegreeQuiz: null, currentScaleDegreeQuiz: {
      sequenceType: 'melody', tonicMidi: 60, keyLabel: 'C 大调',
      noteMidis: [48, 64, 79], degrees: [1, 3, 5], noteMidi: 79, degree: 5, previousNoteMidi: null,
    },
  } as unknown as ComponentProps<typeof PracticeView>
  return renderToStaticMarkup(<PracticeView {...props} />).replace(/<[^>]+>/g, '')
}

describe('melody practice progress', () => {
  it('counts both correct and incorrect arcade phrases even though the fixed-session counter stays zero', () => {
    const text = renderPractice(true, 0)
    expect(text).toContain('12 组')
    expect(text).toContain('第 12 题')
    expect(text).not.toContain('加速中')
    expect(text).toContain('下一题')
    expect(text).toContain('收藏这句旋律')
  })

  it('keeps finite-session completion behavior', () => {
    expect(renderPractice(false, 10)).toContain('10 / 10')
    expect(renderPractice(false, 10)).toContain('查看结果')
  })
})
