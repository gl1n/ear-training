import { DEGREE_OPTION_IDS } from '../quiz/keys'
import type { NoteKeyQuiz } from '../quiz/keys'
import { LISTENING_STATES, type TrainerState } from '../quiz/sequencer'
import { getCorrectAnswerCount, type SessionStats } from '../quiz/stats'
import { Card } from './ui/Card'
import { SessionLoadStatus } from './SessionLoadStatus'

type NoteKeyArcadePlayfieldProps = {
  state: TrainerState
  sessionStats: SessionStats
  lastQuiz: NoteKeyQuiz | null
  currentKeyLabel: string | null
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onSelect: (degree: string) => void
  onRetry?: () => void
}

function getPhase(state: TrainerState) {
  if (state === 'loading') return 'loading' as const
  if (LISTENING_STATES.includes(state)) return 'listening' as const
  if (state === 'awaiting_answer') return 'answer' as const
  if (state === 'feedback_incorrect') return 'wrong' as const
  return 'idle' as const
}

function PhaseIndicator({ state }: { state: TrainerState }) {
  const phase = getPhase(state)

  if (phase === 'loading') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        加载音色…
      </span>
    )
  }

  if (phase === 'listening') {
    const label = state === 'playing_note' ? '目标音' : '聆听'
    return (
      <span className="inline-flex items-center gap-2.5">
        <span className="flex items-end gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-amber-400 animate-sound-bar"
              style={{ animationDelay: `${i * 0.15}s`, height: `${8 + i * 4}px` }}
            />
          ))}
        </span>
        <span className="text-sm font-medium text-amber-300">聆听 · {label}</span>
      </span>
    )
  }

  if (phase === 'answer') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-semibold text-amber-300 ring-1 ring-amber-400/40 animate-ready-pulse">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        选择音级
      </span>
    )
  }

  if (phase === 'wrong') {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-red-300">
        答错了
      </span>
    )
  }

  return null
}

export function NoteKeyArcadePlayfield({
  state,
  sessionStats,
  lastQuiz,
  currentKeyLabel,
  loadProgress,
  loadIndeterminate,
  loadError,
  onSelect,
  onRetry,
}: NoteKeyArcadePlayfieldProps) {
  const phase = getPhase(state)
  const canAnswer =
    state === 'awaiting_answer' || LISTENING_STATES.includes(state)
  const isWrong = state === 'feedback_incorrect'
  const correctCount = getCorrectAnswerCount(sessionStats)
  const currentQuestion = correctCount + (canAnswer || LISTENING_STATES.includes(state) ? 1 : 0)

  return (
    <Card variant="default" className="relative flex flex-1 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex flex-col gap-0.5">
          {currentKeyLabel && (
            <span className="text-sm font-semibold text-amber-200/90">{currentKeyLabel}</span>
          )}
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            第 {currentQuestion} 题
          </span>
          {correctCount > 0 && (
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              连对 {correctCount} 题
            </span>
          )}
        </div>
        <PhaseIndicator state={state} />
      </div>

      {loadError || state === 'loading' ? (
        <SessionLoadStatus
          state={state}
          loadProgress={loadProgress}
          loadIndeterminate={loadIndeterminate}
          loadError={loadError}
          onRetry={onRetry}
          variant="compact"
        />
      ) : null}

      <div
        className="grid flex-1 grid-cols-4 gap-2 sm:gap-2.5"
        role="group"
        aria-label="音级选项"
        aria-live="polite"
      >
        {DEGREE_OPTION_IDS.map((degree) => {
          const isReady = canAnswer
          const isListening = phase === 'listening'
          const isCorrectAnswer =
            isWrong && lastQuiz !== null && String(lastQuiz.degree) === degree

          return (
            <button
              key={degree}
              type="button"
              disabled={!canAnswer}
              onClick={() => onSelect(degree)}
              className={[
                'group relative flex min-h-[52px] flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-all duration-150',
                'disabled:cursor-not-allowed',
                isCorrectAnswer
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-400/30'
                  : isReady
                    ? 'border-amber-400/50 bg-amber-500/10 text-[var(--text-primary)] shadow-[0_0_20px_rgba(251,191,36,0.12)] hover:border-amber-400 hover:bg-amber-500/20 hover:shadow-[0_0_28px_rgba(251,191,36,0.2)] active:scale-[0.97]'
                    : isListening
                      ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] opacity-60'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] opacity-40',
              ].join(' ')}
            >
              <span className="text-xl font-bold leading-none sm:text-2xl">{degree}</span>
              <span
                className={`mt-1 text-[10px] leading-none transition-opacity sm:text-xs ${
                  isReady
                    ? 'text-amber-300/80 opacity-100'
                    : 'text-[var(--text-secondary)] opacity-0 group-hover:opacity-60 sm:opacity-50'
                }`}
              >
                音级
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
