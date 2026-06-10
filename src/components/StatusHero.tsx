import type { Quiz } from '../quiz/intervals'
import { formatQuizDirection, formatQuizNotes } from '../lib/formatQuiz'
import type { TrainerState } from '../quiz/sequencer'
import { PlayAreaCard } from './PlayAreaCard'
import { SessionLoadStatus } from './SessionLoadStatus'

type StatusHeroProps = {
  state: TrainerState
  lastQuiz: Quiz | null
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onRetry?: () => void
}

const STATE_LABELS: Record<TrainerState, string> = {
  idle: '准备就绪',
  loading: '正在加载钢琴音色…',
  playing_root: '播放第一音…',
  playing_second: '播放第二音…',
  playing_harmonic: '播放和弦…',
  playing_tonic_chord: '播放定调和弦…',
  playing_note: '播放目标音…',
  pause: '请听辨音程…',
  speaking: '播报答案…',
  gap: '下一题准备中…',
  awaiting_answer: '请选择音程',
  answer_correction: '请重新选择',
  feedback_incorrect: '回答错误',
}

function StateIcon({ state }: { state: TrainerState }) {
  const baseClass = 'flex h-16 w-16 items-center justify-center rounded-full'

  switch (state) {
    case 'playing_root':
    case 'playing_second':
    case 'playing_harmonic':
      return (
        <div className={`${baseClass} animate-pulse-ring bg-[var(--accent-muted)]`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 18V6l10 6-10 6z"
              fill="var(--accent)"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
    case 'pause':
      return (
        <div className={`${baseClass} bg-[var(--accent-muted)] ring-2 ring-sky-400/50`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v10M9 12h6"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )
    case 'speaking':
      return (
        <div className={`${baseClass} bg-[var(--accent-muted)]`}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="animate-fade-pulse"
          >
            <path
              d="M8 10v4M12 8v8M16 10v4"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )
    case 'loading':
      return (
        <div className={`${baseClass} bg-[var(--bg-elevated)]`}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="animate-fade-pulse"
          >
            <path
              d="M12 3v4M12 17v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M3 12h4M17 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )
    case 'gap':
      return (
        <div className={`${baseClass} bg-[var(--bg-elevated)] opacity-60`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h14"
              stroke="var(--text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )
    case 'awaiting_answer':
      return (
        <div className={`${baseClass} bg-[var(--accent-muted)] ring-2 ring-sky-400/50`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 10h8M8 14h5M12 3a9 9 0 100 18 9 9 0 000-18z"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
    case 'feedback_incorrect':
      return (
        <div className={`${baseClass} bg-red-500/20 ring-2 ring-red-400/40`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 9l-6 6M9 9l6 6M12 3a9 9 0 100 18 9 9 0 000-18z"
              stroke="#fca5a5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
    default:
      return (
        <div className={`${baseClass} bg-[var(--bg-elevated)]`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 18V6.5a2.5 2.5 0 015 0V18M6 18h12"
              stroke="var(--text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
  }
}

export function StatusHero({
  state,
  lastQuiz,
  loadProgress,
  loadIndeterminate,
  loadError,
  onRetry,
}: StatusHeroProps) {
  const showLastQuiz = lastQuiz !== null && state !== 'loading'

  return (
    <PlayAreaCard>
      <SessionLoadStatus
        state={state}
        loadProgress={loadProgress}
        loadIndeterminate={loadIndeterminate}
        loadError={loadError}
        onRetry={onRetry}
      />

      <StateIcon state={state} />

      <div aria-live="polite" aria-atomic="true" className="mt-6">
        <p className="mb-1 text-sm text-[var(--text-secondary)]">当前状态</p>
        <h2 className="text-2xl font-semibold sm:text-3xl">{STATE_LABELS[state]}</h2>
      </div>

      {showLastQuiz && lastQuiz ? (
        <div className="mt-8 space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">上一题</p>
          <p className="text-4xl font-bold sm:text-5xl">{lastQuiz.interval.name}</p>
          <p className="text-lg text-[var(--text-secondary)]">
            {formatQuizNotes(lastQuiz)}
            {formatQuizDirection(lastQuiz) && (
              <span className="ml-2 text-base">({formatQuizDirection(lastQuiz)})</span>
            )}
          </p>
        </div>
      ) : (
        <p className="mt-8 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
          点击「开始跟听」，系统将循环播放音程，停顿后用人声播报答案。
        </p>
      )}
    </PlayAreaCard>
  )
}
