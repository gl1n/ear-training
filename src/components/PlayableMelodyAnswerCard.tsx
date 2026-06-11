import {
  formatMelodyDegrees,
  formatMelodySolfege,
  type MelodyScaleDegreeQuiz,
} from '../quiz/keys'

type PlayableMelodyAnswerCardVariant = 'compact' | 'prominent'

type PlayableMelodyAnswerCardProps = {
  quiz: MelodyScaleDegreeQuiz
  variant?: PlayableMelodyAnswerCardVariant
  isPlaying?: boolean
  disabled?: boolean
  subtitle?: string
  onPlay: () => void
}

function PlayIcon({ className = 'text-sky-300' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V6l10 6-10 6z" fill="currentColor" className={className} />
    </svg>
  )
}

const variantStyles: Record<
  PlayableMelodyAnswerCardVariant,
  {
    button: string
    playWrap: string
    playIcon: string
    name: string
  }
> = {
  compact: {
    button:
      'w-full rounded-xl border border-sky-400/20 bg-sky-500/5 px-4 py-3 text-left transition hover:border-sky-400/35 hover:bg-sky-500/10 disabled:cursor-wait disabled:opacity-70',
    playWrap: 'bg-sky-500/15 group-hover:bg-sky-500/25',
    playIcon: 'text-sky-300',
    name: 'text-lg font-semibold text-emerald-200',
  },
  prominent: {
    button:
      'w-full max-w-sm rounded-xl border border-sky-400/25 bg-sky-500/8 px-4 py-3.5 text-center transition hover:border-sky-400/45 hover:bg-sky-500/12 disabled:cursor-wait disabled:opacity-80',
    playWrap: 'bg-sky-500/15 group-hover:bg-sky-500/25',
    playIcon: 'text-sky-300',
    name: 'text-2xl font-bold text-emerald-200',
  },
}

export function PlayableMelodyAnswerCard({
  quiz,
  variant = 'prominent',
  isPlaying = false,
  disabled = false,
  subtitle = '正确答案',
  onPlay,
}: PlayableMelodyAnswerCardProps) {
  const styles = variantStyles[variant]
  const degreeLabel = formatMelodyDegrees(quiz.degrees)
  const solfegeLabel = formatMelodySolfege(quiz.degrees)
  const playing = isPlaying

  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={disabled || playing}
      aria-label={`回放旋律 ${degreeLabel}，${quiz.keyLabel}`}
      className={`group ${styles.button}`}
    >
      <div className="flex items-center justify-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            playing ? 'animate-pulse-ring' : styles.playWrap
          }`}
        >
          <PlayIcon className={styles.playIcon} />
        </span>
        <p className="text-xs text-[var(--text-secondary)]">
          {playing ? '播放中…' : '点击回放'}
        </p>
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">{subtitle}</p>
      )}

      <p className={`mt-1 ${styles.name}`}>旋律 {degreeLabel}</p>
      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{solfegeLabel}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]/80">{quiz.keyLabel}</p>
    </button>
  )
}
