import { midiToNoteName } from './intervals'
import { type DegreePracticeOptions, type MajorKeySession, type ScaleDegreeQuiz, type ScaleDegreeTrainingMode, type ScaleFlavor } from './keys'
import { pickUniform, pickWeighted } from './weightedPick'
import type { SessionStats } from './stats'

export const SCALE_FLAVOR_LABELS: Record<ScaleFlavor, string> = {
  major: '大调', minor: '自然小调', chromatic: '大调变化音',
}

export const ARCADE_SPEED_MIN_POINTS = -8
export const ARCADE_SPEED_MAX_POINTS = 24

export function updateArcadeSpeedPoints(points: number, correct: boolean): number {
  const next = points + (correct ? 1 : -1.5)
  return Math.max(ARCADE_SPEED_MIN_POINTS, Math.min(ARCADE_SPEED_MAX_POINTS, next))
}

export const ARCADE_SPEED_MILESTONES = [
  { points: 6, message: '节奏渐入佳境，继续保持！' },
  { points: 12, message: '越听越敏锐，旋律跟得很稳！' },
  { points: 18, message: '高速也能跟上，真棒！' },
  { points: 24, message: '已达到最高速度，追踪力满格！' },
] as const

export function arcadeSpeedMultiplier(speedPoints: number): number {
  const points = Math.max(ARCADE_SPEED_MIN_POINTS, Math.min(ARCADE_SPEED_MAX_POINTS, speedPoints))
  return Math.pow(1.02, points)
}

export function arcadePlaybackSettings(
  settings: { noteDurationMs: number; gapMs: number },
  speedPoints: number,
): { noteDurationMs: number; gapMs: number } {
  const factor = 1 / arcadeSpeedMultiplier(speedPoints)
  return {
    noteDurationMs: settings.noteDurationMs * factor,
    gapMs: settings.gapMs * factor,
  }
}

const SCALES: Record<ScaleFlavor, readonly (readonly [string, number])[]> = {
  major: [['1', 0], ['2', 2], ['3', 4], ['4', 5], ['5', 7], ['6', 9], ['7', 11]],
  minor: [['1', 0], ['2', 2], ['♭3', 3], ['4', 5], ['5', 7], ['♭6', 8], ['♭7', 10]],
  chromatic: [['1', 0], ['2', 2], ['♭3', 3], ['3', 4], ['4', 5], ['♯4', 6], ['5', 7], ['6', 9], ['♭7', 10], ['7', 11]],
}

export function degreeOptions(flavor: ScaleFlavor): string[] {
  return SCALES[flavor].map(([label]) => label)
}

export function degreeAnswer(quiz: ScaleDegreeQuiz): string {
  return quiz.answerDegree ?? String(quiz.degree)
}

export function degreePracticeKey(mode: ScaleDegreeTrainingMode, options: DegreePracticeOptions): string {
  return mode === 'melody' ? `dictation-${options.melodyLength}` : `${mode}-${options.scaleFlavor}`
}

export function degreeSession(session: MajorKeySession, flavor: ScaleFlavor): MajorKeySession {
  return { ...session, label: `${midiToNoteName(session.tonicMidi).replace(/\d+$/, '')} ${flavor === 'minor' ? '自然小调' : '大调'}` }
}

export function degreeTonicChord(tonic: number, flavor: ScaleFlavor): number[] {
  return [tonic, tonic + (flavor === 'minor' ? 3 : 4), tonic + 7]
}

export function randomFlavorQuiz(
  session: MajorKeySession, flavor: ScaleFlavor, min: number, max: number,
  previousNoteMidi: number | null, stats?: SessionStats,
): ScaleDegreeQuiz {
  const candidates = SCALES[flavor].map(([answer, interval]) => {
    const midis: number[] = []
    for (let midi = min; midi <= max; midi++) {
      if (((midi - session.tonicPitchClass) % 12 + 12) % 12 === interval) midis.push(midi)
    }
    return { answer, midis }
  }).filter(({ midis }) => midis.length > 0)
  const maxCount = Math.max(0, ...candidates.map(({ answer }) => stats?.byKey[answer]?.totalCount ?? 0))
  const chosen = pickWeighted(candidates, ({ answer }) => maxCount + 1 - (stats?.byKey[answer]?.totalCount ?? 0))
  if (!chosen) throw new Error('音域内没有可用音级')
  const alternatives = chosen.midis.filter((midi) => midi !== previousNoteMidi)
  return {
    tonicMidi: session.tonicMidi,
    noteMidi: pickUniform(alternatives.length ? alternatives : chosen.midis)!,
    degree: Number(chosen.answer.replace(/[♭♯]/, '')),
    answerDegree: chosen.answer, scaleFlavor: flavor,
    keyLabel: session.label, previousNoteMidi,
  }
}

export function gradeMelody(degrees: readonly number[], answer: string): boolean[] | null {
  const parts = answer.split('-')
  if (parts.length !== degrees.length || parts.some((part) => !/^[1-7]$/.test(part))) return null
  return degrees.map((degree, index) => String(degree) === parts[index])
}
