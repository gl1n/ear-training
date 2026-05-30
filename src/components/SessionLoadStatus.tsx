import type { TrainerState } from '../quiz/sequencer'
import { Button } from './ui/Button'
import { LoadProgressBar } from './LoadProgressBar'

type SessionLoadStatusProps = {
  state: TrainerState
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onRetry?: () => void
  variant?: 'hero' | 'compact'
}

export function SessionLoadStatus({
  state,
  loadProgress,
  loadIndeterminate,
  loadError,
  onRetry,
  variant = 'hero',
}: SessionLoadStatusProps) {
  const isHero = variant === 'hero'

  return (
    <>
      {loadError && (
        <div
          className={
            isHero
              ? 'mb-4 flex max-w-md flex-col items-center gap-3'
              : 'flex flex-col items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3'
          }
        >
          <p
            className={
              isHero
                ? 'rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200'
                : 'text-sm text-red-200'
            }
          >
            {loadError}
          </p>
          {onRetry && (
            <Button variant="ghost" onClick={onRetry}>
              重试
            </Button>
          )}
        </div>
      )}

      {state === 'loading' && loadIndeterminate && (
        <LoadProgressBar
          label={
            isHero ? '下载音色包…（Safari 首次约需 10 秒）' : '下载音色包…'
          }
          indeterminate
        />
      )}

      {state === 'loading' && loadProgress !== null && !loadIndeterminate && (
        <LoadProgressBar
          label={
            isHero
              ? `采样加载 ${loadProgress}%（首次约需几秒）`
              : `采样加载 ${loadProgress}%`
          }
          percent={loadProgress}
        />
      )}
    </>
  )
}
