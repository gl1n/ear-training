import type { AppMode, TrainerState } from '../quiz/sequencer'
import type { SessionStats } from '../quiz/stats'
import { IntervalSpeedIdlePanel } from './IntervalSpeedIdlePanel'
import { IntervalSpeedPlayfield } from './IntervalSpeedPlayfield'
import { AppShell } from './AppShell'
import { ScaleDegreeIdlePanel } from './ScaleDegreeIdlePanel'
import { ScaleDegreePlayfield } from './ScaleDegreePlayfield'
import { ScaleDegreeReadyPanel } from './ScaleDegreeReadyPanel'
import { SettingsPanel, type SettingsPanelProps } from './SettingsPanel'
import { SettingsSummary } from './SettingsSummary'
import { StatusHero } from './StatusHero'
import { Button } from './ui/Button'
import { SegmentedControl } from './ui/SegmentedControl'
import type { Quiz } from '../quiz/intervals'
import type { ScaleDegreeQuiz } from '../quiz/keys'
import type { ScaleDegreeMistakeStatsStore } from '../quiz/scaleDegreeMistakeStats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import type { ScaleDegreeEncouragement } from './ScaleDegreeEncouragementToast'

const MODE_OPTIONS = [
  { value: 'intervalFollow' as const, label: '音程跟听' },
  { value: 'scaleDegree' as const, label: '音级辨识' },
  { value: 'intervalSpeed' as const, label: '音程竞速' },
]

type PracticeViewProps = {
  mode: AppMode
  state: TrainerState
  isRunning: boolean
  isLoading: boolean
  settingsControls: SettingsPanelProps
  lastQuiz: Quiz | null
  lastScaleDegreeQuiz: ScaleDegreeQuiz | null
  currentKeyLabel: string | null
  scaleDegreeGameStarted: boolean
  sessionScaleDegreeMistakes: ScaleDegreeMistakeStatsStore
  scaleDegreeReviewEnabled: boolean
  onScaleDegreeReviewChange: (enabled: boolean) => void
  sessionStats: SessionStats
  trainingStats: TrainingStatsViewModel
  rootMin: number
  rootMax: number
  intervalSpeedDeadlineMs: number | null
  intervalSpeedTimedOut: boolean
  idleTip: string | null
  scaleDegreeEncouragement: ScaleDegreeEncouragement | null
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onModeChange: (mode: AppMode) => void
  onToggle: () => void
  onOpenSettings: () => void
  onRetry: () => void
  onAnswerSelect: (answerId: string) => void
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayQuiz: (quiz: Quiz) => void
  onScaleDegreeHome: () => void
}

export function PracticeView({
  mode,
  state,
  isRunning,
  isLoading,
  settingsControls,
  lastQuiz,
  lastScaleDegreeQuiz,
  currentKeyLabel,
  scaleDegreeGameStarted,
  sessionScaleDegreeMistakes,
  scaleDegreeReviewEnabled,
  onScaleDegreeReviewChange,
  sessionStats,
  trainingStats,
  rootMin,
  rootMax,
  intervalSpeedDeadlineMs,
  intervalSpeedTimedOut,
  idleTip,
  scaleDegreeEncouragement,
  loadProgress,
  loadIndeterminate,
  loadError,
  onModeChange,
  onToggle,
  onOpenSettings,
  onRetry,
  onAnswerSelect,
  replayingQuizKey,
  isReplayBusy,
  onPlayQuiz,
  onScaleDegreeHome,
}: PracticeViewProps) {
  const { enabledIntervalIds } = settingsControls
  const canStart =
    mode === 'scaleDegree' ? true : enabledIntervalIds.length > 0
  const showSettingsHint = !canStart && !isRunning && mode !== 'scaleDegree'
  const isChallengeMode = mode === 'intervalSpeed' || mode === 'scaleDegree'
  const scaleDegreeEstablishing =
    mode === 'scaleDegree' &&
    isRunning &&
    !scaleDegreeGameStarted &&
    (state === 'loading' || state === 'playing_tonic_chord')

  const footerButtonLabel = (() => {
    if (isLoading && mode !== 'scaleDegree') return '加载钢琴音色…'
    if (scaleDegreeEstablishing) {
      return state === 'loading' ? '加载钢琴音色…' : '取消'
    }
    if (isRunning) return '暂停'
    if (isChallengeMode) return '开始挑战'
    return '开始跟听'
  })()

  const footerButtonDisabled =
    (isLoading && mode !== 'scaleDegree') ||
    (!isRunning && !canStart)

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
        mode !== 'scaleDegree' ? (
          <SettingsSummary
            mode={mode}
            speedPreset={settingsControls.speedPreset}
            enabledIntervalIds={settingsControls.enabledIntervalIds}
            direction={settingsControls.direction}
            isRunning={settingsControls.isRunning}
            showHint={showSettingsHint}
            onOpenSettings={onOpenSettings}
          />
        ) : null
      }
      settingsPanel={<SettingsPanel {...settingsControls} />}
      footer={
        <>
          <Button
            onClick={onToggle}
            disabled={footerButtonDisabled}
            className="min-w-[160px] px-8 py-3.5 text-lg"
          >
            {footerButtonLabel}
          </Button>

          {showSettingsHint && (
            <p className="text-sm text-sky-400">请先在设置中选择音程</p>
          )}
        </>
      }
    >
      {mode === 'intervalSpeed' ? (
        isRunning && enabledIntervalIds.length > 0 ? (
          <IntervalSpeedPlayfield
            optionIds={enabledIntervalIds}
            state={state}
            sessionStats={sessionStats}
            lastQuiz={lastQuiz}
            intervalSpeedDeadlineMs={intervalSpeedDeadlineMs}
            intervalSpeedTimedOut={intervalSpeedTimedOut}
            idleTip={idleTip}
            loadProgress={loadProgress}
            loadIndeterminate={loadIndeterminate}
            loadError={loadError}
            onSelect={onAnswerSelect}
            onRetry={loadError ? onRetry : undefined}
          />
        ) : (
          <IntervalSpeedIdlePanel
            lastQuiz={lastQuiz}
            sessionStats={sessionStats}
            trainingStats={trainingStats}
            rootMin={rootMin}
            rootMax={rootMax}
            replayingQuizKey={replayingQuizKey}
            isReplayBusy={isReplayBusy}
            onPlayQuiz={onPlayQuiz}
          />
        )
      ) : mode === 'scaleDegree' ? (
        isRunning && scaleDegreeGameStarted ? (
          <ScaleDegreePlayfield
            state={state}
            sessionStats={sessionStats}
            lastQuiz={lastScaleDegreeQuiz}
            currentKeyLabel={currentKeyLabel}
            encouragement={scaleDegreeEncouragement}
            loadProgress={loadProgress}
            loadIndeterminate={loadIndeterminate}
            loadError={loadError}
            onSelect={onAnswerSelect}
            onRetry={loadError ? onRetry : undefined}
          />
        ) : isRunning ? (
          <ScaleDegreeReadyPanel
            state={state}
            currentKeyLabel={currentKeyLabel}
            loadProgress={loadProgress}
            loadIndeterminate={loadIndeterminate}
            loadError={loadError}
            onRetry={loadError ? onRetry : undefined}
          />
        ) : (
          <ScaleDegreeIdlePanel
            lastQuiz={lastScaleDegreeQuiz}
            sessionStats={sessionStats}
            sessionMistakes={sessionScaleDegreeMistakes}
            trainingStats={trainingStats}
            scaleDegreeReviewEnabled={scaleDegreeReviewEnabled}
            isRunning={isRunning}
            onScaleDegreeReviewChange={onScaleDegreeReviewChange}
            onHome={onScaleDegreeHome}
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
