import type { Quiz } from '../quiz/intervals'
import { MAX_LEVEL } from '../quiz/quizPriority'
import { formatQuizDirection, formatQuizNotes } from '../lib/formatQuiz'

type PlayableIntervalCardVariant = 'compact' | 'prominent'

type PlayableIntervalCardProps = {
  quiz: Quiz
  variant?: PlayableIntervalCardVariant
  level?: number
  isPlaying?: boolean
  disabled?: boolean
  focusBadge?: boolean
  subtitle?: string
  onPlay: () => void
}

function PlayIcon({ className = 'text-orange-300' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V6l10 6-10 6z" fill="currentColor" className={className} />
    </svg>
  )
}

function LevelMeter({ level }: { level: number }) {
  return (
    <div
      className="flex flex-col gap-0.5"
      role="img"
      aria-label={`练习权重 ${level} / ${MAX_LEVEL}`}
    >
      {Array.from({ length: MAX_LEVEL }, (_, index) => {
        const slot = MAX_LEVEL - index
        const active = slot <= level
        return (
          <span
            key={slot}
            className={`h-1.5 w-3 rounded-sm ${
              active ? 'bg-orange-400/90' : 'bg-white/10'
            }`}
          />
        )
      })}
    </div>
  )
}

const variantStyles: Record<
  PlayableIntervalCardVariant,
  {
    button: string
    playWrap: string
    playIcon: string
    name: string
  }
> = {
  compact: {
    button:
      'w-full rounded-lg border border-orange-400/15 bg-orange-500/5 px-3 py-2.5 text-left transition hover:border-orange-400/35 hover:bg-orange-500/10 disabled:cursor-wait disabled:opacity-70',
    playWrap: 'bg-orange-500/15 group-hover:bg-orange-500/25',
    playIcon: 'text-orange-300',
    name: 'font-semibold text-[var(--text-primary)]',
  },
  prominent: {
    button:
      'w-full max-w-sm rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3 text-center transition hover:border-red-400/40 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-80',
    playWrap: 'bg-red-500/15 group-hover:bg-red-500/25',
    playIcon: 'text-red-300',
    name: 'text-2xl font-bold text-[var(--text-primary)]',
  },
}

export function PlayableIntervalCard({
  quiz,
  variant = 'compact',
  level,
  isPlaying = false,
  disabled = false,
  focusBadge = false,
  subtitle,
  onPlay,
}: PlayableIntervalCardProps) {
  const styles = variantStyles[variant]
  const showLevel = level !== undefined && level > 0
  const playing = isPlaying

  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={disabled || playing}
      aria-label={`播放 ${quiz.interval.name}，${formatQuizNotes(quiz)}`}
      className={`group ${styles.button}`}
    >
      {variant === 'prominent' ? (
        <>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                playing ? 'animate-pulse-ring' : styles.playWrap
              }`}
            >
              <PlayIcon className={styles.playIcon} />
            </span>
            <p className="text-xs text-[var(--text-secondary)]">
              {playing ? '播放中…' : '点击试听'}
            </p>
          </div>
          {subtitle && (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{subtitle}</p>
          )}
          <p className={`mt-1 ${styles.name}`}>{quiz.interval.name}</p>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{formatQuizNotes(quiz)}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]/80">
            {formatQuizDirection(quiz)}
          </p>
        </>
      ) : (
        <div className="flex gap-3">
          {showLevel ? <LevelMeter level={level} /> : null}
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full transition ${
              playing ? 'animate-pulse-ring bg-orange-500/20' : `bg-orange-500/10 ${styles.playWrap}`
            }`}
          >
            <PlayIcon className={styles.playIcon} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className={styles.name}>{quiz.interval.name}</span>
              <span className="text-xs text-orange-200/70">{formatQuizDirection(quiz)}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
              {formatQuizNotes(quiz)}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]/70">
              {playing ? '播放中…' : '点击试听'}
            </p>
          </div>
          {focusBadge && (
            <span className="shrink-0 self-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-200/90">
              重点
            </span>
          )}
        </div>
      )}
    </button>
  )
}
