export const STORAGE_KEYS = {
  settings: 'ear-trainer:settings',
  mistakeStats: 'ear-trainer:mistake-stats',
  mistakeStatsSchema: 'ear-trainer:mistake-stats-schema',
  scaleDegreeMistakeStats: 'ear-trainer:scale-degree-mistake-stats',
  scaleDegreeMistakeStatsSchema: 'ear-trainer:scale-degree-mistake-stats-schema',
  scaleDegreeSessionHistory: 'ear-trainer:scale-degree-session-history',
  challengeBest: {
    intervalSpeed: 'ear-trainer:challenge-best:intervalSpeed',
    scaleDegree: 'ear-trainer:challenge-best:scaleDegree',
  },
} as const

export type ChallengeBestVariant = keyof typeof STORAGE_KEYS.challengeBest

export const TRAINING_STATS_STORAGE_KEYS = [
  STORAGE_KEYS.mistakeStats,
  STORAGE_KEYS.mistakeStatsSchema,
  STORAGE_KEYS.scaleDegreeMistakeStats,
  STORAGE_KEYS.scaleDegreeMistakeStatsSchema,
  STORAGE_KEYS.scaleDegreeSessionHistory,
  STORAGE_KEYS.challengeBest.intervalSpeed,
  STORAGE_KEYS.challengeBest.scaleDegree,
] as const
