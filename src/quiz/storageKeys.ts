export const STORAGE_KEYS = {
  settings: 'ear-trainer:settings',
  mistakeStats: 'ear-trainer:mistake-stats',
  mistakeStatsSchema: 'ear-trainer:mistake-stats-schema',
  scaleDegreeMistakeStats: 'ear-trainer:scale-degree-mistake-stats',
  scaleDegreeMistakeStatsSchema: 'ear-trainer:scale-degree-mistake-stats-schema',
  scaleDegreeMelodyMistakeStats: 'ear-trainer:scale-degree-melody-mistake-stats',
  scaleDegreeMelodyMistakeStatsSchema: 'ear-trainer:scale-degree-melody-mistake-stats-schema',
  scaleDegreeSessionHistory: 'ear-trainer:scale-degree-session-history',
  scaleDegreeMelodySessionHistory: 'ear-trainer:scale-degree-melody-session-history',
  challengeBest: {
    intervalSpeed: 'ear-trainer:challenge-best:intervalSpeed',
    scaleDegree: 'ear-trainer:challenge-best:scaleDegree',
    scaleDegreeMelody: 'ear-trainer:challenge-best:scaleDegreeMelody',
  },
} as const

export type ChallengeBestVariant = keyof typeof STORAGE_KEYS.challengeBest

export const TRAINING_STATS_STORAGE_KEYS = [
  STORAGE_KEYS.mistakeStats,
  STORAGE_KEYS.mistakeStatsSchema,
  STORAGE_KEYS.scaleDegreeMistakeStats,
  STORAGE_KEYS.scaleDegreeMistakeStatsSchema,
  STORAGE_KEYS.scaleDegreeMelodyMistakeStats,
  STORAGE_KEYS.scaleDegreeMelodyMistakeStatsSchema,
  STORAGE_KEYS.scaleDegreeSessionHistory,
  STORAGE_KEYS.scaleDegreeMelodySessionHistory,
  STORAGE_KEYS.challengeBest.intervalSpeed,
  STORAGE_KEYS.challengeBest.scaleDegree,
  STORAGE_KEYS.challengeBest.scaleDegreeMelody,
] as const
