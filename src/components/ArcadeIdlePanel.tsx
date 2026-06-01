import { useState } from 'react'
import type { Quiz } from '../quiz/intervals'
import type { ArcadeBestRecord } from '../quiz/arcadeBestRecord'
import { getQuizPitchKey, type WeakPriorityItem } from '../quiz/quizPriority'
import {
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import type { MistakeStatsStore } from '../quiz/mistakeStats'
import { MistakeDistributionChart } from './MistakeDistributionChart'
import { PlayAreaCard } from './PlayAreaCard'
import { PlayableIntervalCard } from './PlayableIntervalCard'
import { WeakPrioritySection } from './WeakPrioritySection'
import { Button } from './ui/Button'

type ArcadeIdlePanelProps = {
  lastQuiz: Quiz | null
  sessionStats: SessionStats
  bestRecord: ArcadeBestRecord | null
  mistakeStats: MistakeStatsStore
  rootMin: number
  rootMax: number
  weakPriorityItems: WeakPriorityItem[]
  isNewBestRecord?: boolean
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayQuiz: (quiz: Quiz) => void
  onResetStats: () => void
}

function hasPersistedStats(
  mistakeStats: MistakeStatsStore,
  weakPriorityItems: WeakPriorityItem[],
  bestRecord: ArcadeBestRecord | null,
): boolean {
  return mistakeStats.length > 0 || weakPriorityItems.length > 0 || bestRecord !== null
}

function ResetStatsButton({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3">
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">
          将清空失误分布、薄弱项和最佳记录，此操作不可撤销。
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} className="flex-1">
            取消
          </Button>
          <Button
            onClick={() => {
              onReset()
              setConfirming(false)
            }}
            className="flex-1 bg-red-500 hover:bg-red-400"
          >
            确认重置
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button variant="ghost" onClick={() => setConfirming(true)} className="w-full max-w-sm">
      重置统计数据
    </Button>
  )
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
  bestRecord,
  mistakeStats,
  rootMin,
  rootMax,
  weakPriorityItems,
  isNewBestRecord = false,
  replayingQuizKey,
  isReplayBusy,
  onPlayQuiz,
  onResetStats,
}: ArcadeIdlePanelProps) {
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)
  const showResetStats = hasPersistedStats(mistakeStats, weakPriorityItems, bestRecord)

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

        {showResetStats && <ResetStatsButton onReset={onResetStats} />}
      </PlayAreaCard>
    )
  }

  return (
    <PlayAreaCard className={showResetStats ? 'gap-6' : undefined}>
      <div className="text-center">
        <p className="text-sm font-medium">街机挑战</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          听音后点选答案 · 30 秒时限 · 答错或超时即结束
        </p>
      </div>
      <p className={`max-w-md text-base leading-relaxed text-[var(--text-secondary)] ${showResetStats ? '' : 'mt-8'}`}>
        点击「开始挑战」，在 30 秒内尽可能多答对；答错或超时即结束。
      </p>

      {showResetStats && <ResetStatsButton onReset={onResetStats} />}
    </PlayAreaCard>
  )
}
