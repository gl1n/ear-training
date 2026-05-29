import { INTERVALS, midiToNoteName, type Quiz } from '../quiz/intervals'
import {
  formatResponseTime,
  getAverageResponseTimeMs,
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import { Card } from './ui/Card'
import { Chip } from './ui/Chip'

type ArcadeIdlePanelProps = {
  enabledIntervalIds: string[]
  lastQuiz: Quiz | null
  sessionStats: SessionStats
  isReplayingLastQuiz?: boolean
  onReplayLastQuiz?: () => void
}

function formatQuizNotes(quiz: Quiz): string {
  const lower = midiToNoteName(Math.min(quiz.root, quiz.second))
  const higher = midiToNoteName(Math.max(quiz.root, quiz.second))

  switch (quiz.direction) {
    case 'descending':
      return `${higher} → ${lower}`
    case 'harmonic':
      return `${lower} + ${higher}`
    default:
      return `${lower} → ${higher}`
  }
}

export function ArcadeIdlePanel({
  enabledIntervalIds,
  lastQuiz,
  sessionStats,
  isReplayingLastQuiz = false,
  onReplayLastQuiz,
}: ArcadeIdlePanelProps) {
  const selectedIntervals = INTERVALS.filter((interval) =>
    enabledIntervalIds.includes(interval.id),
  )
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)
  const avgResponseMs = getAverageResponseTimeMs(sessionStats)

  if (gameEnded) {
    return (
      <Card variant="default" className="flex flex-col gap-4">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-red-400/90">挑战结束</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            className="group w-full rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3 text-center transition hover:border-red-400/40 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-80"
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
      </Card>
    )
  }

  return (
    <Card variant="default" className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm font-medium">街机挑战</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          听音后点选答案 · 答错即结束 · 挑战连对记录
        </p>
      </div>

      {selectedIntervals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--text-secondary)]">本局音程池</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedIntervals.map((interval) => (
              <Chip key={interval.id} active>
                {interval.short}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
