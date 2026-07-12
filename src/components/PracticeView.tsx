import type { AppMode, TrainerState } from '../quiz/sequencer'
import type { SessionStats } from '../quiz/stats'
import { IntervalSpeedIdlePanel } from './IntervalSpeedIdlePanel'
import { IntervalSpeedPlayfield } from './IntervalSpeedPlayfield'
import { AppShell } from './AppShell'
import { ScaleDegreeIdlePanel } from './ScaleDegreeIdlePanel'
import { ScaleDegreePlayfield } from './ScaleDegreePlayfield'
import { ScaleDegreeReadyPanel } from './ScaleDegreeReadyPanel'
import type { SettingsPanelProps } from './SettingsPanel'
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
import type { ChordDegree, ChordKey, ChordRhythm, PlayedChord } from '../quiz/chordProgression'
import { ChordProgressionPanel } from './ChordProgressionPanel'
import { SessionGoalControl } from './practice/SessionGoalControl'
import { ALL_CHORD_DEGREES, PRIMARY_CHORD_DEGREES, type ChordDegreeHistory, type ChordDegreeInversionMode, type ChordDegreeKey, type ChordDegreeQuiz, type ChordDegreeRange } from '../quiz/chordDegreeQuiz'
import { ChordDegreePlayfield } from './ChordDegreePlayfield'
import { ChordDegreeIdlePanel } from './ChordDegreeIdlePanel'

const MODE_OPTIONS = [
  { value: 'intervalFollow' as const, label: '跟听' },
  { value: 'intervalSpeed' as const, label: '辨认' },
  { value: 'scaleDegree' as const, label: '音级' },
  { value: 'chordDegree' as const, label: '猜和弦' },
  { value: 'chordProgression' as const, label: '进行' },
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
  sessionSize: 10 | 20 | 30
  sessionCompleted: boolean
  completedQuestions: number
  trainingStats: TrainingStatsViewModel
  rootMin: number
  rootMax: number
  challengeEncouragement: PracticeEncouragement | null
  correctionWrongSelection: string | null
  loadStatus: LoadStatusProps
  onModeChange: (mode: AppMode) => void
  onToggle: () => void
  onSessionSizeChange: (size: 10 | 20 | 30) => void
  onPracticeWeakest: () => void
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
  chordKey: ChordKey
  activeChordKeyLabel: string | null
  onChordKeyChange: (key: ChordKey) => void
  chordMelodyEnabled: boolean
  onChordMelodyEnabledChange: (enabled: boolean) => void
  chordDegreeQuiz: ChordDegreeQuiz | null
  chordDegreeHistory: ChordDegreeHistory
  chordDegreeKey: ChordDegreeKey
  onChordDegreeKeyChange: (key: ChordDegreeKey) => void
  onPlayChordDo: () => void
  chordDegreeRange: ChordDegreeRange
  chordDegreeInversionMode: ChordDegreeInversionMode
  chordDegreeReplayCount: number
  onChordDegreeRangeChange: (range: ChordDegreeRange) => void
  onChordDegreeInversionModeChange: (mode: ChordDegreeInversionMode) => void
  onApplyChordDegreePreset: (preset: 'beginner' | 'standard' | 'advanced') => void
  onPlayChordQuiz: () => void
  onPlayChordSequence: () => void
  onPlaySelectedChord: () => void
  onPlayChordComparison: () => void
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
  sessionSize,
  sessionCompleted,
  completedQuestions,
  trainingStats,
  rootMin,
  rootMax,
  challengeEncouragement,
  correctionWrongSelection,
  loadStatus,
  onModeChange,
  onToggle,
  onSessionSizeChange,
  onPracticeWeakest,
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
  chordKey,
  activeChordKeyLabel,
  onChordKeyChange,
  chordMelodyEnabled,
  onChordMelodyEnabledChange,
  chordCountIn,
  onChordRhythmChange,
  chordDegreeQuiz,
  chordDegreeHistory,
  chordDegreeKey,
  onChordDegreeKeyChange,
  onPlayChordDo,
  chordDegreeRange,
  chordDegreeInversionMode,
  chordDegreeReplayCount,
  onChordDegreeRangeChange,
  onChordDegreeInversionModeChange,
  onApplyChordDegreePreset,
  onPlayChordQuiz,
  onPlayChordSequence,
  onPlaySelectedChord,
  onPlayChordComparison,
}: PracticeViewProps) {
  const { enabledIntervalIds } = settingsControls
  const { loadProgress, loadIndeterminate, loadError, onRetry } = loadStatus
  const canStart =
    mode === 'scaleDegree' || mode === 'chordDegree' || mode === 'chordProgression' ? true : enabledIntervalIds.length > 0
  const showSettingsHint = !canStart && !isRunning && mode !== 'scaleDegree'
  const isChallengeMode = mode === 'intervalSpeed' || mode === 'scaleDegree' || mode === 'chordDegree'
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
      focused={isRunning}
      modeSwitch={
        <nav aria-label="训练类型">
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">选择训练</p>
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={onModeChange} disabled={isRunning} />
          {isChallengeMode && !isRunning && !sessionCompleted && (
            <SessionGoalControl value={sessionSize} onChange={onSessionSizeChange} />
          )}
        </nav>
      }
      settingsSummary={
        mode !== 'scaleDegree' && mode !== 'chordDegree' && mode !== 'chordProgression' ? (
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
      footer={
        <>
          {isChallengeMode && isRunning && (
            <div className="w-full max-w-xs" aria-live="polite">
              <div className="mb-1.5 flex justify-between text-xs text-[var(--text-secondary)]">
                <span>本轮进度</span><span>{Math.min(completedQuestions, sessionSize)} / {sessionSize}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-sky-400 transition-[width]" style={{ width: `${Math.min(100, completedQuestions / sessionSize * 100)}%` }} />
              </div>
            </div>
          )}
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
      {mode === 'chordDegree' ? (
        isRunning ? <ChordDegreePlayfield state={state} sessionStats={sessionStats} quiz={chordDegreeQuiz} wrongSelection={correctionWrongSelection} optionDegrees={chordDegreeRange === 'primary' ? PRIMARY_CHORD_DEGREES : ALL_CHORD_DEGREES} replayCount={chordDegreeReplayCount} onSelect={onAnswerSelect} onPlayDo={onPlayChordDo} onPlayChord={onPlayChordQuiz} onPlaySequence={onPlayChordSequence} onPlaySelected={onPlaySelectedChord} onPlayComparison={onPlayChordComparison} /> : <ChordDegreeIdlePanel quiz={chordDegreeQuiz} sessionStats={sessionStats} history={chordDegreeHistory} sessionCompleted={sessionCompleted} selectedKey={chordDegreeKey} range={chordDegreeRange} inversionMode={chordDegreeInversionMode} onKeyChange={onChordDegreeKeyChange} onRangeChange={onChordDegreeRangeChange} onInversionModeChange={onChordDegreeInversionModeChange} onApplyPreset={onApplyChordDegreePreset} onPlayDo={onPlayChordDo} />
      ) : mode === 'chordProgression' ? (
        <ChordProgressionPanel degrees={chordDegrees} currentChord={currentChord} currentPosition={currentChordPosition} state={state} isRunning={isRunning} onDegreeChange={onChordDegreeChange} onDegreesChange={onChordDegreesChange} rhythm={chordRhythm} currentBeat={currentChordBeat} isCountIn={chordCountIn} onRhythmChange={onChordRhythmChange} selectedKey={chordKey} activeKeyLabel={activeChordKeyLabel} onKeyChange={onChordKeyChange} melodyEnabled={chordMelodyEnabled} onMelodyEnabledChange={onChordMelodyEnabledChange} />
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
            sessionCompleted={sessionCompleted}
            onPracticeWeakest={onPracticeWeakest}
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
            sessionCompleted={sessionCompleted}
            onPracticeWeakest={onPracticeWeakest}
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
