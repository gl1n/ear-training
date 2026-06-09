import { INTERVALS, type IntervalDirection } from '../quiz/intervals'
import { getDirectionLabel, getSpeedLabel } from '../lib/labels'
import type { AppMode, SpeedPreset } from '../quiz/sequencer'
import { cardClasses } from './ui/Card'
import { Chip } from './ui/Chip'

type SettingsSummaryProps = {
  mode: AppMode
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  isRunning: boolean
  showHint: boolean
  onOpenSettings: () => void
}

export function SettingsSummary({
  mode,
  speedPreset,
  enabledIntervalIds,
  direction,
  isRunning,
  showHint,
  onOpenSettings,
}: SettingsSummaryProps) {
  const isNoteKeyMode = mode === 'noteKey'
  const selectedIntervals = INTERVALS.filter((interval) =>
    enabledIntervalIds.includes(interval.id),
  )

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      disabled={isRunning}
      className={cardClasses(
        'compact',
        [
          'lg:hidden flex w-full flex-col gap-3 text-left transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50',
          showHint ? 'ring-2 ring-sky-400/50' : '',
        ]
          .filter(Boolean)
          .join(' '),
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-sm text-[var(--text-secondary)]">速度</span>
          <Chip active>{getSpeedLabel(speedPreset)}</Chip>
          {!isNoteKeyMode && (
            <>
              <span className="text-[var(--text-secondary)]">·</span>
              <Chip active>{getDirectionLabel(direction)}</Chip>
              <span className="text-[var(--text-secondary)]">·</span>
              <span className="text-sm text-[var(--text-secondary)]">
                {enabledIntervalIds.length} 个音程
              </span>
            </>
          )}
          {isNoteKeyMode && (
            <>
              <span className="text-[var(--text-secondary)]">·</span>
              <span className="text-sm text-[var(--text-secondary)]">调内听音</span>
            </>
          )}
        </div>
        <span className="shrink-0 text-sm text-sky-400">设置 ›</span>
      </div>

      {!isNoteKeyMode && selectedIntervals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-3">
          {selectedIntervals.map((interval) => (
            <Chip key={interval.id} active>
              {interval.short}
            </Chip>
          ))}
        </div>
      )}
    </button>
  )
}
