import { DEGREE_OPTION_IDS, DEGREE_SOLFEGE_LABELS, isMelodyScaleDegreeQuiz, type ScaleDegreeQuiz } from '../quiz/keys'
import { type TrainerState } from '../quiz/sequencer'
import { type SessionStats } from '../quiz/stats'
import { usePracticePlayfieldState } from '../hooks/usePracticePlayfieldState'
import { AnswerSecondaryLabel } from './practice/AnswerSecondaryLabel'
import { ChallengeAnswerButton } from './practice/ChallengeAnswerButton'
import { KeyLabel } from './practice/KeyLabel'
import { PracticeEncouragementOverlay } from './practice/PracticeEncouragementOverlay'
import { PracticeLoadStatus } from './practice/PracticeLoadStatus'
import { PracticePhaseIndicator } from './practice/PracticePhaseIndicator'
import { PracticeSessionHeader } from './practice/PracticeSessionHeader'
import type { PracticeEncouragement } from './practice/types'
import { Card } from '../common/ui/Card'
import { Button } from '../common/ui/Button'

type ScaleDegreePlayfieldProps = {
  state: TrainerState
  sessionStats: SessionStats
  lastQuiz: ScaleDegreeQuiz | null
  currentKeyLabel: string | null
  encouragement: PracticeEncouragement | null
  correctionWrongSelection: string | null
  melodyEnabled?: boolean
  melodyCorrectDegrees?: string[]
  currentQuiz?: ScaleDegreeQuiz | null
  isReplayBusy?: boolean
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onSelect: (degree: string) => void
  onReplayMelody?: () => void
  onRetry?: () => void
}

export function ScaleDegreePlayfield({
  state,
  sessionStats,
  lastQuiz,
  currentKeyLabel,
  encouragement,
  correctionWrongSelection,
  melodyEnabled = false,
  melodyCorrectDegrees = [],
  currentQuiz = null,
  isReplayBusy = false,
  loadProgress,
  loadIndeterminate,
  loadError,
  onSelect,
  onReplayMelody,
  onRetry,
}: ScaleDegreePlayfieldProps) {
  const {
    canAnswer: baseCanAnswer,
    isCorrection,
    isWrong,
    correctCount,
    totalScore,
    currentQuestion,
    isListening,
  } = usePracticePlayfieldState(state, sessionStats)
  const canAnswer = !isReplayBusy && (
    melodyEnabled
      ? state === 'playing_note' || state === 'awaiting_answer' || state === 'answer_correction'
      : baseCanAnswer)
  const canReplayMelody =
    melodyEnabled &&
    currentQuiz !== null &&
    isMelodyScaleDegreeQuiz(currentQuiz) &&
    (state === 'awaiting_answer' || state === 'answer_correction')
  const melodyPrompt =
    melodyEnabled && canAnswer
      ? `选择第 ${melodyCorrectDegrees.length + 1} 个音的音级`
      : melodyEnabled
        ? '聆听旋律'
        : '选择音级'

  const renderDegree = (degree: string) => (
    <ChallengeAnswerButton
      key={degree}
      disabled={!canAnswer}
      isReady={canAnswer}
      isListening={isListening && !canAnswer}
      isCorrectAnswer={
        isWrong &&
        !melodyEnabled &&
        lastQuiz !== null &&
        String(lastQuiz.degree) === degree
      }
      isWrongSelection={
        (isCorrection || (isWrong && melodyEnabled)) &&
        correctionWrongSelection === degree
      }
      onClick={() => onSelect(degree)}
      className="min-h-[56px] sm:min-h-[64px]"
      primaryLabel={<span className="text-xl font-bold leading-none sm:text-2xl">{degree}</span>}
      secondaryLabel={
        <AnswerSecondaryLabel active={canAnswer} activeClassName="text-sky-200/80 opacity-100 uppercase tracking-wide">
          {DEGREE_SOLFEGE_LABELS[degree as (typeof DEGREE_OPTION_IDS)[number]]}
        </AnswerSecondaryLabel>
      }
    />
  )

  return (
    <Card
      variant="default"
      className="relative flex flex-1 flex-col gap-5 overflow-hidden p-4 sm:p-5"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-500/[0.06] to-transparent"
        aria-hidden="true"
      />

      <PracticeSessionHeader
        variant="scaleDegree"
        currentQuestion={currentQuestion}
        correctCount={correctCount}
        totalScore={totalScore}
        leading={currentKeyLabel ? <KeyLabel label={currentKeyLabel} variant="badge" /> : null}
        trailing={
          <PracticePhaseIndicator
            state={state}
            variant="scaleDegree"
            melodyEnabled={melodyEnabled}
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

      <PracticeEncouragementOverlay encouragement={encouragement} />

      <div
        className="relative flex flex-1 flex-col justify-center gap-3"
        role="group"
        aria-label="音级选项"
        aria-live="polite"
      >
        <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          {melodyPrompt}
        </p>

        {melodyEnabled && melodyCorrectDegrees.length > 0 && (
          <div className="mx-auto flex items-center justify-center gap-2">
            {melodyCorrectDegrees.map((degree, index) => (
              <span
                key={`${degree}-${index}`}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 text-sm font-semibold text-sky-100"
              >
                {degree}
              </span>
            ))}
          </div>
        )}

        {canReplayMelody && (
          <Button
            variant="ghost"
            disabled={isReplayBusy}
            onClick={onReplayMelody}
            className="mx-auto"
          >
            {isReplayBusy ? '重听中…' : '重听旋律'}
          </Button>
        )}

        <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:gap-2.5">
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {DEGREE_OPTION_IDS.slice(0, 4).map(renderDegree)}
          </div>
          <div className="grid grid-cols-3 gap-2 px-[12.5%] sm:gap-2.5">
            {DEGREE_OPTION_IDS.slice(4).map(renderDegree)}
          </div>
        </div>
      </div>
    </Card>
  )
}
