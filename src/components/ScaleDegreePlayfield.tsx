import { DEGREE_OPTION_IDS, DEGREE_SOLFEGE_LABELS, isCrossRegisterScaleDegreeQuiz, isSequenceScaleDegreeQuiz, type ScaleDegreeQuiz, type ScaleDegreeTrainingMode } from '../quiz/keys'
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
  trainingMode?: ScaleDegreeTrainingMode
  melodyCorrectDegrees?: string[]
  currentQuiz?: ScaleDegreeQuiz | null
  isReplayBusy?: boolean
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  isLastQuestion?: boolean
  onSelect: (degree: string) => void
  onPlayDo?: () => void
  onReplayMelody?: () => void
  onNextQuestion?: () => void
  onRetry?: () => void
}

export function ScaleDegreePlayfield({
  state,
  sessionStats,
  lastQuiz,
  currentKeyLabel,
  encouragement,
  correctionWrongSelection,
  trainingMode = 'single',
  melodyCorrectDegrees = [],
  currentQuiz = null,
  isReplayBusy = false,
  loadProgress,
  loadIndeterminate,
  loadError,
  isLastQuestion = false,
  onSelect,
  onPlayDo,
  onReplayMelody,
  onNextQuestion,
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
  const sequenceEnabled = trainingMode !== 'single'
  const sequenceNoteCount = trainingMode === 'crossRegister' ? 2 : 3
  const crossRegisterQuiz =
    currentQuiz !== null && isCrossRegisterScaleDegreeQuiz(currentQuiz) ? currentQuiz : null
  const getRegisterLabel = (index: number) => {
    const register = crossRegisterQuiz?.registers[index]
    if (register === 'high') return '高音区'
    if (register === 'middle') return '中音区'
    return '低音区'
  }
  const isReviewingAnswer =
    trainingMode === 'crossRegister' &&
    state === 'answer_revealed' &&
    crossRegisterQuiz !== null
  const canAnswer = !isReplayBusy && (
    sequenceEnabled
      ? state === 'playing_note' || state === 'awaiting_answer' || state === 'answer_correction'
      : baseCanAnswer)
  const canReplayMelody =
    sequenceEnabled &&
    currentQuiz !== null &&
    isSequenceScaleDegreeQuiz(currentQuiz) &&
    (state === 'awaiting_answer' || state === 'answer_correction' || state === 'answer_revealed')
  const canPlayDo =
    trainingMode === 'crossRegister' &&
    currentQuiz !== null &&
    (state === 'awaiting_answer' || state === 'answer_correction' || state === 'answer_revealed')
  const melodyPrompt = isReviewingAnswer
    ? '最终答案'
    : sequenceEnabled && canAnswer
    ? trainingMode === 'crossRegister'
      ? `选择${getRegisterLabel(melodyCorrectDegrees.length)}音的音级`
      : `选择第 ${melodyCorrectDegrees.length + 1} 个音的音级`
    : sequenceEnabled
      ? trainingMode === 'crossRegister' ? '聆听跨音区双音' : '聆听旋律'
      : '选择音级'

  const renderDegree = (degree: string) => (
    <ChallengeAnswerButton
      key={degree}
      disabled={!canAnswer}
      isReady={canAnswer}
      isListening={isListening && !canAnswer}
      isCorrectAnswer={
        isWrong &&
        !sequenceEnabled &&
        lastQuiz !== null &&
        String(lastQuiz.degree) === degree
      }
      isWrongSelection={
        (isCorrection || (isWrong && sequenceEnabled)) &&
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
            melodyEnabled={sequenceEnabled}
            sequenceNoteCount={sequenceNoteCount}
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

        {isReviewingAnswer && (
          <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3">
            {crossRegisterQuiz.degrees.map((degree, index) => (
              <div
                key={`${degree}-${index}`}
                className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-4 text-center"
              >
                <p className="text-xs text-[var(--text-secondary)]">
                  第 {index + 1} 音 · {getRegisterLabel(index)}
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-200">{degree}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-emerald-100/65">
                  {DEGREE_SOLFEGE_LABELS[String(degree) as (typeof DEGREE_OPTION_IDS)[number]]}
                </p>
              </div>
            ))}
          </div>
        )}

        {!isReviewingAnswer && sequenceEnabled && melodyCorrectDegrees.length > 0 && (
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

        {(canPlayDo || canReplayMelody) && (
          <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
            {canPlayDo && (
              <Button variant="ghost" disabled={isReplayBusy} onClick={onPlayDo}>
                ♪ 播放 do
              </Button>
            )}
            {canReplayMelody && (
              <Button variant="ghost" disabled={isReplayBusy} onClick={onReplayMelody}>
                {isReplayBusy ? '重听中…' : trainingMode === 'crossRegister' ? '重听双音' : '重听旋律'}
              </Button>
            )}
          </div>
        )}

        {isReviewingAnswer && (
          <Button
            disabled={isReplayBusy}
            onClick={onNextQuestion}
            className="mx-auto min-w-36"
          >
            {isLastQuestion ? '查看结果' : '下一题'}
          </Button>
        )}

        {!isReviewingAnswer && <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:gap-2.5">
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {DEGREE_OPTION_IDS.slice(0, 4).map(renderDegree)}
          </div>
          <div className="grid grid-cols-3 gap-2 px-[12.5%] sm:gap-2.5">
            {DEGREE_OPTION_IDS.slice(4).map(renderDegree)}
          </div>
        </div>}
      </div>
    </Card>
  )
}
