import { CHORD_DEGREE_IDS, type ChordDegreeQuiz } from '../quiz/chordDegreeQuiz'
import type { TrainerState } from '../quiz/sequencer'
import type { SessionStats } from '../quiz/stats'
import { usePracticePlayfieldState } from '../hooks/usePracticePlayfieldState'
import { ChallengeAnswerButton } from './practice/ChallengeAnswerButton'
import { PracticePhaseIndicator } from './practice/PracticePhaseIndicator'
import { PracticeSessionHeader } from './practice/PracticeSessionHeader'
import { Card } from '../common/ui/Card'
import { Button } from '../common/ui/Button'

type Props = { state: TrainerState; sessionStats: SessionStats; quiz: ChordDegreeQuiz | null; wrongSelection: string | null; optionDegrees: readonly number[]; replayCount: number; onSelect: (degree: string) => void; onPlayDo: () => void; onPlayChord: () => void; onPlaySequence: () => void; onPlaySelected: () => void; onPlayComparison: () => void }

export function ChordDegreePlayfield({ state, sessionStats, quiz, wrongSelection, optionDegrees, replayCount, onSelect, onPlayDo, onPlayChord, onPlaySequence, onPlaySelected, onPlayComparison }: Props) {
  const { isCorrection, isWrong, correctCount, totalScore, currentQuestion, isListening } = usePracticePlayfieldState(state, sessionStats)
  const canAnswer = state === 'awaiting_answer' || isCorrection
  return <Card className="flex flex-1 flex-col gap-5 p-4 sm:p-5">
    <PracticeSessionHeader variant="scaleDegree" currentQuestion={currentQuestion} correctCount={correctCount} totalScore={totalScore} trailing={<PracticePhaseIndicator state={state} variant="scaleDegree" />} />
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="text-center"><p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">{state === 'playing_root' || state === 'playing_note' || state === 'playing_tonic_chord' ? '正在建立调性' : isListening ? '聆听和弦' : '选择和弦级数'}</p>{isCorrection && <p className="mt-2 text-sm text-amber-200">第一次选择不对，用对比试听再找一次</p>}<p className="mt-2 text-xs text-[var(--text-secondary)]">重听不会扣分 · 本题已播放 {replayCount} 次</p></div>
      <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
        <Button type="button" variant="ghost" onClick={onPlayDo} className="min-h-11">♪ do</Button>
        <Button type="button" variant="ghost" onClick={onPlayChord} disabled={!quiz} className="min-h-11">♪ 题目和弦</Button>
        <Button type="button" variant="ghost" onClick={onPlaySequence} disabled={!quiz} className="min-h-11">♪ do → 和弦</Button>
      </div>
      {isCorrection && wrongSelection && <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-2"><Button variant="ghost" onClick={onPlaySelected}>所选 {wrongSelection} 级</Button><Button variant="ghost" onClick={onPlayChord}>播放题目</Button><Button variant="ghost" onClick={onPlayComparison}>对比播放</Button></div>}
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-2">
        {CHORD_DEGREE_IDS.filter((degree) => optionDegrees.includes(Number(degree))).map((degree) => <ChallengeAnswerButton key={degree} disabled={!canAnswer} isReady={canAnswer} isListening={isListening} isCorrectAnswer={isWrong && String(quiz?.degree) === degree} isWrongSelection={(isCorrection || isWrong) && wrongSelection === degree} onClick={() => onSelect(degree)} className="min-h-16" primaryLabel={<span className="text-2xl font-bold">{degree}</span>} />)}
      </div>
    </div>
  </Card>
}
