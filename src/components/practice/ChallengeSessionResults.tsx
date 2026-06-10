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
}

export function ChallengeSessionResults({
  accent,
  sessionStats,
  subtitle,
  isNewBestRecord,
  bestRecord,
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
        label="加权总分"
        highlight
        variant="score"
      />
    </ChallengeEndedSection>
  )
}
