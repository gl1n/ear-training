import { noteMidi, randomTonic, type Pattern } from './pattern'
import type { Piano } from '../../audio/piano'

/** Queue complete bars on the audio clock, with a 30-second buffer against timer throttling. */
export function startLoop(ctx: AudioContext, pattern: Pattern, piano: Piano, onError: (error: unknown) => void) {
  let stopped = false
  const playNote = (midi: number, duration: number, time: number) => {
    void piano.playNote(midi, duration, 80, time).catch((error: unknown) => {
      if (!stopped) onError(error)
    })
  }
  const rounds: { time: number; tonic: number }[] = []
  const start = ctx.currentTime + 0.08
  const cueDuration = Math.round(pattern.beats * 60 / pattern.bpm * ctx.sampleRate) / ctx.sampleRate
  const melodyDuration = Math.round(pattern.beats * pattern.bars * 60 / pattern.bpm * ctx.sampleRate) / ctx.sampleRate
  const duration = cueDuration + melodyDuration
  let round = 0
  let previous: number | undefined
  function schedule() {
    while (start + round * duration < ctx.currentTime + 30) {
      const tonic = randomTonic(previous)
      previous = tonic
      const time = start + round * duration
      playNote(tonic, cueDuration, time)
      for (const note of pattern.notes) {
        playNote(noteMidi(note, tonic), note.length * 60 / pattern.bpm / 4, time + cueDuration + note.step * 60 / pattern.bpm / 4)
      }
      rounds.push({ time, tonic })
      round++
    }
    while (rounds.length > 1 && rounds[1].time <= ctx.currentTime) rounds.shift()
  }
  schedule()
  const timer = window.setInterval(schedule, 100)
  return {
    position() {
      const current = rounds.findLast((r) => r.time <= ctx.currentTime)
      const elapsed = current ? ctx.currentTime - current.time : -1
      const cue = elapsed < cueDuration - 1e-9
      return {
        tonic: current?.tonic ?? rounds[0].tonic,
        cue,
        step: cue ? -1 : Math.min(pattern.beats * pattern.bars * 4 - 1, Math.max(0, Math.floor((elapsed - cueDuration) / melodyDuration * pattern.beats * pattern.bars * 4 + 1e-9))),
      }
    },
    stop() {
      window.clearInterval(timer)
      stopped = true
      piano.stop()
    },
  }
}
