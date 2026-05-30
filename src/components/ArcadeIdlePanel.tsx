import type { Quiz } from '../quiz/intervals'
import { formatQuizNotes } from '../lib/formatQuiz'
import {
  formatResponseTime,
  getAverageResponseTimeMs,
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import { PlayAreaCard } from './PlayAreaCard'

type ArcadeIdlePanelProps = {
  lastQuiz: Quiz | null
  sessionStats: SessionStats
  isReplayingLastQuiz?: boolean
  onReplayLastQuiz?: () => void
}

export function ArcadeIdlePanel({
  lastQuiz,
  sessionStats,
  isReplayingLastQuiz = false,
  onReplayLastQuiz,
}: ArcadeIdlePanelProps) {
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)
  const avgResponseMs = getAverageResponseTimeMs(sessionStats)

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-red-400/90">挑战结束</p>
        </div>

        <div className="grid w-full max-w-sm grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-4 text-center">
            <p className="text-3xl font-bold tabular-nums">{correctCount}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">正确答题</p>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-4 text-center">
            <p className="text-3xl font-bold tabular-nums">
              {avgResponseMs !== null ? formatResponseTime(avgResponseMs) : '—'}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">平均反应时间</p>
          </div>
        </div>

        {lastQuiz && (
          <button
            type="button"
            onClick={onReplayLastQuiz}
            disabled={isReplayingLastQuiz || !onReplayLastQuiz}
            className="group w-full max-w-sm rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3 text-center transition hover:border-red-400/40 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-80"
            aria-label="重听错题"
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 transition ${
                  isReplayingLastQuiz ? 'animate-pulse-ring' : 'group-hover:bg-red-500/25'
                }`}
                aria-hidden="true"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18V6l10 6-10 6z"
                    fill="currentColor"
                    className="text-red-300"
                  />
                </svg>
              </span>
              <p className="text-xs text-[var(--text-secondary)]">
                {isReplayingLastQuiz ? '播放中…' : '点击重听'}
              </p>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">正确答案</p>
            <p className="mt-1 text-2xl font-bold">{lastQuiz.interval.name}</p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{formatQuizNotes(lastQuiz)}</p>
          </button>
        )}
      </PlayAreaCard>
    )
  }

  return (
    <PlayAreaCard>
      <div className="text-center">
        <p className="text-sm font-medium">街机挑战</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          听音后点选答案 · 答错即结束 · 挑战连对记录
        </p>
      </div>
      <p className="mt-8 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
        点击「开始挑战」，听音后选择答案；答错即结束，可查看各音程统计。
      </p>
    </PlayAreaCard>
  )
}
