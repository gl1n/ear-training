import { getIntervalsByIds, type Quiz } from '../quiz/intervals'
import { type TrainerState } from '../quiz/sequencer'
import { type SessionStats } from '../quiz/stats'
import { usePracticePlayfieldState } from '../hooks/usePracticePlayfieldState'
import { IntervalSpeedFuseTimer } from './IntervalSpeedFuseTimer'
import { AnswerSecondaryLabel } from './practice/AnswerSecondaryLabel'
import { ChallengeAnswerButton } from './practice/ChallengeAnswerButton'
import { PracticeEncouragementOverlay } from './practice/PracticeEncouragementOverlay'
import { PracticeLoadStatus } from './practice/PracticeLoadStatus'
import { PracticePhaseIndicator } from './practice/PracticePhaseIndicator'
import { PracticeSessionHeader } from './practice/PracticeSessionHeader'
import type { PracticeEncouragement } from './practice/types'
import { Card } from './ui/Card'

type IntervalSpeedPlayfieldProps = {
  optionIds: string[]
  state: TrainerState
  sessionStats: SessionStats
  lastQuiz: Quiz | null
  intervalSpeedDeadlineMs: number | null
  intervalSpeedTimedOut: boolean
  encouragement: PracticeEncouragement | null
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onSelect: (intervalId: string) => void
  onRetry?: () => void
}

function gridColumns(count: number): string {
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-3'
  if (count <= 9) return 'grid-cols-3 sm:grid-cols-4'
  return 'grid-cols-4'
}

export function IntervalSpeedPlayfield({
  optionIds,
  state,
  sessionStats,
  lastQuiz,
  intervalSpeedDeadlineMs,
  intervalSpeedTimedOut,
  encouragement,
  loadProgress,
  loadIndeterminate,
  loadError,
  onSelect,
  onRetry,
}: IntervalSpeedPlayfieldProps) {
  const options = getIntervalsByIds(optionIds)
  const { canAnswer, isWrong, correctCount, currentQuestion, isListening } =
    usePracticePlayfieldState(state, sessionStats)

  return (
    <Card variant="default" className="relative flex flex-1 flex-col gap-4 p-4 sm:p-5">
      {intervalSpeedDeadlineMs !== null && (
        <IntervalSpeedFuseTimer deadlineMs={intervalSpeedDeadlineMs} />
      )}

      <PracticeSessionHeader
        variant="intervalSpeed"
        currentQuestion={currentQuestion}
        correctCount={correctCount}
        trailing={
          <PracticePhaseIndicator
            state={state}
            variant="intervalSpeed"
            timedOut={intervalSpeedTimedOut}
          />
        }
      />

      <PracticeLoadStatus
        state={state}
        loadProgress={loadProgress}
        loadIndeterminate={loadIndeterminate}
        loadError={loadError}
        onRetry={onRetry}
      />

      <PracticeEncouragementOverlay encouragement={encouragement} variant="orange" />

      <div
        className={`grid flex-1 gap-2 sm:gap-2.5 ${gridColumns(options.length)}`}
        role="group"
        aria-label="音程选项"
        aria-live="polite"
      >
        {options.map((interval) => {
          const isReady = canAnswer
          const isCorrectAnswer = isWrong && lastQuiz?.interval.id === interval.id

          return (
            <ChallengeAnswerButton
              key={interval.id}
              disabled={!canAnswer}
              isReady={isReady}
              isListening={isListening}
              isCorrectAnswer={isCorrectAnswer}
              onClick={() => onSelect(interval.id)}
              primaryLabel={
                <span className="text-base font-bold leading-none sm:text-lg">{interval.short}</span>
              }
              secondaryLabel={
                <AnswerSecondaryLabel active={isReady}>{interval.name}</AnswerSecondaryLabel>
              }
            />
          )
        })}
      </div>
    </Card>
  )
}
