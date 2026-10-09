import { afterEach, expect, it, vi } from 'vitest'
import { startLoop } from './loopPlayer'
import { initialPattern, noteMidi } from './pattern'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
it.each([2, 3, 4, 5, 6])('schedules piano cues and transposed melodies continuously in %i/4', (beats) => {
  vi.useFakeTimers()
  vi.stubGlobal('window', globalThis)
  const pattern = { ...initialPattern, beats, notes: initialPattern.notes.slice(0, 2) }
  const piano = { playNote: vi.fn().mockResolvedValue(undefined), playNotes: vi.fn(), stop: vi.fn() }
  const onError = vi.fn()
  const ctx = { currentTime: 0, sampleRate: 8000 }
  const player = startLoop(ctx as AudioContext, pattern, piano, onError)
  const cueDuration = beats * 60 / pattern.bpm
  const duration = cueDuration * (pattern.bars + 1)
  const calls = piano.playNote.mock.calls
  expect(calls.length).toBeGreaterThan(3)
  for (let i = 0; i < calls.length; i += 3) {
    const [tonic, length, , time] = calls[i]
    expect(length).toBe(cueDuration)
    expect(time).toBeCloseTo(0.08 + i / 3 * duration, 10)
    if (i > 0) expect(tonic).not.toBe(calls[i - 3][0])
    pattern.notes.forEach((note, index) => {
      expect(calls[i + index + 1][0]).toBe(noteMidi(note, tonic))
      expect(calls[i + index + 1][1]).toBe(note.length * 60 / pattern.bpm / 4)
      expect(calls[i + index + 1][3]).toBeCloseTo(time + cueDuration + note.step * 60 / pattern.bpm / 4, 10)
    })
  }
  ctx.currentTime = 0.08
  expect(player.position()).toMatchObject({ cue: true, step: -1, tonic: calls[0][0] })
  ctx.currentTime += cueDuration
  expect(player.position()).toMatchObject({ cue: false, step: 0, tonic: calls[0][0] })
  ctx.currentTime = calls[3][3]
  expect(player.position()).toMatchObject({ cue: true, step: -1, tonic: calls[3][0] })
  ctx.currentTime = 20
  vi.advanceTimersByTime(100)
  expect(calls.at(-1)![3]).toBeGreaterThan(40)
  player.stop()
  expect(piano.stop).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
  expect(onError).not.toHaveBeenCalled()
})
it('reports piano scheduling failures', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('window', globalThis)
  const error = new Error('Audio unavailable')
  const piano = { playNote: vi.fn().mockRejectedValue(error), playNotes: vi.fn(), stop: vi.fn() }
  const onError = vi.fn()
  const player = startLoop({ currentTime: 0, sampleRate: 8000 } as AudioContext, initialPattern, piano, onError)
  await Promise.resolve()
  expect(onError).toHaveBeenCalledWith(error)
  player.stop()
})
