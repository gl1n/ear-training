import type { IntervalDirection } from '../quiz/intervals'
import { SPEED_OPTIONS, type SpeedPreset } from '../quiz/sequencer'
import { DirectionSelector } from './DirectionSelector'
import { IntervalSelector } from './IntervalSelector'
import { Card } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'

export type SettingsPanelProps = {
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  isRunning: boolean
  onSpeedChange: (preset: SpeedPreset) => void
  onDirectionChange: (direction: IntervalDirection) => void
  onIntervalToggle: (id: string) => void
  onSelectAllIntervals: () => void
  onClearIntervals: () => void
  onApplyPreset: (intervalIds: string[]) => void
}

export function SettingsPanel({
  speedPreset,
  enabledIntervalIds,
  direction,
  isRunning,
  onSpeedChange,
  onDirectionChange,
  onIntervalToggle,
  onSelectAllIntervals,
  onClearIntervals,
  onApplyPreset,
}: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <Card variant="compact">
        <h3 className="mb-3 text-sm font-medium">播放速度</h3>
        <SegmentedControl
          options={SPEED_OPTIONS}
          value={speedPreset}
          onChange={onSpeedChange}
          disabled={isRunning}
        />
        {isRunning && (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">练习中无法修改速度</p>
        )}
      </Card>

      <DirectionSelector
        direction={direction}
        onDirectionChange={onDirectionChange}
        disabled={isRunning}
      />

      <IntervalSelector
        enabledIntervalIds={enabledIntervalIds}
        onIntervalToggle={onIntervalToggle}
        onSelectAllIntervals={onSelectAllIntervals}
        onClearIntervals={onClearIntervals}
        onApplyPreset={onApplyPreset}
      />
    </div>
  )
}
