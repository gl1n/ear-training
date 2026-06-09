import { useId, useMemo } from 'react'
import type { NoteKeySessionRecord } from '../quiz/noteKeySessionHistory'

type NoteKeyCorrectCountChartProps = {
  records: NoteKeySessionRecord[]
  highlightLast?: boolean
  bestCount?: number | null
}

const CHART_WIDTH = 320
const CHART_HEIGHT = 148
const PADDING = { top: 16, right: 12, bottom: 28, left: 32 }

function buildCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

function getAxisLabelIndexes(length: number): number[] {
  if (length <= 7) {
    return Array.from({ length }, (_, index) => index)
  }

  const step = Math.max(1, Math.floor(length / 6))
  const indexes = new Set<number>([0, length - 1])

  for (let index = step; index < length - 1; index += step) {
    indexes.add(index)
  }

  return [...indexes].sort((a, b) => a - b)
}

function NoteKeyCorrectCountSvg({
  records,
  highlightLast = false,
  bestCount = null,
}: NoteKeyCorrectCountChartProps) {
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const counts = records.map((record) => record.correctCount)
  const maxCount = Math.max(...counts, bestCount ?? 0, 1)
  const yTicks = useMemo(() => {
    if (maxCount <= 4) {
      return Array.from({ length: maxCount + 1 }, (_, index) => index)
    }

    const step = Math.max(1, Math.ceil(maxCount / 4))
    const ticks = new Set<number>([0])

    for (let value = step; value < maxCount; value += step) {
      ticks.add(value)
    }
    ticks.add(maxCount)

    return [...ticks].sort((a, b) => a - b)
  }, [maxCount])

  const toX = (index: number) => {
    if (records.length <= 1) {
      return PADDING.left + plotWidth / 2
    }
    return PADDING.left + (index / (records.length - 1)) * plotWidth
  }

  const toY = (count: number) => PADDING.top + plotHeight - (count / maxCount) * plotHeight

  const points = records.map((record, index) => ({
    x: toX(index),
    y: toY(record.correctCount),
    record,
    index,
  }))

  const curvePath = buildCurvePath(points)
  const axisLabelIndexes = getAxisLabelIndexes(records.length)
  const bestY = bestCount !== null && bestCount > 0 ? toY(bestCount) : null

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="mx-auto h-auto w-full max-w-[320px]"
      role="img"
      aria-label="调内听音正确题数变化折线图"
    >
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            y1={toY(tick)}
            x2={CHART_WIDTH - PADDING.right}
            y2={toY(tick)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          <text
            x={PADDING.left - 8}
            y={toY(tick) + 3}
            textAnchor="end"
            className="fill-[var(--text-secondary)] text-[9px] tabular-nums"
          >
            {tick}
          </text>
        </g>
      ))}

      {bestY !== null && (
        <line
          x1={PADDING.left}
          y1={bestY}
          x2={CHART_WIDTH - PADDING.right}
          y2={bestY}
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {curvePath && (
        <path
          d={curvePath}
          fill="none"
          stroke="rgb(56 189 248)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map(({ x, y, record, index }) => {
        const isHighlighted = highlightLast && index === points.length - 1
        return (
          <g key={`${record.at}-${index}`}>
            <circle
              cx={x}
              cy={y}
              r={isHighlighted ? 5 : 3.5}
              fill={isHighlighted ? 'rgb(186 230 253)' : 'rgb(56 189 248)'}
              stroke={isHighlighted ? 'rgb(56 189 248)' : 'none'}
              strokeWidth={isHighlighted ? 2 : 0}
            />
            {isHighlighted && (
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                className="fill-sky-200 text-[10px] font-medium tabular-nums"
              >
                {record.correctCount}
              </text>
            )}
          </g>
        )
      })}

      {axisLabelIndexes.map((index) => (
        <text
          key={index}
          x={toX(index)}
          y={CHART_HEIGHT - 8}
          textAnchor="middle"
          className="fill-[var(--text-secondary)] text-[9px] tabular-nums"
        >
          {index + 1}
        </text>
      ))}
    </svg>
  )
}

export function NoteKeyCorrectCountChart({
  records,
  highlightLast = false,
  bestCount = null,
}: NoteKeyCorrectCountChartProps) {
  const descriptionId = useId()
  const latestCount = records.at(-1)?.correctCount ?? 0
  const previousCount = records.at(-2)?.correctCount
  const delta =
    previousCount !== undefined && records.length > 1 ? latestCount - previousCount : null

  if (records.length === 0) {
    return null
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          正确题数变化
        </p>
        <p id={descriptionId} className="mt-1 text-sm text-[var(--text-primary)]">
          最近 {records.length} 局
          {delta !== null && (
            <span
              className={`ml-2 tabular-nums ${
                delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-[var(--text-secondary)]'
              }`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-sky-400/15 bg-[var(--bg-elevated)] px-3 py-3">
        <NoteKeyCorrectCountSvg
          records={records}
          highlightLast={highlightLast}
          bestCount={bestCount}
        />
        {bestCount !== null && bestCount > 0 && (
          <p className="mt-2 text-center text-[10px] text-[var(--text-secondary)]">
            虚线为最佳记录 {bestCount} 题
          </p>
        )}
      </div>
    </div>
  )
}
