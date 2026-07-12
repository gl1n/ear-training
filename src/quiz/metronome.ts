export const MIN_BPM = 40
export const MAX_BPM = 220

export function clampBpm(value: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)))
}

export function bpmFromTapTimes(times: number[]): number | null {
  if (times.length < 2) return null
  const recent = times.slice(-6)
  const intervals = recent.slice(1).map((time, index) => time - recent[index])
  const valid = intervals.filter((interval) => interval >= 250 && interval <= 1500)
  if (valid.length === 0) return null
  return clampBpm(60_000 / (valid.reduce((sum, interval) => sum + interval, 0) / valid.length))
}
