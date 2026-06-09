import type { NoteKeyQuiz } from '../quiz/keys'
import type { NoteKeyMistakeStatsStore } from '../quiz/noteKeyMistakeStats'
import {
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { NoteKeyMistakeSummary } from './NoteKeyMistakeSummary'
import { PlayAreaCard } from './PlayAreaCard'
import { ResetStatsButton } from './ResetStatsButton'

type NoteKeyArcadeIdlePanelProps = {
  lastQuiz: NoteKeyQuiz | null
  sessionStats: SessionStats
  sessionMistakes: NoteKeyMistakeStatsStore
  trainingStats: TrainingStatsViewModel
  noteKeyReviewEnabled: boolean
  isRunning: boolean
  onNoteKeyReviewChange: (enabled: boolean) => void
}

function ScoreCard({ correctCount }: { correctCount: number }) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-4 text-center">
      <p className="text-3xl font-bold tabular-nums">{correctCount}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">正确答题</p>
    </div>
  )
}

export function NoteKeyArcadeIdlePanel({
  lastQuiz,
  sessionStats,
  sessionMistakes,
  trainingStats,
  noteKeyReviewEnabled,
  isRunning,
  onNoteKeyReviewChange,
}: NoteKeyArcadeIdlePanelProps) {
  const { noteKeyMistakeStats, noteKeyBestRecord, isNewNoteKeyBestRecord, canReset, reset } =
    trainingStats
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)
  const hasHistoricalMistakes = noteKeyMistakeStats.length > 0

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-red-400/90">挑战结束</p>
          {lastQuiz && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{lastQuiz.keyLabel}</p>
          )}
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            本次成绩
          </p>
          <ScoreCard correctCount={correctCount} />
        </div>

        {noteKeyBestRecord && (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                最佳记录
              </p>
              {isNewNoteKeyBestRecord && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  新纪录
                </span>
              )}
            </div>
            <ScoreCard correctCount={noteKeyBestRecord.correctCount} />
          </div>
        )}

        {lastQuiz && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            正确答案：音级 {lastQuiz.degree}
          </p>
        )}

        <NoteKeyMistakeSummary
          store={sessionMistakes}
          sessionStats={sessionStats}
          title="本局音级分布"
        />

        {canReset && <ResetStatsButton onReset={reset} />}
      </PlayAreaCard>
    )
  }

  return (
    <PlayAreaCard className="gap-6">
      <div className="text-center">
        <p className="text-sm font-medium">调内听音</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          每局随机大调 · 听音后选择音级 1–7 · 答错即结束
        </p>
      </div>
      <p className="max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
        点击「开始挑战」播放一级大三和弦定调，再点「开始」进入答题；听调内单音并选出对应音级，尽可能连对更多题。
      </p>

      <NoteKeyMistakeSummary store={noteKeyMistakeStats} title="历史错题统计" />

      <label
        className={`flex max-w-sm cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-3 ${
          !hasHistoricalMistakes || isRunning ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5"
          checked={noteKeyReviewEnabled}
          disabled={!hasHistoricalMistakes || isRunning}
          onChange={(event) => onNoteKeyReviewChange(event.target.checked)}
        />
        <span className="flex flex-col gap-1 text-left">
          <span className="text-sm font-medium">复习模式（优先出历史错题）</span>
          {!hasHistoricalMistakes && (
            <span className="text-xs text-[var(--text-secondary)]">暂无错题可复习</span>
          )}
        </span>
      </label>

      {canReset && <ResetStatsButton onReset={reset} />}
    </PlayAreaCard>
  )
}
