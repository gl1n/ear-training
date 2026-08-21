import {
  formatMelodyDegrees,
  getScaleDegreeSequenceQuizKey,
  isSequenceScaleDegreeQuiz,
  type ScaleDegreeTrainingMode,
  type SequenceScaleDegreeQuiz,
  type ScaleDegreeQuiz,
} from '../quiz/keys'
import type { ScaleDegreeMistakeStatsStore } from '../quiz/scaleDegreeMistakeStats'
import type { ScaleDegreeMelodyMistakeStatsStore } from '../quiz/scaleDegreeMelodyMistakeStats'
import { hasSessionAttempts, type SessionStats } from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { ChallengeSessionResults } from './practice/ChallengeSessionResults'
import { ScaleDegreeCorrectCountChart } from './ScaleDegreeCorrectCountChart'
import { ScaleDegreeMelodyMistakeSummary } from './ScaleDegreeMelodyMistakeSummary'
import { ScaleDegreeMistakeSummary } from './ScaleDegreeMistakeSummary'
import { ScaleDegreeAdvancedAnalysis } from './ScaleDegreeAdvancedAnalysis'
import { PlayAreaCard } from './PlayAreaCard'
import { PlayableMelodyAnswerCard } from './PlayableMelodyAnswerCard'
import { ResetStatsButton } from './ResetStatsButton'
import { Button } from '../common/ui/Button'

type ScaleDegreeIdlePanelProps = {
  lastQuiz: ScaleDegreeQuiz | null
  sessionStats: SessionStats
  sessionMistakes: ScaleDegreeMistakeStatsStore
  sessionMelodyMistakes: ScaleDegreeMelodyMistakeStatsStore
  trainingStats: TrainingStatsViewModel
  scaleDegreeReviewEnabled: boolean
  scaleDegreeTrainingMode: ScaleDegreeTrainingMode
  isRunning: boolean
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayMelodyQuiz: (quiz: SequenceScaleDegreeQuiz) => void
  onScaleDegreeReviewChange: (enabled: boolean) => void
  onScaleDegreeTrainingModeChange: (mode: ScaleDegreeTrainingMode) => void
  onHome: () => void
  sessionCompleted: boolean
  onPracticeWeakest: () => void
}

function formatLastAnswerLabel(lastQuiz: ScaleDegreeQuiz): string {
  if (isSequenceScaleDegreeQuiz(lastQuiz)) {
    const label = lastQuiz.sequenceType === 'crossRegister' ? '跨音区' : '旋律'
    return `${label} ${formatMelodyDegrees(lastQuiz.degrees)}`
  }

  return `音级 ${lastQuiz.degree}`
}

export function ScaleDegreeIdlePanel({
  lastQuiz,
  sessionStats,
  sessionMistakes,
  sessionMelodyMistakes,
  trainingStats,
  scaleDegreeReviewEnabled,
  scaleDegreeTrainingMode,
  isRunning,
  replayingQuizKey,
  isReplayBusy,
  onPlayMelodyQuiz,
  onScaleDegreeReviewChange,
  onScaleDegreeTrainingModeChange,
  onHome,
  sessionCompleted,
  onPracticeWeakest,
}: ScaleDegreeIdlePanelProps) {
  const {
    scaleDegreeMistakeStats,
    scaleDegreeMelodyMistakeStats,
    scaleDegreeSessionHistory,
    scaleDegreeMelodySessionHistory,
    scaleDegreeBestRecord,
    isNewScaleDegreeBestRecord,
    scaleDegreeMelodyBestRecord,
    isNewScaleDegreeMelodyBestRecord,
    canReset,
    reset,
  } = trainingStats
  const sequenceEnabled = scaleDegreeTrainingMode !== 'single'
  const melodyEnabled = scaleDegreeTrainingMode === 'melody'
  const sessionHistory = melodyEnabled
    ? scaleDegreeMelodySessionHistory
    : scaleDegreeTrainingMode === 'single' ? scaleDegreeSessionHistory : []
  const bestRecord = melodyEnabled
    ? scaleDegreeMelodyBestRecord
    : scaleDegreeTrainingMode === 'single' ? scaleDegreeBestRecord : null
  const isNewBestRecord = melodyEnabled
    ? isNewScaleDegreeMelodyBestRecord
    : scaleDegreeTrainingMode === 'single' ? isNewScaleDegreeBestRecord : false
  const modeLabel = scaleDegreeTrainingMode === 'crossRegister'
    ? '跨音区双音'
    : melodyEnabled ? '三音旋律' : '单音'
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const melodyLastQuiz =
    lastQuiz && sequenceEnabled && isSequenceScaleDegreeQuiz(lastQuiz) ? lastQuiz : null
  const historicalMistakeStats = melodyEnabled
    ? scaleDegreeMelodyMistakeStats
    : scaleDegreeTrainingMode === 'single' ? scaleDegreeMistakeStats : []
  const hasHistoricalMistakes = historicalMistakeStats.length > 0

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-7">
        {melodyLastQuiz && (
          <PlayableMelodyAnswerCard
            quiz={melodyLastQuiz}
            isPlaying={replayingQuizKey === getScaleDegreeSequenceQuizKey(melodyLastQuiz)}
            disabled={isReplayBusy && replayingQuizKey !== getScaleDegreeSequenceQuizKey(melodyLastQuiz)}
            onPlay={() => onPlayMelodyQuiz(melodyLastQuiz)}
          />
        )}

        <ChallengeSessionResults
          accent="sky"
          sessionStats={sessionStats}
          subtitle={`${modeLabel} · ${lastQuiz?.keyLabel ?? ''}`}
          isNewBestRecord={isNewBestRecord}
          bestRecord={bestRecord}
          scoreLabel={sequenceEnabled ? '总分' : '加权总分'}
        />

        {sessionCompleted && scaleDegreeTrainingMode !== 'crossRegister' && (
          <div className="rounded-xl border border-sky-400/25 bg-sky-400/8 p-4 text-center">
            <p className="font-medium text-sky-200">本轮目标已完成</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">可进行错题与常规题混合训练，兼顾薄弱项和整体辨识。</p>
            <Button onClick={onPracticeWeakest} className="mt-3 min-h-11">开始混合强化</Button>
          </div>
        )}

        {sessionHistory.length >= 2 && (
          <ScaleDegreeCorrectCountChart records={sessionHistory} highlightLast />
        )}

        {lastQuiz && !melodyLastQuiz && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">正确答案</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">
              {formatLastAnswerLabel(lastQuiz)}
              <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                ({lastQuiz.keyLabel})
              </span>
            </p>
          </div>
        )}

        {melodyEnabled ? (
          <ScaleDegreeMelodyMistakeSummary
            store={sessionMelodyMistakes}
            sessionStats={sessionStats}
            title="本局旋律统计"
          />
        ) : scaleDegreeTrainingMode === 'single' ? (
          <ScaleDegreeMistakeSummary
            store={sessionMistakes}
            sessionStats={sessionStats}
            title="本局音级分布"
          />
        ) : null}

        {canReset && <ResetStatsButton onReset={reset} />}

        <Button onClick={onHome} variant="ghost" className="w-full max-w-sm py-3">
          回到首页
        </Button>
      </PlayAreaCard>
    )
  }

  return (
    <PlayAreaCard centered={false} className="gap-7">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-sky-300">训练方式</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">你想练什么？</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">三种训练共享同一套大调音级体系，答错纠正后继续完成本轮。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="音级训练方式">
        <button type="button" role="radio" aria-checked={scaleDegreeTrainingMode === 'single'} disabled={isRunning} onClick={() => onScaleDegreeTrainingModeChange('single')} className={`rounded-2xl border p-5 text-left transition ${scaleDegreeTrainingMode === 'single' ? 'border-sky-400 bg-sky-400/10 ring-1 ring-sky-400/20' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-white/20'}`}>
          <span className="flex items-center justify-between"><strong className="text-lg">单音定位</strong><span className={`h-3 w-3 rounded-full ${scaleDegreeTrainingMode === 'single' ? 'bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,.15)]' : 'bg-white/15'}`} /></span>
          <span className="mt-2 block text-sm leading-6 text-[var(--text-secondary)]">听一个音，判断它是当前调性的第几级。适合建立稳定的调性感。</span>
          <span className="mt-4 block text-xs font-medium text-sky-300">推荐从这里开始</span>
        </button>
        <button type="button" role="radio" aria-checked={scaleDegreeTrainingMode === 'crossRegister'} disabled={isRunning} onClick={() => onScaleDegreeTrainingModeChange('crossRegister')} className={`rounded-2xl border p-5 text-left transition ${scaleDegreeTrainingMode === 'crossRegister' ? 'border-sky-400 bg-sky-400/10 ring-1 ring-sky-400/20' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-white/20'}`}>
          <span className="flex items-center justify-between"><strong className="text-lg">跨音区定位</strong><span className={`h-3 w-3 rounded-full ${scaleDegreeTrainingMode === 'crossRegister' ? 'bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,.15)]' : 'bg-white/15'}`} /></span>
          <span className="mt-2 block text-sm leading-6 text-[var(--text-secondary)]">以当前调的 do 划分低、中、高音区，随机跨区播放两音，再按顺序判断音级。</span>
          <span className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">基础跨区训练</span>
        </button>
        <button type="button" role="radio" aria-checked={melodyEnabled} disabled={isRunning} onClick={() => onScaleDegreeTrainingModeChange('melody')} className={`rounded-2xl border p-5 text-left transition ${melodyEnabled ? 'border-sky-400 bg-sky-400/10 ring-1 ring-sky-400/20' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-white/20'}`}>
          <span className="flex items-center justify-between"><strong className="text-lg">旋律追踪</strong><span className={`h-3 w-3 rounded-full ${melodyEnabled ? 'bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,.15)]' : 'bg-white/15'}`} /></span>
          <span className="mt-2 block text-sm leading-6 text-[var(--text-secondary)]">聆听三音短句，依次判断音级。适合进阶到真实旋律听辨。</span>
          <span className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">进阶训练</span>
        </button>
      </div>

      {sessionHistory.length >= 2 && (
        <div className="flex w-full justify-center"><ScaleDegreeCorrectCountChart records={sessionHistory} /></div>
      )}

      {bestRecord && (
        <div className="mx-auto w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
          <p className="text-xs text-[var(--text-secondary)]">{modeLabel}最佳答对</p>
          <p className="mt-1 text-lg font-semibold text-sky-200">{bestRecord.correctCount} 题</p>
        </div>
      )}

      {melodyEnabled ? (
        <div className="flex w-full justify-center"><ScaleDegreeMelodyMistakeSummary store={scaleDegreeMelodyMistakeStats} title="历史错题统计" /></div>
      ) : scaleDegreeTrainingMode === 'single' ? (
        <><div className="flex w-full justify-center"><ScaleDegreeAdvancedAnalysis store={scaleDegreeMistakeStats} /></div><div className="flex w-full justify-center"><ScaleDegreeMistakeSummary store={scaleDegreeMistakeStats} title="历史错题统计" /></div></>
      ) : null}

      <label
        className={[
          'flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors',
          scaleDegreeReviewEnabled
            ? 'border-sky-400/35 bg-sky-500/10'
            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-sky-400/20',
          !hasHistoricalMistakes || isRunning ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        <span className="flex flex-col gap-1 text-left">
          <span className="text-sm font-medium">智能弱项专项</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {hasHistoricalMistakes
              ? melodyEnabled
                ? '约六成易错旋律，搭配四成常规旋律'
                : '约六成高权重错误模式，搭配四成全音级巩固'
              : '暂无错题可复习'}
          </span>
        </span>
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-sky-500" checked={scaleDegreeReviewEnabled} disabled={!hasHistoricalMistakes || isRunning} onChange={(event) => onScaleDegreeReviewChange(event.target.checked)} />
      </label>

      {canReset && <div className="flex w-full justify-center"><ResetStatsButton onReset={reset} /></div>}

    </PlayAreaCard>
  )
}
