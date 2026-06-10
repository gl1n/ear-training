import type { TrainerState } from '../../quiz/sequencer'
import { SoundBars } from './SoundBars'
import { getPracticePhase, type PracticePhaseVariant } from './practicePhase'

export type { PracticePhaseVariant } from './practicePhase'

type PracticePhaseIndicatorProps = {
  state: TrainerState
  variant: PracticePhaseVariant
}

function getPhase(state: TrainerState) {
  return getPracticePhase(state)
}

function getListeningLabel(state: TrainerState, variant: PracticePhaseVariant): string {
  if (variant === 'scaleDegree') {
    return state === 'playing_note' ? '目标音' : '聆听'
  }

  if (state === 'playing_harmonic') return '和弦'
  if (state === 'playing_second') return '第二音'
  return '第一音'
}

export function PracticePhaseIndicator({
  state,
  variant,
}: PracticePhaseIndicatorProps) {
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
    const label = getListeningLabel(state, variant)
    const listeningTextClass = variant === 'scaleDegree' ? 'text-sky-200' : 'text-sky-300'
    const wrapperClass =
      variant === 'scaleDegree'
        ? 'inline-flex items-center gap-2.5 rounded-full bg-sky-500/10 px-3 py-1 ring-1 ring-sky-400/20'
        : 'inline-flex items-center gap-2.5'

    return (
      <span className={wrapperClass}>
        <SoundBars
          bars={[
            { delay: 0, height: 8 },
            { delay: 0.15, height: 12 },
            { delay: 0.3, height: 16 },
          ]}
        />
        <span className={`text-sm font-medium ${listeningTextClass}`}>聆听 · {label}</span>
      </span>
    )
  }

  if (phase === 'answer') {
    const answerLabel = variant === 'scaleDegree' ? '选择音级' : '选择答案'
    const answerTextClass = variant === 'scaleDegree' ? 'text-sky-200' : 'text-sky-300'
    const pulseClass =
      variant === 'scaleDegree' ? 'animate-ready-pulse-scale-degree' : 'animate-ready-pulse'

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-3 py-1 text-sm font-semibold ${answerTextClass} ring-1 ring-sky-400/40 ${pulseClass}`}
      >
        <span className="h-2 w-2 rounded-full bg-sky-400" />
        {answerLabel}
      </span>
    )
  }

  if (phase === 'wrong') {
    const wrongClass =
      variant === 'scaleDegree'
        ? 'inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-300 ring-1 ring-red-400/25'
        : 'inline-flex items-center gap-2 text-sm font-medium text-red-300'

    return <span className={wrongClass}>答错了</span>
  }

  return null
}
