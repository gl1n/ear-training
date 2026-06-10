import type { ScaleDegreeQuiz } from '../quiz/keys'
import type { ScaleDegreeMistakeStatsStore } from '../quiz/scaleDegreeMistakeStats'
import {
  getCorrectAnswerCount,
  getTotalScore,
  hasSessionAttempts,
  type SessionStats,
} from '../quiz/stats'
import type { TrainingStatsViewModel } from '../hooks/useTrainingStats'
import { formatScoreDisplay } from '../lib/formatScore'
import { ChallengeEndedSection, ChallengeScoreCard } from './practice/ChallengeEndedSection'
import { ScaleDegreeCorrectCountChart } from './ScaleDegreeCorrectCountChart'
import { ScaleDegreeMistakeSummary } from './ScaleDegreeMistakeSummary'
import { PlayAreaCard } from './PlayAreaCard'
import { ResetStatsButton } from './ResetStatsButton'
import { Button } from './ui/Button'

type ScaleDegreeIdlePanelProps = {
  lastQuiz: ScaleDegreeQuiz | null
  sessionStats: SessionStats
  sessionMistakes: ScaleDegreeMistakeStatsStore
  trainingStats: TrainingStatsViewModel
  scaleDegreeReviewEnabled: boolean
  isRunning: boolean
  onScaleDegreeReviewChange: (enabled: boolean) => void
  onHome: () => void
}

const HOW_TO_STEPS = [
  { step: '1', title: '定调', desc: '播放 I 级大三和弦' },
  { step: '2', title: '听音', desc: '辨认调内单音' },
  { step: '3', title: '选级', desc: '点选 1–7 音级' },
] as const

function HowToPlay() {
  return (
    <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
      {HOW_TO_STEPS.map(({ step, title, desc }, index) => (
        <div key={step} className="relative flex flex-col items-center">
          {index < HOW_TO_STEPS.length - 1 && (
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

export function ScaleDegreeIdlePanel({
  lastQuiz,
  sessionStats,
  sessionMistakes,
  trainingStats,
  scaleDegreeReviewEnabled,
  isRunning,
  onScaleDegreeReviewChange,
  onHome,
}: ScaleDegreeIdlePanelProps) {
  const {
    scaleDegreeMistakeStats,
    scaleDegreeSessionHistory,
    scaleDegreeBestRecord,
    isNewScaleDegreeBestRecord,
    canReset,
    reset,
  } = trainingStats
  const gameEnded = lastQuiz !== null && hasSessionAttempts(sessionStats)
  const correctCount = getCorrectAnswerCount(sessionStats)
  const totalScore = getTotalScore(sessionStats)
  const hasHistoricalMistakes = scaleDegreeMistakeStats.length > 0

  if (gameEnded) {
    return (
      <PlayAreaCard className="gap-7">
        <ChallengeEndedSection
          accent="sky"
          subtitle={lastQuiz?.keyLabel}
          isNewBestRecord={isNewScaleDegreeBestRecord}
          bestRecord={scaleDegreeBestRecord}
        >
          <ChallengeScoreCard value={correctCount} label="连对题数" highlight />
          <ChallengeScoreCard
            value={formatScoreDisplay(totalScore)}
            label="加权总分"
            highlight
            variant="score"
          />
        </ChallengeEndedSection>

        {scaleDegreeSessionHistory.length >= 2 && (
          <ScaleDegreeCorrectCountChart records={scaleDegreeSessionHistory} highlightLast />
        )}

        {lastQuiz && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">正确答案</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">
              音级 {lastQuiz.degree}
              <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                ({lastQuiz.keyLabel})
              </span>
            </p>
          </div>
        )}

        <ScaleDegreeMistakeSummary
          store={sessionMistakes}
          sessionStats={sessionStats}
          title="本局音级分布"
        />

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
          随机大调 · 听音选级 · 连对挑战
        </p>
        <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          答错即结束，尽可能连对更多题
        </p>
      </div>

      <HowToPlay />

      {scaleDegreeSessionHistory.length >= 2 && (
        <ScaleDegreeCorrectCountChart records={scaleDegreeSessionHistory} />
      )}

      <ScaleDegreeMistakeSummary store={scaleDegreeMistakeStats} title="历史错题统计" />

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
              ? '优先出历史错题，加强薄弱音级'
              : '暂无错题可复习'}
          </span>
        </span>
      </label>

      {canReset && <ResetStatsButton onReset={reset} />}
    </PlayAreaCard>
  )
}
