export type MetronomeClickOptions = {
  strong?: boolean
  secondary?: boolean
  volume?: number
}

export function scheduleMetronomeClick(
  context: AudioContext,
  time: number,
  options: MetronomeClickOptions = {},
): OscillatorNode[] {
  const strong = options.strong ?? false
  const secondary = options.secondary ?? false
  const volume = options.volume ?? (strong ? 0.25 : secondary ? 0.15 : 0.11)
  const oscillators: OscillatorNode[] = []
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(strong ? 1500 : secondary ? 1040 : 760, time)
  gain.gain.setValueAtTime(volume, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(time)
  oscillator.stop(time + 0.05)
  oscillators.push(oscillator)

  if (secondary) {
    const overtone = context.createOscillator()
    const overtoneGain = context.createGain()
    overtone.type = 'sine'
    overtone.frequency.setValueAtTime(1560, time)
    overtoneGain.gain.setValueAtTime(volume * 0.24, time)
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
    overtone.connect(overtoneGain).connect(context.destination)
    overtone.start(time)
    overtone.stop(time + 0.065)
    oscillators.push(overtone)
  }

  return oscillators
}
