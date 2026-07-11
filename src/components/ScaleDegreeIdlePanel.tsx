import {
  formatMelodyDegrees,
  getMelodyScaleDegreeQuizKey,
  isMelodyScaleDegreeQuiz,
  type MelodyScaleDegreeQuiz,
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
import { PlayAreaCard } from './PlayAreaCard'
import { PlayableMelodyAnswerCard } from './PlayableMelodyAnswerCard'
import { ResetStatsButton } from './ResetStatsButton'
import { Button } from './ui/Button'

type ScaleDegreeIdlePanelProps = {
  lastQuiz: ScaleDegreeQuiz | null
  sessionStats: SessionStats
  sessionMistakes: ScaleDegreeMistakeStatsStore
  sessionMelodyMistakes: ScaleDegreeMelodyMistakeStatsStore
  trainingStats: TrainingStatsViewModel
  scaleDegreeReviewEnabled: boolean
  scaleDegreeMelodyEnabled: boolean
  isRunning: boolean
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayMelodyQuiz: (quiz: MelodyScaleDegreeQuiz) => void
  onScaleDegreeReviewChange: (enabled: boolean) => void
  onScaleDegreeMelodyChange: (enabled: boolean) => void
  onHome: () => void
}

function formatLastAnswerLabel(lastQuiz: ScaleDegreeQuiz, melodyEnabled: boolean): string {
  if (melodyEnabled && isMelodyScaleDegreeQuiz(lastQuiz)) {
    return `旋律 ${formatMelodyDegrees(lastQuiz.degrees)}`
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
  scaleDegreeMelodyEnabled,
  isRunning,
  replayingQuizKey,
  isReplayBusy,
  onPlayMelodyQuiz,
  onScaleDegreeReviewChange,
  onScaleDegreeMelodyChange,
  onHome,
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
  const sessionHistory = scaleDegreeMelodyEnabled
    ? scaleDegreeMelodySessionHistory
    : scaleDegreeSessionHistory
  const bestRecord = scaleDegreeMelodyEnabled ? scaleDegreeMelodyBestRecord : scaleDegreeBestRecord
  const isNewBestRecord = scaleDegreeMelodyEnabled
    ? isNewScaleDegreeMelodyBestRecord
    : isNewScaleDegreeBestRecord
  const modeLabel = scaleDegreeMelodyEnabled ? '三音旋律' : '单音'
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const melodyLastQuiz =
    lastQuiz && scaleDegreeMelodyEnabled && isMelodyScaleDegreeQuiz(lastQuiz) ? lastQuiz : null
  const historicalMistakeStats = scaleDegreeMelodyEnabled
    ? scaleDegreeMelodyMistakeStats
    : scaleDegreeMistakeStats
  const hasHistoricalMistakes = historicalMistakeStats.length > 0

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-7">
        {melodyLastQuiz && (
          <PlayableMelodyAnswerCard
            quiz={melodyLastQuiz}
            isPlaying={replayingQuizKey === getMelodyScaleDegreeQuizKey(melodyLastQuiz)}
            disabled={isReplayBusy && replayingQuizKey !== getMelodyScaleDegreeQuizKey(melodyLastQuiz)}
            onPlay={() => onPlayMelodyQuiz(melodyLastQuiz)}
          />
        )}

        <ChallengeSessionResults
          accent="sky"
          sessionStats={sessionStats}
          subtitle={`${modeLabel} · ${lastQuiz?.keyLabel ?? ''}`}
          isNewBestRecord={isNewBestRecord}
          bestRecord={bestRecord}
          scoreLabel={scaleDegreeMelodyEnabled ? '总分' : '加权总分'}
        />

        {sessionHistory.length >= 2 && (
          <ScaleDegreeCorrectCountChart records={sessionHistory} highlightLast />
        )}

        {lastQuiz && !melodyLastQuiz && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">正确答案</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">
              {formatLastAnswerLabel(lastQuiz, scaleDegreeMelodyEnabled)}
              <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                ({lastQuiz.keyLabel})
              </span>
            </p>
          </div>
        )}

        {scaleDegreeMelodyEnabled ? (
          <ScaleDegreeMelodyMistakeSummary
            store={sessionMelodyMistakes}
            sessionStats={sessionStats}
            title="本局旋律统计"
          />
        ) : (
          <ScaleDegreeMistakeSummary
            store={sessionMistakes}
            sessionStats={sessionStats}
            title="本局音级分布"
          />
        )}

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
        <p className="mt-1 text-sm text-[var(--text-secondary)]">两种训练共享同一套大调音级体系，答错即结束本轮。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="音级训练方式">
        <button type="button" role="radio" aria-checked={!scaleDegreeMelodyEnabled} disabled={isRunning} onClick={() => onScaleDegreeMelodyChange(false)} className={`rounded-2xl border p-5 text-left transition ${!scaleDegreeMelodyEnabled ? 'border-sky-400 bg-sky-400/10 ring-1 ring-sky-400/20' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-white/20'}`}>
          <span className="flex items-center justify-between"><strong className="text-lg">单音定位</strong><span className={`h-3 w-3 rounded-full ${!scaleDegreeMelodyEnabled ? 'bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,.15)]' : 'bg-white/15'}`} /></span>
          <span className="mt-2 block text-sm leading-6 text-[var(--text-secondary)]">听一个音，判断它是当前调性的第几级。适合建立稳定的调性感。</span>
          <span className="mt-4 block text-xs font-medium text-sky-300">推荐从这里开始</span>
        </button>
        <button type="button" role="radio" aria-checked={scaleDegreeMelodyEnabled} disabled={isRunning} onClick={() => onScaleDegreeMelodyChange(true)} className={`rounded-2xl border p-5 text-left transition ${scaleDegreeMelodyEnabled ? 'border-sky-400 bg-sky-400/10 ring-1 ring-sky-400/20' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-white/20'}`}>
          <span className="flex items-center justify-between"><strong className="text-lg">旋律追踪</strong><span className={`h-3 w-3 rounded-full ${scaleDegreeMelodyEnabled ? 'bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,.15)]' : 'bg-white/15'}`} /></span>
          <span className="mt-2 block text-sm leading-6 text-[var(--text-secondary)]">聆听三音短句，依次判断音级。适合进阶到真实旋律听辨。</span>
          <span className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">进阶训练</span>
        </button>
      </div>

      {sessionHistory.length >= 2 && (
        <div className="flex w-full justify-center"><ScaleDegreeCorrectCountChart records={sessionHistory} /></div>
      )}

      {bestRecord && (
        <div className="mx-auto w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
          <p className="text-xs text-[var(--text-secondary)]">{modeLabel}最佳连对</p>
          <p className="mt-1 text-lg font-semibold text-sky-200">{bestRecord.correctCount} 题</p>
        </div>
      )}

      {scaleDegreeMelodyEnabled ? (
        <div className="flex w-full justify-center"><ScaleDegreeMelodyMistakeSummary store={scaleDegreeMelodyMistakeStats} title="历史错题统计" /></div>
      ) : (
        <div className="flex w-full justify-center"><ScaleDegreeMistakeSummary store={scaleDegreeMistakeStats} title="历史错题统计" /></div>
      )}

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
          <span className="text-sm font-medium">优先练习错题</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {hasHistoricalMistakes
              ? scaleDegreeMelodyEnabled
                ? '优先出历史易错旋律'
                : '优先出历史错题，加强薄弱音级'
              : '暂无错题可复习'}
          </span>
        </span>
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-sky-500" checked={scaleDegreeReviewEnabled} disabled={!hasHistoricalMistakes || isRunning} onChange={(event) => onScaleDegreeReviewChange(event.target.checked)} />
      </label>

      {canReset && <div className="flex w-full justify-center"><ResetStatsButton onReset={reset} /></div>}

    </PlayAreaCard>
  )
}
