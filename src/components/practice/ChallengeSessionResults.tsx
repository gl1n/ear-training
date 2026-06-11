import type { ChallengeBestRecord } from '../../quiz/challengeBestRecord'
import {
  getCorrectAnswerCount,
  getTotalScore,
  type SessionStats,
} from '../../quiz/stats'
import { formatScoreDisplay } from '../../lib/formatScore'
import { ChallengeEndedSection, ChallengeScoreCard } from './ChallengeEndedSection'

type ChallengeSessionResultsProps = {
  accent: 'amber' | 'sky'
  sessionStats: SessionStats
  subtitle?: string
  isNewBestRecord: boolean
  bestRecord: ChallengeBestRecord | null
  scoreLabel?: string
}

export function ChallengeSessionResults({
  accent,
  sessionStats,
  subtitle,
  isNewBestRecord,
  bestRecord,
  scoreLabel = '加权总分',
}: ChallengeSessionResultsProps) {
  const correctCount = getCorrectAnswerCount(sessionStats)
  const totalScore = getTotalScore(sessionStats)

  return (
    <ChallengeEndedSection
      accent={accent}
      subtitle={subtitle}
      isNewBestRecord={isNewBestRecord}
      bestRecord={bestRecord}
    >
      <ChallengeScoreCard value={correctCount} label="连对题数" highlight />
      <ChallengeScoreCard
        value={formatScoreDisplay(totalScore)}
        label={scoreLabel}
        highlight
        variant="score"
      />
    </ChallengeEndedSection>
  )
}
