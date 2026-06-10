import { useId, useMemo } from 'react'
import type { NoteKeySessionRecord } from '../quiz/noteKeySessionHistory'

type NoteKeyCorrectCountChartProps = {
  records: NoteKeySessionRecord[]
  highlightLast?: boolean
}

function getAverage(values: number[]): number | null {
  if (values.length === 0) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

const CHART_WIDTH = 360
const CHART_HEIGHT = 168
const PADDING = { top: 28, right: 36, bottom: 28, left: 32 }

const COUNT_COLOR = 'rgb(56 189 248)'
const COUNT_AVG_COLOR = 'rgba(56, 189, 248, 0.35)'
const SCORE_COLOR = 'rgb(251 191 36)'
const SCORE_AVG_COLOR = 'rgba(251, 191, 36, 0.35)'

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

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function getCountTicks(maxCount: number): number[] {
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
}

function getScoreTicks(maxScore: number): number[] {
  if (maxScore <= 2) {
    const ticks = new Set<number>([0])
    for (let value = 0.5; value <= maxScore; value += 0.5) {
      ticks.add(Number(value.toFixed(1)))
    }
    return [...ticks].sort((a, b) => a - b)
  }

  const step = Math.max(0.5, Math.ceil((maxScore / 4) * 2) / 2)
  const ticks = new Set<number>([0])

  for (let value = step; value < maxScore; value += step) {
    ticks.add(Number(value.toFixed(1)))
  }
  ticks.add(Number(maxScore.toFixed(1)))

  return [...ticks].sort((a, b) => a - b)
}

function hasScoreSeries(records: NoteKeySessionRecord[]): boolean {
  return records.some((record) => record.totalScore !== undefined)
}

function NoteKeyCorrectCountSvg({
  records,
  highlightLast = false,
}: NoteKeyCorrectCountChartProps) {
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const showScoreSeries = hasScoreSeries(records)

  const counts = records.map((record) => record.correctCount)
  const scores = records.map((record) => record.totalScore ?? 0)
  const averageCount = getAverage(counts)
  const averageScore = showScoreSeries ? getAverage(scores) : null
  const maxCount = Math.max(...counts, averageCount ?? 0, 1)
  const maxScore = showScoreSeries
    ? Math.max(...scores, averageScore ?? 0, 0.5)
    : 1

  const countTicks = useMemo(() => getCountTicks(maxCount), [maxCount])
  const scoreTicks = useMemo(
    () => (showScoreSeries ? getScoreTicks(maxScore) : []),
    [showScoreSeries, maxScore],
  )

  const toX = (index: number) => {
    if (records.length <= 1) {
      return PADDING.left + plotWidth / 2
    }
    return PADDING.left + (index / (records.length - 1)) * plotWidth
  }

  const toCountY = (count: number) =>
    PADDING.top + plotHeight - (count / maxCount) * plotHeight

  const toScoreY = (score: number) =>
    PADDING.top + plotHeight - (score / maxScore) * plotHeight

  const countPoints = records.map((record, index) => ({
    x: toX(index),
    y: toCountY(record.correctCount),
    record,
    index,
  }))

  const scorePoints = showScoreSeries
    ? records.map((record, index) => ({
        x: toX(index),
        y: toScoreY(record.totalScore ?? 0),
        record,
        index,
      }))
    : []

  const countCurvePath = buildCurvePath(countPoints)
  const scoreCurvePath = buildCurvePath(scorePoints)
  const axisLabelIndexes = getAxisLabelIndexes(records.length)
  const averageCountY =
    averageCount !== null && averageCount > 0 ? toCountY(averageCount) : null
  const averageScoreY =
    averageScore !== null && averageScore > 0 ? toScoreY(averageScore) : null

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="mx-auto h-auto w-full max-w-[360px]"
      role="img"
      aria-label="调内听音局成绩变化折线图"
    >
      <g transform={`translate(0, 10)`}>
        <line x1={PADDING.left} y1={0} x2={PADDING.left + 14} y2={0} stroke={COUNT_COLOR} strokeWidth={2} />
        <text x={PADDING.left + 18} y={3} className="fill-[var(--text-secondary)] text-[9px]">
          连对题数
        </text>
        {showScoreSeries && (
          <>
            <line
              x1={PADDING.left + 72}
              y1={0}
              x2={PADDING.left + 86}
              y2={0}
              stroke={SCORE_COLOR}
              strokeWidth={2}
            />
            <text x={PADDING.left + 90} y={3} className="fill-[var(--text-secondary)] text-[9px]">
              加权总分
            </text>
          </>
        )}
      </g>

      {countTicks.map((tick) => (
        <g key={`count-${tick}`}>
          <line
            x1={PADDING.left}
            y1={toCountY(tick)}
            x2={CHART_WIDTH - PADDING.right}
            y2={toCountY(tick)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          <text
            x={PADDING.left - 8}
            y={toCountY(tick) + 3}
            textAnchor="end"
            className="fill-[var(--text-secondary)] text-[9px] tabular-nums"
          >
            {formatCount(tick)}
          </text>
        </g>
      ))}

      {showScoreSeries &&
        scoreTicks.map((tick) => (
          <text
            key={`score-${tick}`}
            x={CHART_WIDTH - PADDING.right + 8}
            y={toScoreY(tick) + 3}
            textAnchor="start"
            className="fill-amber-200/70 text-[9px] tabular-nums"
          >
            {formatScore(tick)}
          </text>
        ))}

      {averageCountY !== null && (
        <line
          x1={PADDING.left}
          y1={averageCountY}
          x2={CHART_WIDTH - PADDING.right}
          y2={averageCountY}
          stroke={COUNT_AVG_COLOR}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {averageScoreY !== null && (
        <line
          x1={PADDING.left}
          y1={averageScoreY}
          x2={CHART_WIDTH - PADDING.right}
          y2={averageScoreY}
          stroke={SCORE_AVG_COLOR}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}

      {countCurvePath && (
        <path
          d={countCurvePath}
          fill="none"
          stroke={COUNT_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {scoreCurvePath && (
        <path
          d={scoreCurvePath}
          fill="none"
          stroke={SCORE_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {countPoints.map(({ x, y, record, index }) => {
        const isHighlighted = highlightLast && index === countPoints.length - 1
        return (
          <g key={`count-${record.at}-${index}`}>
            <circle
              cx={x}
              cy={y}
              r={isHighlighted ? 5 : 3.5}
              fill={isHighlighted ? 'rgb(186 230 253)' : COUNT_COLOR}
              stroke={isHighlighted ? COUNT_COLOR : 'none'}
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

      {showScoreSeries &&
        scorePoints.map(({ x, y, record, index }) => {
          const isHighlighted = highlightLast && index === scorePoints.length - 1
          return (
            <g key={`score-${record.at}-${index}`}>
              <circle
                cx={x}
                cy={y}
                r={isHighlighted ? 4 : 3}
                fill={isHighlighted ? 'rgb(253 230 138)' : SCORE_COLOR}
                stroke={isHighlighted ? SCORE_COLOR : 'none'}
                strokeWidth={isHighlighted ? 2 : 0}
              />
              {isHighlighted && record.totalScore !== undefined && (
                <text
                  x={x}
                  y={y - 22}
                  textAnchor="middle"
                  className="fill-amber-200 text-[10px] font-medium tabular-nums"
                >
                  {formatScore(record.totalScore)}
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
}: NoteKeyCorrectCountChartProps) {
  const descriptionId = useId()
  const latestCount = records.at(-1)?.correctCount ?? 0
  const previousCount = records.at(-2)?.correctCount
  const delta =
    previousCount !== undefined && records.length > 1 ? latestCount - previousCount : null
  const showScoreSeries = hasScoreSeries(records)

  if (records.length === 0) {
    return null
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          局成绩变化
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
        {showScoreSeries && (
          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
            蓝=连对题数 · 黄=加权总分
          </p>
        )}
      </div>

      <div className="rounded-xl border border-sky-400/15 bg-[var(--bg-elevated)] px-3 py-3">
        <NoteKeyCorrectCountSvg records={records} highlightLast={highlightLast} />
        <p className="mt-2 text-center text-[10px] text-[var(--text-secondary)]">
          {showScoreSeries ? '虚线为各自近期均值' : '虚线为近期平均分'}
        </p>
      </div>
    </div>
  )
}
