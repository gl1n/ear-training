export type BeatPosition = {
  absoluteStep: number
  bar: number
  beat: number
  subdivision: number
  time: number
}

export type BeatSchedulerOptions = {
  bpm: number
  beatsPerBar: number
  subdivisionsPerBeat?: number
  lookaheadMs?: number
  scheduleAheadSec?: number
  onSchedule: (position: BeatPosition) => void
  onTick?: (position: BeatPosition) => void
}

export const DEFAULT_LOOKAHEAD_MS = 25
export const DEFAULT_SCHEDULE_AHEAD_SEC = 0.1

export function stepDurationSec(bpm: number, subdivisionsPerBeat = 1): number {
  return 60 / bpm / subdivisionsPerBeat
}

export function getBeatPosition(
  absoluteStep: number,
  beatsPerBar: number,
  subdivisionsPerBeat: number,
  time: number,
): BeatPosition {
  const stepsPerBar = beatsPerBar * subdivisionsPerBeat
  const stepInBar = absoluteStep % stepsPerBar
  return {
    absoluteStep,
    bar: Math.floor(absoluteStep / stepsPerBar),
    beat: Math.floor(stepInBar / subdivisionsPerBeat),
    subdivision: stepInBar % subdivisionsPerBeat,
    time,
  }
}

export class BeatScheduler {
  private readonly context: AudioContext
  private beatsPerBar: number
  private readonly subdivisionsPerBeat: number
  private readonly lookaheadMs: number
  private readonly scheduleAheadSec: number
  private readonly onSchedule: (position: BeatPosition) => void
  private readonly onTick?: (position: BeatPosition) => void
  private bpm: number
  private intervalId: number | null = null
  private uiTimerIds = new Set<number>()
  private nextStepTime = 0
  private nextAbsoluteStep = 0

  constructor(context: AudioContext, options: BeatSchedulerOptions) {
    this.context = context
    this.bpm = options.bpm
    this.beatsPerBar = options.beatsPerBar
    this.subdivisionsPerBeat = options.subdivisionsPerBeat ?? 1
    this.lookaheadMs = options.lookaheadMs ?? DEFAULT_LOOKAHEAD_MS
    this.scheduleAheadSec = options.scheduleAheadSec ?? DEFAULT_SCHEDULE_AHEAD_SEC
    this.onSchedule = options.onSchedule
    this.onTick = options.onTick
  }

  start(delaySec = 0.06): void {
    this.stop()
    this.nextAbsoluteStep = 0
    this.nextStepTime = this.context.currentTime + delaySec
    this.schedule()
    this.intervalId = window.setInterval(() => this.schedule(), this.lookaheadMs)
  }

  stop(): void {
    if (this.intervalId !== null) window.clearInterval(this.intervalId)
    this.intervalId = null
    for (const timerId of this.uiTimerIds) window.clearTimeout(timerId)
    this.uiTimerIds.clear()
  }

  setBpm(bpm: number): void {
    this.bpm = bpm
  }

  setBeatsPerBar(beatsPerBar: number): void {
    this.beatsPerBar = beatsPerBar
    this.nextAbsoluteStep = 0
  }

  private schedule(): void {
    const horizon = this.context.currentTime + this.scheduleAheadSec
    while (this.nextStepTime < horizon) {
      const position = getBeatPosition(
        this.nextAbsoluteStep,
        this.beatsPerBar,
        this.subdivisionsPerBeat,
        this.nextStepTime,
      )
      this.onSchedule(position)
      this.scheduleTick(position)
      this.nextStepTime += stepDurationSec(this.bpm, this.subdivisionsPerBeat)
      this.nextAbsoluteStep += 1
    }
  }

  private scheduleTick(position: BeatPosition): void {
    if (!this.onTick) return
    const timerId = window.setTimeout(() => {
      this.uiTimerIds.delete(timerId)
      this.onTick?.(position)
    }, Math.max(0, (position.time - this.context.currentTime) * 1000))
    this.uiTimerIds.add(timerId)
  }
}
