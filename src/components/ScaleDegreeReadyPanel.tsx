import { LISTENING_STATES, type TrainerState } from '../quiz/sequencer'
import { KeyLabel } from './practice/KeyLabel'
import { SoundBars } from './practice/SoundBars'
import { PlayAreaCard } from './PlayAreaCard'
import { SessionLoadStatus } from './SessionLoadStatus'

type ScaleDegreeReadyPanelProps = {
  state: TrainerState
  currentKeyLabel: string | null
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onRetry?: () => void
}

export function ScaleDegreeReadyPanel({
  state,
  currentKeyLabel,
  loadProgress,
  loadIndeterminate,
  loadError,
  onRetry,
}: ScaleDegreeReadyPanelProps) {
  const isEstablishing =
    state === 'loading' || state === 'playing_tonic_chord' || LISTENING_STATES.includes(state)
  const isReady = !isEstablishing && !loadError && currentKeyLabel !== null

  return (
    <PlayAreaCard className="gap-8">
      {loadError || state === 'loading' ? (
        <SessionLoadStatus
          state={state}
          loadProgress={loadProgress}
          loadIndeterminate={loadIndeterminate}
          loadError={loadError}
          onRetry={onRetry}
        />
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 text-center">
            {isEstablishing ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-sky-200 ring-1 ring-sky-400/25">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  定调中
                </span>
                <p className="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
                  正在播放一级大三和弦，请仔细聆听并记住调性
                </p>
              </>
            ) : isReady && currentKeyLabel ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-400/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  已定调
                </span>
                <KeyLabel label={currentKeyLabel} variant="display" />
                <p className="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
                  调性已建立，即将开始答题
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">准备中…</p>
            )}
          </div>

          {isEstablishing && (
            <div className="flex items-end justify-center gap-1.5" aria-hidden="true">
              <SoundBars
                className="w-1.5 rounded-full bg-sky-400 animate-sound-bar"
                bars={[0, 1, 2, 3, 4].map((i) => ({
                  delay: i * 0.1,
                  height: 12 + (i % 3) * 6,
                }))}
              />
            </div>
          )}
        </>
      )}
    </PlayAreaCard>
  )
}
