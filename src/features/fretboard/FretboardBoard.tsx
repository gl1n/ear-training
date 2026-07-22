import { useEffect, useRef } from 'react'
import { midiAt, noteAt, type FretboardCell, type FretboardQuestion } from './fretboard'
import { fretboardRegionEdgeClasses } from './fretboardRegionStyles'

const STRING_COUNT = 6
const MAX_FRET = 12
const STRING_LABELS = ['1 · E', '2 · B', '3 · G', '4 · D', '5 · A', '6 · E']
const VIBRATION_DURATION_MS = 800
const FRET_NUMBERS = Array.from({ length: MAX_FRET + 1 }, (_, fret) => fret)

const BOARD_ROWS = Array.from({ length: STRING_COUNT }, (_, stringIndex) => (
  FRET_NUMBERS.map((fret) => (
    { stringIndex, fret, note: noteAt(stringIndex, fret), midi: midiAt(stringIndex, fret) }
  ))
))

export type FretboardPluck = {
  stringIndex: number
  fret: number
  token: number
}

type FretboardBoardProps = {
  question: FretboardQuestion
  showQuestion: boolean
  canAnswer: boolean
  revealAnswer: boolean
  wrongCellKey: string | null
  pluck: FretboardPluck
  mistakeHeatmap?: Record<string, number>
  wholeBoard?: boolean
  foundCellKeys?: readonly string[]
  fullscreen?: boolean
  markers?: Record<string, { label: string; tone: 'root' | 'guide' }>
  displayOnly?: boolean
  onSelect: (cell: FretboardCell, answeredAt: number) => void
}

function fretboardCellKey(cell: Pick<FretboardCell, 'stringIndex' | 'fret'>) {
  return `${cell.stringIndex}:${cell.fret}`
}

function hasPositionMarker(cell: Pick<FretboardCell, 'stringIndex' | 'fret'>) {
  if ([3, 5, 7, 9].includes(cell.fret)) return cell.stringIndex === 2
  return cell.fret === 12 && (cell.stringIndex === 1 || cell.stringIndex === 3)
}

function fretCenterRatio(fret: number) {
  const boardStart = 1 - 2 ** (1 / 12)
  const boardEnd = 1 - 2 ** (-MAX_FRET / 12)
  const previousWire = 1 - 2 ** (-(fret - 1) / 12)
  const currentWire = 1 - 2 ** (-fret / 12)
  return (previousWire + currentWire - 2 * boardStart) / (2 * (boardEnd - boardStart))
}

function isCellInRegion(cell: FretboardCell, question: FretboardQuestion) {
  return cell.stringIndex >= question.region.stringStart
    && cell.stringIndex < question.region.stringStart + 3
    && cell.fret >= question.region.fretStart
    && cell.fret < question.region.fretStart + 4
}

function FretboardStringsCanvas({ pluck }: { pluck: FretboardPluck }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let animationFrame = 0
    const startedAt = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pluckPosition = fretCenterRatio(Math.min(MAX_FRET, Math.max(0, pluck.fret)))
    const soundingLengthRatio = 1 - pluckPosition
    const pluckAmplitude = 0.45 + 4.35 * soundingLengthRatio ** 0.9

    const draw = (now: number) => {
      const bounds = canvas.getBoundingClientRect()
      const width = bounds.width
      const height = bounds.height
      if (width <= 0 || height <= 0) return

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const pixelWidth = Math.round(width * pixelRatio)
      const pixelHeight = Math.round(height * pixelRatio)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)

      const elapsed = (now - startedAt) / 1000
      const vibrating = pluck.token > 0 && elapsed * 1000 < VIBRATION_DURATION_MS && !reducedMotion

      for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex += 1) {
        const restingY = (stringIndex + 0.5) * height / STRING_COUNT
        context.beginPath()

        if (vibrating && stringIndex === pluck.stringIndex) {
          const contactX = pluckPosition * width
          const envelope = Math.exp(-5.8 * elapsed)
          context.moveTo(0, restingY)
          context.lineTo(contactX, restingY)
          for (let x = contactX; x < width; x += 2) {
            const position = (x - contactX) / (width - contactX)
            const fundamental = Math.sin(Math.PI * position) * Math.cos(2 * Math.PI * 8 * elapsed)
            const overtone = 0.18 * Math.sin(2 * Math.PI * position) * Math.cos(2 * Math.PI * 12.8 * elapsed)
            context.lineTo(x, restingY + pluckAmplitude * envelope * (fundamental + overtone))
          }
          context.lineTo(width, restingY)
        } else {
          context.moveTo(0, restingY)
          context.lineTo(width, restingY)
        }

        context.strokeStyle = 'rgba(226, 232, 240, 0.82)'
        context.lineWidth = 1 + stringIndex * 0.32
        context.stroke()
      }

      if (vibrating) animationFrame = window.requestAnimationFrame(draw)
    }

    const resizeObserver = new ResizeObserver(() => draw(performance.now()))
    resizeObserver.observe(canvas)
    draw(startedAt)

    return () => {
      resizeObserver.disconnect()
      window.cancelAnimationFrame(animationFrame)
    }
  }, [pluck])

  return <canvas ref={canvasRef} className="fretboard-strings-canvas" aria-hidden="true" />
}

function FretboardMistakeHeatmapCanvas({ distribution }: { distribution: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const draw = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = bounds.width
      const height = bounds.height
      if (width <= 0 || height <= 0) return

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)

      const entries = Object.entries(distribution).filter(([, errorRate]) => errorRate > 0)
      context.globalCompositeOperation = 'lighter'

      entries.forEach(([key, errorRate]) => {
        const [stringIndex, fret] = key.split(':').map(Number)
        if (!Number.isInteger(stringIndex) || !Number.isInteger(fret)) return

        const centerX = fretCenterRatio(fret) * width
        const centerY = (stringIndex + 0.5) * height / STRING_COUNT
        const radius = Math.max(width / 15, height / 5.2)
        const intensity = Math.sqrt(errorRate)
        const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
        gradient.addColorStop(0, `rgba(248, 70, 70, ${0.2 + intensity * 0.42})`)
        gradient.addColorStop(0.42, `rgba(239, 45, 64, ${0.1 + intensity * 0.23})`)
        gradient.addColorStop(1, 'rgba(185, 28, 28, 0)')
        context.fillStyle = gradient
        context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)
      })
    }

    const resizeObserver = new ResizeObserver(draw)
    resizeObserver.observe(canvas)
    draw()
    return () => resizeObserver.disconnect()
  }, [distribution])

  return <canvas ref={canvasRef} className="fretboard-heatmap-canvas" aria-hidden="true" />
}

export function FretboardBoard({
  question,
  showQuestion,
  canAnswer,
  revealAnswer,
  wrongCellKey,
  pluck,
  mistakeHeatmap = {},
  wholeBoard = false,
  foundCellKeys = [],
  fullscreen = false,
  markers = {},
  displayOnly = false,
  onSelect,
}: FretboardBoardProps) {
  const foundCells = new Set(foundCellKeys)

  return (
    <div className={`w-full ${fullscreen ? 'fretboard-board--fullscreen' : 'pb-2'}`}>
      <div className={`fretboard-grid-wrap${fullscreen ? ' fretboard-grid-wrap--fullscreen' : ''}`}>
        <div className={`fretboard-grid${fullscreen ? ' fretboard-grid--fullscreen' : ''}`} role="group" aria-label="六弦零至十二品完整指板">
          <span aria-hidden="true" />
          {FRET_NUMBERS.map((fret) => (
            <span key={fret} className="pb-1 text-center text-[10px] font-medium text-[var(--text-secondary)]">
              {fret}
            </span>
          ))}
          {BOARD_ROWS.map((row, stringIndex) => [
            <span key={`label-${stringIndex}`} className="flex items-center bg-[#11100e] pr-1 text-[10px] font-semibold text-[var(--text-secondary)] sm:pr-2 sm:text-xs">
              {STRING_LABELS[stringIndex]}
            </span>,
            ...row.map((cell) => {
                const key = fretboardCellKey(cell)
                const marker = markers[key]
                const active = displayOnly ? Boolean(marker) : showQuestion && (wholeBoard || isCellInRegion(cell, question))
                const found = foundCells.has(key)
                const revealCorrect = revealAnswer && active && cell.note === question.targetNote
                const errorRate = mistakeHeatmap[key] ?? 0
                const regionEdgeClass = fretboardRegionEdgeClasses(
                  cell,
                  question.region,
                  active && !wholeBoard,
                )
                const stateClass = marker?.tone === 'root'
                  ? 'fretboard-cell--target-root'
                  : marker?.tone === 'guide'
                    ? 'fretboard-cell--target-guide'
                    : found || revealCorrect
                  ? 'fretboard-cell--correct'
                  : wrongCellKey === key
                    ? 'fretboard-cell--wrong'
                    : active
                      ? 'fretboard-cell--active'
                      : showQuestion && !displayOnly
                        ? 'fretboard-cell--masked'
                        : ''

                return (
                  <button
                    key={key}
                    type="button"
                    className={`fretboard-cell ${cell.fret === 0 ? 'fretboard-cell--open' : ''} ${stateClass} ${regionEdgeClass}`}
                    onClick={(event) => onSelect(cell, event.timeStamp)}
                    disabled={displayOnly || (showQuestion ? !canAnswer || !active || found : false)}
                    aria-label={`${stringIndex + 1} 弦，第 ${cell.fret} 品${marker ? `，指定 ${marker.label}` : ''}${showQuestion && !displayOnly ? active ? wholeBoard ? '，全指板找音区域' : '，当前题目区域' : '，非题目区域' : ''}${found ? '，已找到' : ''}${errorRate ? `，错误率 ${Math.round(errorRate * 100)}%` : ''}`}
                  >
                    {hasPositionMarker(cell) && <i className="fretboard-position-marker" aria-hidden="true" />}
                    <span aria-hidden="true">{marker?.label ?? (found || revealCorrect ? cell.note : '')}</span>
                  </button>
                )
              }),
          ])}
        </div>
        <FretboardMistakeHeatmapCanvas distribution={mistakeHeatmap} />
        <FretboardStringsCanvas pluck={pluck} />
      </div>
    </div>
  )
}
