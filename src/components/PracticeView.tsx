import type { AppMode, TrainerState } from '../quiz/sequencer'
import type { SessionStats } from '../quiz/stats'
import { ArcadeIdlePanel } from './ArcadeIdlePanel'
import { ArcadePlayfield } from './ArcadePlayfield'
import { AppShell } from './AppShell'
import { SettingsPanel } from './SettingsPanel'
import { SettingsSummary } from './SettingsSummary'
import { StatusHero } from './StatusHero'
import { Button } from './ui/Button'
import { SegmentedControl } from './ui/SegmentedControl'
import type { IntervalDirection, Quiz } from '../quiz/intervals'
import type { SpeedPreset } from '../quiz/sequencer'

const MODE_OPTIONS = [
  { value: 'practice' as const, label: '练习模式' },
  { value: 'arcade' as const, label: '街机模式' },
]

type PracticeViewProps = {
  mode: AppMode
  state: TrainerState
  isRunning: boolean
  isLoading: boolean
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  lastQuiz: Quiz | null
  sessionStats: SessionStats
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onModeChange: (mode: AppMode) => void
  onToggle: () => void
  onOpenSettings: () => void
  onRetry: () => void
  onSpeedChange: (preset: SpeedPreset) => void
  onDirectionChange: (direction: IntervalDirection) => void
  onIntervalToggle: (id: string) => void
  onSelectAllIntervals: () => void
  onClearIntervals: () => void
  onApplyPreset: (intervalIds: string[]) => void
  onAnswerSelect: (intervalId: string) => void
  onReplayLastQuiz?: () => void
  isReplayingLastQuiz?: boolean
}

export function PracticeView({
  mode,
  state,
  isRunning,
  isLoading,
  speedPreset,
  enabledIntervalIds,
  direction,
  lastQuiz,
  sessionStats,
  loadProgress,
  loadIndeterminate,
  loadError,
  onModeChange,
  onToggle,
  onOpenSettings,
  onRetry,
  onSpeedChange,
  onDirectionChange,
  onIntervalToggle,
  onSelectAllIntervals,
  onClearIntervals,
  onApplyPreset,
  onAnswerSelect,
  onReplayLastQuiz,
  isReplayingLastQuiz = false,
}: PracticeViewProps) {
  const canStart = enabledIntervalIds.length > 0
  const showSettingsHint = !canStart && !isRunning
  const isArcade = mode === 'arcade'

  const settingsPanelProps = {
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
  }

  return (
    <AppShell
      mode={mode}
      modeSwitch={
        <SegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={onModeChange}
          disabled={isRunning}
        />
      }
      settingsSummary={
        <SettingsSummary
          speedPreset={speedPreset}
          enabledIntervalIds={enabledIntervalIds}
          direction={direction}
          isRunning={isRunning}
          showHint={showSettingsHint}
          onOpenSettings={onOpenSettings}
        />
      }
      settingsPanel={<SettingsPanel {...settingsPanelProps} />}
      footer={
        <>
          <Button
            onClick={onToggle}
            disabled={isLoading || (!isRunning && !canStart)}
            className="min-w-[160px] px-8 py-3.5 text-lg"
          >
            {isLoading
              ? '加载钢琴音色…'
              : isRunning
                ? '暂停'
                : isArcade
                  ? '开始挑战'
                  : '开始练习'}
          </Button>

          {showSettingsHint && (
            <p className="text-sm text-sky-400">请先在设置中选择音程</p>
          )}
        </>
      }
    >
      {isArcade ? (
        isRunning && enabledIntervalIds.length > 0 ? (
          <ArcadePlayfield
            optionIds={enabledIntervalIds}
            state={state}
            sessionStats={sessionStats}
            lastQuiz={lastQuiz}
            loadProgress={loadProgress}
            loadIndeterminate={loadIndeterminate}
            loadError={loadError}
            onSelect={onAnswerSelect}
            onRetry={loadError ? onRetry : undefined}
          />
        ) : (
          <ArcadeIdlePanel
            lastQuiz={lastQuiz}
            sessionStats={sessionStats}
            isReplayingLastQuiz={isReplayingLastQuiz}
            onReplayLastQuiz={onReplayLastQuiz}
          />
        )
      ) : (
        <StatusHero
          state={state}
          lastQuiz={lastQuiz}
          loadProgress={loadProgress}
          loadIndeterminate={loadIndeterminate}
          loadError={loadError}
          onRetry={loadError ? onRetry : undefined}
        />
      )}
    </AppShell>
  )
}
