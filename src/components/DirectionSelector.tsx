import { DIRECTION_SELECT_OPTIONS, type IntervalDirection } from '../quiz/intervals'
import { Card } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'

type DirectionSelectorProps = {
  direction: IntervalDirection
  onDirectionChange: (direction: IntervalDirection) => void
  disabled?: boolean
}

export function DirectionSelector({
  direction,
  onDirectionChange,
  disabled,
}: DirectionSelectorProps) {
  return (
    <Card variant="compact">
      <h3 className="mb-3 text-sm font-medium">播放方式</h3>
      <SegmentedControl
        options={DIRECTION_SELECT_OPTIONS}
        value={direction}
        onChange={onDirectionChange}
        disabled={disabled}
      />
    </Card>
  )
}
