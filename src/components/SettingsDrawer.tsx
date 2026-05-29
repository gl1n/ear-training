import { IntervalSelector } from './IntervalSelector'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Drawer } from './ui/Drawer'
import { SegmentedControl } from './ui/SegmentedControl'
import { SPEED_OPTIONS, type SpeedPreset } from '../quiz/sequencer'

type SettingsDrawerProps = {
  open: boolean
  onClose: () => void
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  isRunning: boolean
  onSpeedChange: (preset: SpeedPreset) => void
  onIntervalToggle: (id: string) => void
  onSelectAllIntervals: () => void
  onClearIntervals: () => void
  onApplyPreset: (intervalIds: string[]) => void
}

export function SettingsDrawer({
  open,
  onClose,
  speedPreset,
  enabledIntervalIds,
  isRunning,
  onSpeedChange,
  onIntervalToggle,
  onSelectAllIntervals,
  onClearIntervals,
  onApplyPreset,
}: SettingsDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="练习设置"
      footer={
        <Button onClick={onClose} className="w-full">
          完成
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <Card className="p-4">
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

        <IntervalSelector
          enabledIntervalIds={enabledIntervalIds}
          onIntervalToggle={onIntervalToggle}
          onSelectAllIntervals={onSelectAllIntervals}
          onClearIntervals={onClearIntervals}
          onApplyPreset={onApplyPreset}
        />
      </div>
    </Drawer>
  )
}
