import type { Quiz } from '../quiz/intervals'
import { getQuizPitchKey } from '../quiz/intervals'
import {
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { ChallengeEndedSection, ChallengeScoreCard } from './practice/ChallengeEndedSection'
import { MistakeDistributionChart } from './MistakeDistributionChart'
import { PlayAreaCard } from './PlayAreaCard'
import { PlayableIntervalCard } from './PlayableIntervalCard'
import { ResetStatsButton } from './ResetStatsButton'

type IntervalSpeedIdlePanelProps = {
  lastQuiz: Quiz | null
  sessionStats: SessionStats
  trainingStats: TrainingStatsViewModel
  rootMin: number
  rootMax: number
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayQuiz: (quiz: Quiz) => void
}

export function IntervalSpeedIdlePanel({
  lastQuiz,
  sessionStats,
  trainingStats,
  rootMin,
  rootMax,
  replayingQuizKey,
  isReplayBusy,
  onPlayQuiz,
}: IntervalSpeedIdlePanelProps) {
  const { mistakeStats, intervalSpeedBestRecord, isNewIntervalSpeedBestRecord, canReset, reset } =
    trainingStats
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-6">
        <ChallengeEndedSection
          accent="amber"
          isNewBestRecord={isNewIntervalSpeedBestRecord}
          bestRecord={intervalSpeedBestRecord}
          bestRecordLabel="正确答题"
        >
          <ChallengeScoreCard value={correctCount} label="正确答题" />
        </ChallengeEndedSection>

        <MistakeDistributionChart
          store={mistakeStats}
          rootMin={rootMin}
          rootMax={rootMax}
          onPlayQuiz={onPlayQuiz}
          replayingQuizKey={replayingQuizKey}
          isReplayBusy={isReplayBusy}
        />

        {lastQuiz && (
          <PlayableIntervalCard
            quiz={lastQuiz}
            variant="prominent"
            subtitle="正确答案"
            isPlaying={replayingQuizKey === getQuizPitchKey(lastQuiz)}
            disabled={isReplayBusy && replayingQuizKey !== getQuizPitchKey(lastQuiz)}
            onPlay={() => onPlayQuiz(lastQuiz)}
          />
        )}

        {canReset && <ResetStatsButton onReset={reset} />}
      </PlayAreaCard>
    )
  }

  return (
    <PlayAreaCard className={canReset ? 'gap-6' : undefined}>
      <div className="text-center">
        <p className="text-sm font-medium">音程竞速</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          听音后点选答案 · 30 秒时限 · 答错或超时即结束
        </p>
      </div>
      <p className={`max-w-md text-base leading-relaxed text-[var(--text-secondary)] ${canReset ? '' : 'mt-8'}`}>
        点击「开始挑战」，在 30 秒内尽可能多答对；答错或超时即结束。
      </p>

      {canReset && <ResetStatsButton onReset={reset} />}
    </PlayAreaCard>
  )
}
