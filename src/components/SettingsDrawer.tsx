import { SettingsPanel } from './SettingsPanel'
import { Button } from './ui/Button'
import { Drawer } from './ui/Drawer'
import type { IntervalDirection } from '../quiz/intervals'
import type { SpeedPreset } from '../quiz/sequencer'

type SettingsDrawerProps = {
  open: boolean
  onClose: () => void
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

export function SettingsDrawer({
  open,
  onClose,
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
      <SettingsPanel
        speedPreset={speedPreset}
        enabledIntervalIds={enabledIntervalIds}
        direction={direction}
        isRunning={isRunning}
        onSpeedChange={onSpeedChange}
        onDirectionChange={onDirectionChange}
        onIntervalToggle={onIntervalToggle}
        onSelectAllIntervals={onSelectAllIntervals}
        onClearIntervals={onClearIntervals}
        onApplyPreset={onApplyPreset}
      />
    </Drawer>
  )
}
