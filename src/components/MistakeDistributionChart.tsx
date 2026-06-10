import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { getQuizPitchKey, midiToNoteName, type Quiz } from '../quiz/intervals'
import { buildCurvePath } from '../lib/chartUtils'
import {
  buildHistogram,
  buildKdeCurve,
  getTotalMistakeCount,
  midiToLogPitch,
  LOG_PITCH_BIN_WIDTH,
  type MistakeStatsStore,
} from '../quiz/mistakeStats'

type MistakeDistributionChartProps = {
  store: MistakeStatsStore
  rootMin: number
  rootMax: number
  onPlayQuiz?: (quiz: Quiz) => void
  replayingQuizKey?: string | null
  isReplayBusy?: boolean
}

const CHART_WIDTH = 320
const CHART_HEIGHT = 160
const PADDING = { top: 20, right: 8, bottom: 28, left: 28 }

function pickAxisLabels(rootMin: number, rootMax: number): number[] {
  const labels: number[] = []
  const startOctave = Math.ceil(rootMin / 12) * 12

  for (let midi = startOctave; midi <= rootMax; midi += 12) {
    if (midi >= rootMin) {
      labels.push(midi)
    }
  }

  if (labels.length === 0) {
    labels.push(rootMin, rootMax)
  }

  return labels
}

function getBarClassName(isPlaying: boolean, isDisabled: boolean): string {
  const classes = ['mistake-histogram-bar']

  if (isPlaying) {
    classes.push('mistake-histogram-bar--playing')
  } else if (isDisabled) {
    classes.push('mistake-histogram-bar--disabled')
  }

  return classes.join(' ')
}

function MistakeDistributionSvg({
  store,
  rootMin,
  rootMax,
  onPlayQuiz,
  replayingQuizKey = null,
  isReplayBusy = false,
}: MistakeDistributionChartProps) {
  const { bins } = useMemo(
    () => buildHistogram(store, rootMin, rootMax),
    [store, rootMin, rootMax],
  )
  const kdeCurve = useMemo(
    () => buildKdeCurve(store, rootMin, rootMax),
    [store, rootMin, rootMax],
  )

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const xMin = midiToLogPitch(rootMin) - LOG_PITCH_BIN_WIDTH / 2
  const xMax = midiToLogPitch(rootMax) + LOG_PITCH_BIN_WIDTH / 2
  const maxCount = Math.max(
    1,
    ...bins.map((bin) => bin.count),
    ...kdeCurve.map((point) => point.count),
  )

  const toX = (logPitch: number) =>
    PADDING.left + ((logPitch - xMin) / (xMax - xMin)) * plotWidth
  const toY = (count: number) =>
    PADDING.top + plotHeight - (count / maxCount) * plotHeight

  const barWidth = plotWidth / bins.length - 1
  const axisLabels = pickAxisLabels(rootMin, rootMax)
  const peakBin = bins.reduce<(typeof bins)[number] | null>((peak, bin) => {
    if (bin.count === 0) return peak
    if (!peak || bin.count > peak.count) return bin
    return peak
  }, null)
  const curvePath = buildCurvePath(
    kdeCurve.map((point) => ({
      x: toX(point.logPitch),
      y: toY(point.count),
    })),
  )

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label="失误按根音分布"
    >
      <line
        x1={PADDING.left}
        y1={PADDING.top + plotHeight}
        x2={PADDING.left + plotWidth}
        y2={PADDING.top + plotHeight}
        stroke="currentColor"
        strokeOpacity={0.25}
      />
      <line
        x1={PADDING.left}
        y1={PADDING.top}
        x2={PADDING.left}
        y2={PADDING.top + plotHeight}
        stroke="currentColor"
        strokeOpacity={0.25}
      />

      {[0, maxCount].map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left - 4}
            y1={toY(tick)}
            x2={PADDING.left}
            y2={toY(tick)}
            stroke="currentColor"
            strokeOpacity={0.25}
          />
          <text
            x={PADDING.left - 6}
            y={toY(tick) + 3}
            textAnchor="end"
            className="fill-[var(--text-secondary)] text-[9px]"
          >
            {tick}
          </text>
        </g>
      ))}

      {bins.map((bin) => {
        const x = toX(bin.logPitch) - barWidth / 2
        const height = (bin.count / maxCount) * plotHeight
        const y = PADDING.top + plotHeight - height
        const quiz = bin.lastMistakeQuiz
        const isClickable = bin.count > 0 && quiz !== null && onPlayQuiz !== undefined
        const isPlaying = quiz !== null && replayingQuizKey === getQuizPitchKey(quiz)
        const isDisabled = isReplayBusy && !isPlaying

        const handlePlay = () => {
          if (!isClickable || isDisabled || !quiz) return
          onPlayQuiz(quiz)
        }

        const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          handlePlay()
        }

        const rect = (
          <rect
            x={x}
            y={y}
            width={Math.max(barWidth, 1)}
            height={height}
            rx={1}
            className={getBarClassName(isPlaying, isDisabled)}
            pointerEvents="none"
          />
        )

        if (!isClickable) {
          return <g key={bin.midi}>{rect}</g>
        }

        return (
          <g
            key={bin.midi}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            aria-label={`播放 ${midiToNoteName(bin.midi)} 最近失误音程`}
            aria-disabled={isDisabled}
            className={`mistake-histogram-bar-group outline-none ${
              isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
            onClick={handlePlay}
            onKeyDown={handleKeyDown}
          >
            <rect
              x={x}
              y={PADDING.top}
              width={Math.max(barWidth, 1)}
              height={plotHeight}
              fill="transparent"
              aria-hidden="true"
            />
            {rect}
          </g>
        )
      })}

      {peakBin && (
        <text
          x={toX(peakBin.logPitch)}
          y={toY(peakBin.count) - 5}
          textAnchor="middle"
          className="fill-orange-300 text-[10px] font-medium"
        >
          {midiToNoteName(peakBin.midi)}
        </text>
      )}

      {curvePath && (
        <path
          d={curvePath}
          fill="none"
          stroke="rgb(253 186 116)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      {axisLabels.map((midi) => (
        <text
          key={midi}
          x={toX(midiToLogPitch(midi))}
          y={CHART_HEIGHT - 6}
          textAnchor="middle"
          className="fill-[var(--text-secondary)] text-[9px]"
        >
          {midiToNoteName(midi)}
        </text>
      ))}
    </svg>
  )
}

export function MistakeDistributionChart({
  store,
  rootMin,
  rootMax,
  onPlayQuiz,
  replayingQuizKey,
  isReplayBusy,
}: MistakeDistributionChartProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const totalMistakes = getTotalMistakeCount(store)
  const { totalInRange } = useMemo(
    () => buildHistogram(store, rootMin, rootMax),
    [store, rootMin, rootMax],
  )
  const rangeLabel = `${midiToNoteName(rootMin)}–${midiToNoteName(rootMax)}`

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-3 text-left transition hover:border-orange-400/25 hover:bg-orange-500/5"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            失误分布
          </p>
          <p className="mt-0.5 text-sm text-[var(--text-primary)]">
            {totalInRange === 0 ? '暂无数据' : `共 ${totalInRange} 次`}
          </p>
        </div>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--text-secondary)] transition ${
            expanded ? 'rotate-180 bg-white/5' : ''
          }`}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {expanded && (
        <div
          id={panelId}
          className="rounded-xl border border-orange-400/15 bg-black/25 px-3 py-3"
        >
          {totalInRange === 0 ? (
            <p className="px-1 py-2 text-center text-sm text-[var(--text-secondary)]">
              {totalMistakes === 0 ? '还没有记录' : `${rangeLabel} 暂无记录`}
            </p>
          ) : (
            <MistakeDistributionSvg
              store={store}
              rootMin={rootMin}
              rootMax={rootMax}
              onPlayQuiz={onPlayQuiz}
              replayingQuizKey={replayingQuizKey}
              isReplayBusy={isReplayBusy}
            />
          )}
        </div>
      )}
    </div>
  )
}
