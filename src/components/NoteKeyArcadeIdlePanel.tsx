import type { NoteKeyQuiz } from '../quiz/keys'
import type { NoteKeyMistakeStatsStore } from '../quiz/noteKeyMistakeStats'
import {
  getCorrectAnswerCount,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { NoteKeyCorrectCountChart } from './NoteKeyCorrectCountChart'
import { NoteKeyMistakeSummary } from './NoteKeyMistakeSummary'
import { PlayAreaCard } from './PlayAreaCard'
import { ResetStatsButton } from './ResetStatsButton'
import { Button } from './ui/Button'

type NoteKeyArcadeIdlePanelProps = {
  lastQuiz: NoteKeyQuiz | null
  sessionStats: SessionStats
  sessionMistakes: NoteKeyMistakeStatsStore
  trainingStats: TrainingStatsViewModel
  noteKeyReviewEnabled: boolean
  isRunning: boolean
  onNoteKeyReviewChange: (enabled: boolean) => void
  onHome: () => void
}

const HOW_TO_STEPS = [
  { step: '1', title: '定调', desc: '播放 I 级大三和弦' },
  { step: '2', title: '听音', desc: '辨认调内单音' },
  { step: '3', title: '选级', desc: '点选 1–7 音级' },
] as const

function ScoreCard({
  correctCount,
  highlight = false,
}: {
  correctCount: number
  highlight?: boolean
}) {
  return (
    <div
      className={[
        'w-full max-w-sm rounded-2xl border px-5 py-5 text-center transition-colors',
        highlight
          ? 'border-sky-400/30 bg-gradient-to-b from-sky-500/15 to-sky-500/5 note-key-glow'
          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
      ].join(' ')}
    >
      <p
        className={`text-4xl font-bold tabular-nums ${highlight ? 'text-sky-100' : 'text-[var(--text-primary)]'}`}
      >
        {correctCount}
      </p>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        连对题数
      </p>
    </div>
  )
}

function HowToPlay() {
  return (
    <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
      {HOW_TO_STEPS.map(({ step, title, desc }, index) => (
        <div key={step} className="relative flex flex-col items-center">
          {index < HOW_TO_STEPS.length - 1 && (
            <span
              className="absolute left-[calc(50%+1.25rem)] top-5 hidden h-px w-[calc(100%-2.5rem)] bg-sky-400/20 sm:block"
              aria-hidden="true"
            />
          )}
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sm font-bold text-sky-200">
            {step}
          </span>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-secondary)]">{desc}</p>
        </div>
      ))}
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
  onHome,
}: NoteKeyArcadeIdlePanelProps) {
  const {
    noteKeyMistakeStats,
    noteKeySessionHistory,
    noteKeyBestRecord,
    isNewNoteKeyBestRecord,
    canReset,
    reset,
  } = trainingStats
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)
  const hasHistoricalMistakes = noteKeyMistakeStats.length > 0

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-7">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-red-300 ring-1 ring-red-400/20">
            挑战结束
          </span>
          {lastQuiz && (
            <p className="text-sm text-[var(--text-secondary)]">{lastQuiz.keyLabel}</p>
          )}
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            本次成绩
          </p>
          <ScoreCard correctCount={correctCount} highlight />
        </div>

        {noteKeySessionHistory.length >= 2 && (
          <NoteKeyCorrectCountChart
            records={noteKeySessionHistory}
            highlightLast
            bestCount={noteKeyBestRecord?.correctCount ?? null}
          />
        )}

        {noteKeyBestRecord && (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                最佳记录
              </p>
              {isNewNoteKeyBestRecord && (
                <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/25">
                  新纪录
                </span>
              )}
            </div>
            <ScoreCard correctCount={noteKeyBestRecord.correctCount} />
          </div>
        )}

        {lastQuiz && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">正确答案</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">
              音级 {lastQuiz.degree}
              <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                ({lastQuiz.keyLabel})
              </span>
            </p>
          </div>
        )}

        <NoteKeyMistakeSummary
          store={sessionMistakes}
          sessionStats={sessionStats}
          title="本局音级分布"
        />

        {canReset && <ResetStatsButton onReset={reset} />}

        <Button onClick={onHome} variant="ghost" className="w-full max-w-sm py-3">
          回到首页
        </Button>
      </PlayAreaCard>
    )
  }

  return (
    <PlayAreaCard className="gap-7">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sky-200">
          调内听音
        </span>
        <p className="max-w-sm text-base font-medium leading-relaxed text-[var(--text-primary)]">
          随机大调 · 听音选级 · 连对挑战
        </p>
        <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          答错即结束，尽可能连对更多题
        </p>
      </div>

      <HowToPlay />

      {noteKeySessionHistory.length >= 2 && (
        <NoteKeyCorrectCountChart
          records={noteKeySessionHistory}
          bestCount={noteKeyBestRecord?.correctCount ?? null}
        />
      )}

      <NoteKeyMistakeSummary store={noteKeyMistakeStats} title="历史错题统计" />

      <label
        className={[
          'flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors',
          noteKeyReviewEnabled
            ? 'border-sky-400/35 bg-sky-500/10'
            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-sky-400/20',
          !hasHistoricalMistakes || isRunning ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        <input
          type="checkbox"
          className="mt-0.5 accent-sky-500"
          checked={noteKeyReviewEnabled}
          disabled={!hasHistoricalMistakes || isRunning}
          onChange={(event) => onNoteKeyReviewChange(event.target.checked)}
        />
        <span className="flex flex-col gap-1 text-left">
          <span className="text-sm font-medium">复习模式</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {hasHistoricalMistakes
              ? '优先出历史错题，加强薄弱音级'
              : '暂无错题可复习'}
          </span>
        </span>
      </label>

      {canReset && <ResetStatsButton onReset={reset} />}
    </PlayAreaCard>
  )
}
