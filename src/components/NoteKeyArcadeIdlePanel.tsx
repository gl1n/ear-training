import type { NoteKeyQuiz } from '../quiz/keys'
import {
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { PlayAreaCard } from './PlayAreaCard'
import { ResetStatsButton } from './ResetStatsButton'

type NoteKeyArcadeIdlePanelProps = {
  lastQuiz: NoteKeyQuiz | null
  sessionStats: SessionStats
  trainingStats: TrainingStatsViewModel
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
  trainingStats,
}: NoteKeyArcadeIdlePanelProps) {
  const { noteKeyBestRecord, isNewNoteKeyBestRecord, canReset, reset } = trainingStats
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)

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

        {canReset && <ResetStatsButton onReset={reset} />}
      </PlayAreaCard>
    )
  }

  return (
    <PlayAreaCard className={canReset ? 'gap-6' : undefined}>
      <div className="text-center">
        <p className="text-sm font-medium">调内听音</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          每局随机大调 · 听音后选择音级 1–7 · 答错即结束
        </p>
      </div>
      <p
        className={`max-w-md text-base leading-relaxed text-[var(--text-secondary)] ${canReset ? '' : 'mt-8'}`}
      >
        点击「开始挑战」播放一级大三和弦定调，再点「开始」进入答题；听调内单音并选出对应音级，尽可能连对更多题。
      </p>

      {canReset && <ResetStatsButton onReset={reset} />}
    </PlayAreaCard>
  )
}
