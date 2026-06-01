import type { Quiz } from '../quiz/intervals'
import { getQuizPitchKey } from '../quiz/quizPriority'
import {
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { MistakeDistributionChart } from './MistakeDistributionChart'
import { PlayAreaCard } from './PlayAreaCard'
import { PlayableIntervalCard } from './PlayableIntervalCard'
import { ResetStatsButton } from './ResetStatsButton'
import { WeakPrioritySection } from './WeakPrioritySection'

type ArcadeIdlePanelProps = {
  lastQuiz: Quiz | null
  sessionStats: SessionStats
  trainingStats: TrainingStatsViewModel
  rootMin: number
  rootMax: number
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayQuiz: (quiz: Quiz) => void
}

function ScoreCard({ correctCount }: { correctCount: number }) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-4 text-center">
      <p className="text-3xl font-bold tabular-nums">{correctCount}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">正确答题</p>
    </div>
  )
}

export function ArcadeIdlePanel({
  lastQuiz,
  sessionStats,
  trainingStats,
  rootMin,
  rootMax,
  replayingQuizKey,
  isReplayBusy,
  onPlayQuiz,
}: ArcadeIdlePanelProps) {
  const { mistakeStats, weakPriorityItems, bestRecord, isNewBestRecord, canReset, reset } =
    trainingStats
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-red-400/90">挑战结束</p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            本次成绩
          </p>
          <ScoreCard correctCount={correctCount} />
        </div>

        {bestRecord && (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                最佳记录
              </p>
              {isNewBestRecord && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  新纪录
                </span>
              )}
            </div>
            <ScoreCard correctCount={bestRecord.correctCount} />
          </div>
        )}

        <MistakeDistributionChart
          store={mistakeStats}
          rootMin={rootMin}
          rootMax={rootMax}
        />

        <WeakPrioritySection
          items={weakPriorityItems}
          replayingQuizKey={replayingQuizKey}
          isReplayBusy={isReplayBusy}
          onPlayQuiz={onPlayQuiz}
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
        <p className="text-sm font-medium">街机挑战</p>
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
