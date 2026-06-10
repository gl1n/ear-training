type SoundBarSpec = {
  delay: number
  height: number
}

type SoundBarsProps = {
  bars: SoundBarSpec[]
  className?: string
}

export function SoundBars({ bars, className = 'w-1 rounded-full bg-sky-400 animate-sound-bar' }: SoundBarsProps) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden="true">
      {bars.map((bar, index) => (
        <span
          key={index}
          className={className}
          style={{ animationDelay: `${bar.delay}s`, height: `${bar.height}px` }}
        />
      ))}
    </span>
  )
}
