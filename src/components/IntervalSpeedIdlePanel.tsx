import type { Quiz } from '../quiz/intervals'
import { getQuizPitchKey } from '../quiz/intervals'
import { hasSessionAttempts, type SessionStats } from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { ChallengeSessionResults } from './practice/ChallengeSessionResults'
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

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-6">
        <ChallengeSessionResults
          accent="amber"
          sessionStats={sessionStats}
          isNewBestRecord={isNewIntervalSpeedBestRecord}
          bestRecord={intervalSpeedBestRecord}
        />

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
        <p className="text-sm font-medium">音程辨认</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          听音后点选答案 · 反应越快得分越高 · 答错即结束
        </p>
      </div>
      <p className={`max-w-md text-base leading-relaxed text-[var(--text-secondary)] ${canReset ? '' : 'mt-8'}`}>
        点击「开始挑战」，尽可能多连对；答错即结束，快速作答可获得更高加权分。
      </p>

      {canReset && <ResetStatsButton onReset={reset} />}
    </PlayAreaCard>
  )
}
