import type { ReactNode } from 'react'

type ChallengeAnswerButtonProps = {
  disabled: boolean
  isReady: boolean
  isListening: boolean
  isCorrectAnswer: boolean
  onClick: () => void
  primaryLabel: ReactNode
  secondaryLabel?: ReactNode
  className?: string
}

export function ChallengeAnswerButton({
  disabled,
  isReady,
  isListening,
  isCorrectAnswer,
  onClick,
  primaryLabel,
  secondaryLabel,
  className = 'min-h-[52px]',
}: ChallengeAnswerButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'group relative flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-all duration-150',
        'disabled:cursor-not-allowed',
        className,
        isCorrectAnswer
          ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-400/30'
          : isReady
            ? 'border-sky-400/50 bg-sky-500/10 text-[var(--text-primary)] shadow-[0_0_20px_rgba(56,189,248,0.15)] hover:border-sky-400 hover:bg-sky-500/20 hover:shadow-[0_0_28px_rgba(56,189,248,0.25)] active:scale-[0.97]'
            : isListening
              ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] opacity-60'
              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] opacity-40',
      ].join(' ')}
    >
      {primaryLabel}
      {secondaryLabel}
    </button>
  )
}
