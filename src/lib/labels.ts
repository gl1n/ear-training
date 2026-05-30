import { DIRECTION_OPTIONS, type IntervalDirection } from '../quiz/intervals'
import { SPEED_OPTIONS, type SpeedPreset } from '../quiz/sequencer'

export function getSpeedLabel(preset: SpeedPreset): string {
  return SPEED_OPTIONS.find((option) => option.value === preset)?.label ?? '中'
}

export function getDirectionLabel(direction: IntervalDirection): string {
  return DIRECTION_OPTIONS.find((option) => option.value === direction)?.label ?? '上行'
}
