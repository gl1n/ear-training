import { LISTENING_STATES, type TrainerState } from '../quiz/sequencer'
import { PlayAreaCard } from './PlayAreaCard'
import { SessionLoadStatus } from './SessionLoadStatus'

type NoteKeyArcadeReadyPanelProps = {
  state: TrainerState
  currentKeyLabel: string | null
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onRetry?: () => void
}

export function NoteKeyArcadeReadyPanel({
  state,
  currentKeyLabel,
  loadProgress,
  loadIndeterminate,
  loadError,
  onRetry,
}: NoteKeyArcadeReadyPanelProps) {
  const isEstablishing =
    state === 'loading' || state === 'playing_tonic_chord' || LISTENING_STATES.includes(state)
  const isReady = !isEstablishing && !loadError && currentKeyLabel !== null

  return (
    <PlayAreaCard className="gap-6">
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
          <div className="text-center">
            {isEstablishing ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">
                  定调中
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  正在播放一级大三和弦…
                </p>
              </>
            ) : isReady ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">
                  已定调
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-100">{currentKeyLabel}</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  点击「开始」进入答题
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">准备中…</p>
            )}
          </div>

          {isEstablishing && (
            <div className="flex items-center justify-center gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-amber-400 animate-sound-bar"
                  style={{ animationDelay: `${i * 0.12}s`, height: `${10 + i * 5}px` }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </PlayAreaCard>
  )
}
