import { DEGREE_OPTION_IDS, DEGREE_SOLFEGE_LABELS } from '../quiz/keys'
import type { ScaleDegreeQuiz } from '../quiz/keys'
import { LISTENING_STATES, type TrainerState } from '../quiz/sequencer'
import { getCorrectAnswerCount, getTotalScore, type SessionStats } from '../quiz/stats'
import { Card } from './ui/Card'
import {
  ScaleDegreeEncouragementToast,
  type ScaleDegreeEncouragement,
} from './ScaleDegreeEncouragementToast'
import { SessionLoadStatus } from './SessionLoadStatus'

function formatTotalScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

type ScaleDegreePlayfieldProps = {
  state: TrainerState
  sessionStats: SessionStats
  lastQuiz: ScaleDegreeQuiz | null
  currentKeyLabel: string | null
  encouragement: ScaleDegreeEncouragement | null
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
        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
        加载音色…
      </span>
    )
  }

  if (phase === 'listening') {
    const label = state === 'playing_note' ? '目标音' : '聆听'
    return (
      <span className="inline-flex items-center gap-2.5 rounded-full bg-sky-500/10 px-3 py-1 ring-1 ring-sky-400/20">
        <span className="flex items-end gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-sky-400 animate-sound-bar"
              style={{ animationDelay: `${i * 0.15}s`, height: `${8 + i * 4}px` }}
            />
          ))}
        </span>
        <span className="text-sm font-medium text-sky-200">聆听 · {label}</span>
      </span>
    )
  }

  if (phase === 'answer') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-3 py-1 text-sm font-semibold text-sky-200 ring-1 ring-sky-400/40 animate-ready-pulse-note-key">
        <span className="h-2 w-2 rounded-full bg-sky-400" />
        选择音级
      </span>
    )
  }

  if (phase === 'wrong') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-300 ring-1 ring-red-400/25">
        答错了
      </span>
    )
  }

  return null
}

function KeyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-gradient-to-r from-sky-500/15 to-cyan-500/10 px-3 py-1 text-sm font-semibold text-sky-100 note-key-glow">
      <span className="text-[10px] font-medium uppercase tracking-wider text-sky-300/80">调性</span>
      {label}
    </span>
  )
}

type DegreeButtonProps = {
  degree: string
  canAnswer: boolean
  isListening: boolean
  isCorrectAnswer: boolean
  onSelect: (degree: string) => void
}

function DegreeButton({
  degree,
  canAnswer,
  isListening,
  isCorrectAnswer,
  onSelect,
}: DegreeButtonProps) {
  const isReady = canAnswer

  return (
    <button
      type="button"
      disabled={!canAnswer}
      onClick={() => onSelect(degree)}
      className={[
        'group relative flex min-h-[56px] flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-all duration-150 sm:min-h-[64px]',
        'disabled:cursor-not-allowed',
        isCorrectAnswer
          ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-400/30'
          : isReady
            ? 'border-sky-400/50 bg-sky-500/10 text-[var(--text-primary)] shadow-[0_0_20px_rgba(56,189,248,0.12)] hover:border-sky-300 hover:bg-sky-500/20 hover:shadow-[0_0_28px_rgba(56,189,248,0.22)] active:scale-[0.97]'
            : isListening
              ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] opacity-70'
              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] opacity-40',
      ].join(' ')}
    >
      <span className="text-xl font-bold leading-none sm:text-2xl">{degree}</span>
      <span
        className={`mt-1 text-[10px] leading-none uppercase tracking-wide transition-opacity sm:text-xs ${
          isReady
            ? 'text-sky-200/80 opacity-100'
            : 'text-[var(--text-secondary)] opacity-0 group-hover:opacity-60 sm:opacity-50'
        }`}
      >
        {DEGREE_SOLFEGE_LABELS[degree as (typeof DEGREE_OPTION_IDS)[number]]}
      </span>
    </button>
  )
}

export function ScaleDegreePlayfield({
  state,
  sessionStats,
  lastQuiz,
  currentKeyLabel,
  encouragement,
  loadProgress,
  loadIndeterminate,
  loadError,
  onSelect,
  onRetry,
}: ScaleDegreePlayfieldProps) {
  const phase = getPhase(state)
  const canAnswer =
    state === 'awaiting_answer' || LISTENING_STATES.includes(state)
  const isWrong = state === 'feedback_incorrect'
  const correctCount = getCorrectAnswerCount(sessionStats)
  const totalScore = getTotalScore(sessionStats)
  const currentQuestion = correctCount + (canAnswer || LISTENING_STATES.includes(state) ? 1 : 0)
  const isListening = phase === 'listening'

  const renderDegree = (degree: string) => (
    <DegreeButton
      key={degree}
      degree={degree}
      canAnswer={canAnswer}
      isListening={isListening}
      isCorrectAnswer={isWrong && lastQuiz !== null && String(lastQuiz.degree) === degree}
      onSelect={onSelect}
    />
  )

  return (
    <Card
      variant="default"
      className="relative flex flex-1 flex-col gap-5 overflow-hidden p-4 sm:p-5"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-500/[0.06] to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {currentKeyLabel && <KeyBadge label={currentKeyLabel} />}
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              第 {currentQuestion} 题
            </span>
            {correctCount > 0 && (
              <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-xs tabular-nums text-sky-200/90 ring-1 ring-sky-400/20">
                连对 {correctCount}
              </span>
            )}
            {totalScore > 0 && (
              <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs tabular-nums text-amber-200/90 ring-1 ring-amber-400/20">
                得分 {formatTotalScore(totalScore)}
              </span>
            )}
          </div>
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

      {encouragement ? (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-4">
          <ScaleDegreeEncouragementToast
            key={encouragement.key}
            message={encouragement.message}
          />
        </div>
      ) : null}

      <div
        className="relative flex flex-1 flex-col justify-center gap-3"
        role="group"
        aria-label="音级选项"
        aria-live="polite"
      >
        <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          选择音级
        </p>

        <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:gap-2.5">
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {DEGREE_OPTION_IDS.slice(0, 4).map(renderDegree)}
          </div>
          <div className="grid grid-cols-3 gap-2 px-[12.5%] sm:gap-2.5">
            {DEGREE_OPTION_IDS.slice(4).map(renderDegree)}
          </div>
        </div>
      </div>
    </Card>
  )
}
