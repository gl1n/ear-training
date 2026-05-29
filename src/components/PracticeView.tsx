import { DIRECTION_OPTIONS, INTERVALS } from '../quiz/intervals'
import { SPEED_OPTIONS, type AppMode, type SpeedPreset } from '../quiz/sequencer'
import type { SessionStats } from '../quiz/stats'
import { ArcadeIdlePanel } from './ArcadeIdlePanel'
import { ArcadePlayfield } from './ArcadePlayfield'
import { Button } from './ui/Button'
import { cardClasses } from './ui/Card'
import { Chip } from './ui/Chip'
import { SegmentedControl } from './ui/SegmentedControl'
import { StatusHero } from './StatusHero'
import type { IntervalDirection, Quiz } from '../quiz/intervals'
import type { TrainerState } from '../quiz/sequencer'

const MODE_OPTIONS = [
  { value: 'practice' as const, label: '练习模式' },
  { value: 'arcade' as const, label: '街机模式' },
]

type PracticeViewProps = {
  mode: AppMode
  state: TrainerState
  isRunning: boolean
  isLoading: boolean
  speedPreset: SpeedPreset
  enabledIntervalIds: string[]
  direction: IntervalDirection
  lastQuiz: Quiz | null
  sessionStats: SessionStats
  loadProgress: number | null
  loadIndeterminate: boolean
  loadError: string | null
  onModeChange: (mode: AppMode) => void
  onToggle: () => void
  onOpenSettings: () => void
  onRetry: () => void
  onAnswerSelect: (intervalId: string) => void
  onReplayLastQuiz?: () => void
  isReplayingLastQuiz?: boolean
}

export function PracticeView({
  mode,
  state,
  isRunning,
  isLoading,
  speedPreset,
  enabledIntervalIds,
  direction,
  lastQuiz,
  sessionStats,
  loadProgress,
  loadIndeterminate,
  loadError,
  onModeChange,
  onToggle,
  onOpenSettings,
  onRetry,
  onAnswerSelect,
  onReplayLastQuiz,
  isReplayingLastQuiz = false,
}: PracticeViewProps) {
  const canStart = enabledIntervalIds.length > 0
  const speedLabel = SPEED_OPTIONS.find((o) => o.value === speedPreset)?.label ?? '中'
  const directionLabel =
    DIRECTION_OPTIONS.find((option) => option.value === direction)?.label ?? '上行'
  const selectedIntervals = INTERVALS.filter((interval) =>
    enabledIntervalIds.includes(interval.id),
  )
  const showSettingsHint = !canStart && !isRunning
  const isArcade = mode === 'arcade'
  const showPracticeChips = !isArcade && selectedIntervals.length > 0

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="relative flex flex-col items-center text-center">
        <div className="absolute right-0 top-0">
          <Button
            variant="icon"
            onClick={onOpenSettings}
            disabled={isRunning}
            aria-label="练习设置"
            title={isRunning ? '请先暂停练习' : '练习设置'}
            className={showSettingsHint ? 'ring-2 ring-sky-400/50' : ''}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M19.4 15a7.8 7.8 0 00.1-1 7.8 7.8 0 00-.1-1l2-1.5-2-3.5-2.4 1a7.5 7.5 0 00-1.7-1L15 3h-4l-.3 2.5a7.5 7.5 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 00-.1 1 7.8 7.8 0 00.1 1l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 001.7 1L11 21h4l.3-2.5a7.5 7.5 0 001.7-1l2.4 1 2-3.5-2-1.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
        <h1 className="text-xl font-bold sm:text-2xl">音程练耳</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          {isArcade ? '听音辨程 · 即时作答 · 统计成绩' : '上行 · 下行 · 和弦 · 中文播报'}
        </p>
      </header>

      <SegmentedControl
        options={MODE_OPTIONS}
        value={mode}
        onChange={onModeChange}
        disabled={isRunning}
      />

      <main className="flex flex-1 flex-col gap-4">
        {isArcade ? (
          isRunning && enabledIntervalIds.length > 0 ? (
            <ArcadePlayfield
              optionIds={enabledIntervalIds}
              state={state}
              sessionStats={sessionStats}
              lastQuiz={lastQuiz}
              loadProgress={loadProgress}
              loadIndeterminate={loadIndeterminate}
              loadError={loadError}
              onSelect={onAnswerSelect}
              onRetry={loadError ? onRetry : undefined}
            />
          ) : (
            <ArcadeIdlePanel
              enabledIntervalIds={enabledIntervalIds}
              lastQuiz={lastQuiz}
              sessionStats={sessionStats}
              isReplayingLastQuiz={isReplayingLastQuiz}
              onReplayLastQuiz={onReplayLastQuiz}
            />
          )
        ) : (
          <>
            <StatusHero
              mode={mode}
              state={state}
              isRunning={isRunning}
              lastQuiz={lastQuiz}
              loadProgress={loadProgress}
              loadIndeterminate={loadIndeterminate}
              loadError={loadError}
              onRetry={loadError ? onRetry : undefined}
            />

            {showPracticeChips && (
              <section className="flex flex-col items-center gap-3">
                <p className="text-sm text-[var(--text-secondary)]">已选音程</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {selectedIntervals.map((interval) => (
                    <Chip key={interval.id} active>
                      {interval.short}
                    </Chip>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="flex flex-col items-center gap-4">
        <Button
          onClick={onToggle}
          disabled={isLoading || (!isRunning && !canStart)}
          className="min-w-[160px] px-8 py-3.5 text-lg"
        >
          {isLoading
            ? '加载钢琴音色…'
            : isRunning
              ? '暂停'
              : isArcade
                ? '开始挑战'
                : '开始练习'}
        </Button>

        {showSettingsHint && (
          <p className="text-sm text-sky-400">请先在设置中选择音程</p>
        )}
      </footer>

      <button
        type="button"
        onClick={onOpenSettings}
        disabled={isRunning}
        className={cardClasses(
          'compact',
          'flex w-full items-center justify-between text-left transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <span className="text-sm text-[var(--text-secondary)]">速度</span>
          <Chip active>{speedLabel}</Chip>
          <span className="text-[var(--text-secondary)]">·</span>
          <Chip active>{directionLabel}</Chip>
          <span className="text-[var(--text-secondary)]">·</span>
          <span className="text-sm text-[var(--text-secondary)]">
            {enabledIntervalIds.length} 个音程
          </span>
        </div>
        <span className="shrink-0 text-sm text-sky-400">设置 ›</span>
      </button>
    </div>
  )
}
