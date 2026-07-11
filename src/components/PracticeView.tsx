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
import type { ScaleDegreeQuiz, MelodyScaleDegreeQuiz } from '../quiz/keys'
import type { ScaleDegreeMistakeStatsStore } from '../quiz/scaleDegreeMistakeStats'
import type { ScaleDegreeMelodyMistakeStatsStore } from '../quiz/scaleDegreeMelodyMistakeStats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import type { PracticeEncouragement } from './practice/types'
import type { LoadStatusProps } from './practice/viewProps'
import type { ChordDegree, ChordRhythm, PlayedChord } from '../quiz/chordProgression'
import { ChordProgressionPanel } from './ChordProgressionPanel'

const MODE_OPTIONS = [
  { value: 'intervalFollow' as const, label: '音程跟听' },
  { value: 'scaleDegree' as const, label: '音级辨识' },
  { value: 'intervalSpeed' as const, label: '音程辨认' },
  { value: 'chordProgression' as const, label: '和弦进行' },
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
  sessionScaleDegreeMelodyMistakes: ScaleDegreeMelodyMistakeStatsStore
  scaleDegreeReviewEnabled: boolean
  onScaleDegreeReviewChange: (enabled: boolean) => void
  scaleDegreeMelodyEnabled: boolean
  onScaleDegreeMelodyChange: (enabled: boolean) => void
  melodyCorrectDegrees: string[]
  sessionStats: SessionStats
  trainingStats: TrainingStatsViewModel
  rootMin: number
  rootMax: number
  challengeEncouragement: PracticeEncouragement | null
  correctionWrongSelection: string | null
  loadStatus: LoadStatusProps
  onModeChange: (mode: AppMode) => void
  onToggle: () => void
  onOpenSettings: () => void
  onAnswerSelect: (answerId: string) => void
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayQuiz: (quiz: Quiz) => void
  onPlayMelodyQuiz: (quiz: MelodyScaleDegreeQuiz) => void
  onScaleDegreeHome: () => void
  chordDegrees: ChordDegree[]
  currentChord: PlayedChord | null
  currentChordPosition: number
  onChordDegreeChange: (position: number, degree: ChordDegree) => void
  onChordDegreesChange: (degrees: ChordDegree[]) => void
  chordRhythm: ChordRhythm
  currentChordBeat: number
  chordCountIn: boolean
  onChordRhythmChange: (rhythm: ChordRhythm) => void
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
  sessionScaleDegreeMelodyMistakes,
  scaleDegreeReviewEnabled,
  onScaleDegreeReviewChange,
  scaleDegreeMelodyEnabled,
  onScaleDegreeMelodyChange,
  melodyCorrectDegrees,
  sessionStats,
  trainingStats,
  rootMin,
  rootMax,
  challengeEncouragement,
  correctionWrongSelection,
  loadStatus,
  onModeChange,
  onToggle,
  onOpenSettings,
  onAnswerSelect,
  replayingQuizKey,
  isReplayBusy,
  onPlayQuiz,
  onPlayMelodyQuiz,
  onScaleDegreeHome,
  chordDegrees,
  currentChord,
  currentChordPosition,
  onChordDegreeChange,
  onChordDegreesChange,
  chordRhythm,
  currentChordBeat,
  chordCountIn,
  onChordRhythmChange,
}: PracticeViewProps) {
  const { enabledIntervalIds } = settingsControls
  const { loadProgress, loadIndeterminate, loadError, onRetry } = loadStatus
  const canStart =
    mode === 'scaleDegree' || mode === 'chordProgression' ? true : enabledIntervalIds.length > 0
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
    if (mode === 'chordProgression') return '开始循环'
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
        mode !== 'scaleDegree' && mode !== 'chordProgression' ? (
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
      {mode === 'chordProgression' ? (
        <ChordProgressionPanel degrees={chordDegrees} currentChord={currentChord} currentPosition={currentChordPosition} state={state} isRunning={isRunning} onDegreeChange={onChordDegreeChange} onDegreesChange={onChordDegreesChange} rhythm={chordRhythm} currentBeat={currentChordBeat} isCountIn={chordCountIn} onRhythmChange={onChordRhythmChange} />
      ) : mode === 'intervalSpeed' ? (
        isRunning && enabledIntervalIds.length > 0 ? (
          <IntervalSpeedPlayfield
            optionIds={enabledIntervalIds}
            state={state}
            sessionStats={sessionStats}
            lastQuiz={lastQuiz}
            encouragement={challengeEncouragement}
            correctionWrongSelection={correctionWrongSelection}
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
            encouragement={challengeEncouragement}
            correctionWrongSelection={correctionWrongSelection}
            melodyEnabled={scaleDegreeMelodyEnabled}
            melodyCorrectDegrees={melodyCorrectDegrees}
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
            sessionMelodyMistakes={sessionScaleDegreeMelodyMistakes}
            trainingStats={trainingStats}
            scaleDegreeReviewEnabled={scaleDegreeReviewEnabled}
            scaleDegreeMelodyEnabled={scaleDegreeMelodyEnabled}
            isRunning={isRunning}
            replayingQuizKey={replayingQuizKey}
            isReplayBusy={isReplayBusy}
            onPlayMelodyQuiz={onPlayMelodyQuiz}
            onScaleDegreeReviewChange={onScaleDegreeReviewChange}
            onScaleDegreeMelodyChange={onScaleDegreeMelodyChange}
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
