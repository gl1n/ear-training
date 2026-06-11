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

const SINGLE_NOTE_HOW_TO_STEPS = [
  { step: '1', title: '定调', desc: '播放 I 级大三和弦' },
  { step: '2', title: '听音', desc: '辨认调内单音' },
  { step: '3', title: '选级', desc: '点选 1–7 音级' },
] as const

const MELODY_HOW_TO_STEPS = [
  { step: '1', title: '定调', desc: '播放 I 级大三和弦' },
  { step: '2', title: '听旋律', desc: '一次顺序播放 3 个音' },
  { step: '3', title: '选级', desc: '第三音起逐音选级，选错即结束' },
] as const

function HowToPlay({ melodyEnabled }: { melodyEnabled: boolean }) {
  const steps = melodyEnabled ? MELODY_HOW_TO_STEPS : SINGLE_NOTE_HOW_TO_STEPS
  return (
    <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
      {steps.map(({ step, title, desc }, index) => (
        <div key={step} className="relative flex flex-col items-center">
          {index < steps.length - 1 && (
            <span
              className="absolute left-[calc(50%+1.25rem)] top-5 hidden h-px w-[calc(100%-2.5rem)] bg-sky-400/20 sm:block"
              aria-hidden="true"
            />
          )}
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sm font-bold text-sky-200">
            {step}
          </span>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-secondary)]">{desc}</p>
        </div>
      ))}
    </div>
  )
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
    <PlayAreaCard className="gap-7">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sky-200">
          音级辨识
        </span>
        <p className="max-w-sm text-base font-medium leading-relaxed text-[var(--text-primary)]">
          {scaleDegreeMelodyEnabled
            ? '随机大调 · 三音旋律 · 连对挑战'
            : '随机大调 · 听音选级 · 连对挑战'}
        </p>
        <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          答错即结束，尽可能连对更多题
        </p>
      </div>

      <HowToPlay melodyEnabled={scaleDegreeMelodyEnabled} />

      {sessionHistory.length >= 2 && (
        <ScaleDegreeCorrectCountChart records={sessionHistory} />
      )}

      {bestRecord && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
          <p className="text-xs text-[var(--text-secondary)]">{modeLabel}最佳连对</p>
          <p className="mt-1 text-lg font-semibold text-sky-200">{bestRecord.correctCount} 题</p>
        </div>
      )}

      {scaleDegreeMelodyEnabled ? (
        <ScaleDegreeMelodyMistakeSummary
          store={scaleDegreeMelodyMistakeStats}
          title="历史错题统计"
        />
      ) : (
        <ScaleDegreeMistakeSummary store={scaleDegreeMistakeStats} title="历史错题统计" />
      )}

      <label
        className={[
          'flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors',
          scaleDegreeMelodyEnabled
            ? 'border-sky-400/35 bg-sky-500/10'
            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-sky-400/20',
          isRunning ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        <input
          type="checkbox"
          className="mt-0.5 accent-sky-500"
          checked={scaleDegreeMelodyEnabled}
          disabled={isRunning}
          onChange={(event) => onScaleDegreeMelodyChange(event.target.checked)}
        />
        <span className="flex flex-col gap-1 text-left">
          <span className="text-sm font-medium">三音旋律</span>
          <span className="text-xs text-[var(--text-secondary)]">
            一次播放 3 个音，第三音起逐音选级
          </span>
        </span>
      </label>

      <label
        className={[
          'flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors',
          scaleDegreeReviewEnabled
            ? 'border-sky-400/35 bg-sky-500/10'
            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-sky-400/20',
          !hasHistoricalMistakes || isRunning ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        <input
          type="checkbox"
          className="mt-0.5 accent-sky-500"
          checked={scaleDegreeReviewEnabled}
          disabled={!hasHistoricalMistakes || isRunning}
          onChange={(event) => onScaleDegreeReviewChange(event.target.checked)}
        />
        <span className="flex flex-col gap-1 text-left">
          <span className="text-sm font-medium">复习模式</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {hasHistoricalMistakes
              ? scaleDegreeMelodyEnabled
                ? '优先出历史易错旋律'
                : '优先出历史错题，加强薄弱音级'
              : '暂无错题可复习'}
          </span>
        </span>
      </label>

      {canReset && <ResetStatsButton onReset={reset} />}

      <Button onClick={onHome} variant="ghost" className="w-full max-w-sm py-3">
        回到首页
      </Button>
    </PlayAreaCard>
  )
}
