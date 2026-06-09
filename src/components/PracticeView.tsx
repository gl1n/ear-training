import type { AppMode, TrainerState } from '../quiz/sequencer'
import type { SessionStats } from '../quiz/stats'
import { ArcadeIdlePanel } from './ArcadeIdlePanel'
import { ArcadePlayfield } from './ArcadePlayfield'
import { AppShell } from './AppShell'
import { NoteKeyArcadeIdlePanel } from './NoteKeyArcadeIdlePanel'
import { NoteKeyArcadePlayfield } from './NoteKeyArcadePlayfield'
import { NoteKeyArcadeReadyPanel } from './NoteKeyArcadeReadyPanel'
import { SettingsPanel, type SettingsPanelProps } from './SettingsPanel'
import { SettingsSummary } from './SettingsSummary'
import { StatusHero } from './StatusHero'
import { Button } from './ui/Button'
import { SegmentedControl } from './ui/SegmentedControl'
import type { Quiz } from '../quiz/intervals'
import type { NoteKeyQuiz } from '../quiz/keys'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'

const MODE_OPTIONS = [
  { value: 'practice' as const, label: '练习' },
  { value: 'arcade' as const, label: '音程街机' },
  { value: 'noteKey' as const, label: '调内听音' },
]

type PracticeViewProps = {
  mode: AppMode
  state: TrainerState
  isRunning: boolean
  isLoading: boolean
  settingsControls: SettingsPanelProps
  lastQuiz: Quiz | null
  lastNoteKeyQuiz: NoteKeyQuiz | null
  currentKeyLabel: string | null
  noteKeyGameStarted: boolean
  sessionStats: SessionStats
  trainingStats: TrainingStatsViewModel
  rootMin: number
  rootMax: number
  arcadeDeadlineMs: number | null
  arcadeTimedOut: boolean
  idleTip: string | null
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
}

export function PracticeView({
  mode,
  state,
  isRunning,
  isLoading,
  settingsControls,
  lastQuiz,
  lastNoteKeyQuiz,
  currentKeyLabel,
  noteKeyGameStarted,
  sessionStats,
  trainingStats,
  rootMin,
  rootMax,
  arcadeDeadlineMs,
  arcadeTimedOut,
  idleTip,
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
}: PracticeViewProps) {
  const { enabledIntervalIds } = settingsControls
  const canStart =
    mode === 'noteKey' ? true : enabledIntervalIds.length > 0
  const showSettingsHint = !canStart && !isRunning && mode !== 'noteKey'
  const isChallengeMode = mode === 'arcade' || mode === 'noteKey'
  const noteKeyAwaitingStart = mode === 'noteKey' && isRunning && !noteKeyGameStarted

  const noteKeyEstablishing =
    noteKeyAwaitingStart && (state === 'loading' || state === 'playing_tonic_chord')

  const footerButtonLabel = (() => {
    if (isLoading && mode !== 'noteKey') return '加载钢琴音色…'
    if (noteKeyEstablishing) {
      return state === 'loading' ? '加载钢琴音色…' : '取消'
    }
    if (noteKeyAwaitingStart) return '开始'
    if (isRunning) return '暂停'
    if (isChallengeMode) return '开始挑战'
    return '开始练习'
  })()

  const footerButtonDisabled =
    (isLoading && mode !== 'noteKey') ||
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
        <SettingsSummary
          mode={mode}
          speedPreset={settingsControls.speedPreset}
          enabledIntervalIds={settingsControls.enabledIntervalIds}
          direction={settingsControls.direction}
          isRunning={settingsControls.isRunning}
          showHint={showSettingsHint}
          onOpenSettings={onOpenSettings}
        />
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
      {mode === 'arcade' ? (
        isRunning && enabledIntervalIds.length > 0 ? (
          <ArcadePlayfield
            optionIds={enabledIntervalIds}
            state={state}
            sessionStats={sessionStats}
            lastQuiz={lastQuiz}
            arcadeDeadlineMs={arcadeDeadlineMs}
            arcadeTimedOut={arcadeTimedOut}
            idleTip={idleTip}
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
            trainingStats={trainingStats}
            rootMin={rootMin}
            rootMax={rootMax}
            replayingQuizKey={replayingQuizKey}
            isReplayBusy={isReplayBusy}
            onPlayQuiz={onPlayQuiz}
          />
        )
      ) : mode === 'noteKey' ? (
        isRunning && noteKeyGameStarted ? (
          <NoteKeyArcadePlayfield
            state={state}
            sessionStats={sessionStats}
            lastQuiz={lastNoteKeyQuiz}
            currentKeyLabel={currentKeyLabel}
            loadProgress={loadProgress}
            loadIndeterminate={loadIndeterminate}
            loadError={loadError}
            onSelect={onAnswerSelect}
            onRetry={loadError ? onRetry : undefined}
          />
        ) : isRunning ? (
          <NoteKeyArcadeReadyPanel
            state={state}
            currentKeyLabel={currentKeyLabel}
            loadProgress={loadProgress}
            loadIndeterminate={loadIndeterminate}
            loadError={loadError}
            onRetry={loadError ? onRetry : undefined}
          />
        ) : (
          <NoteKeyArcadeIdlePanel
            lastQuiz={lastNoteKeyQuiz}
            sessionStats={sessionStats}
            trainingStats={trainingStats}
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
