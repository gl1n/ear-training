import { aggregateByCorrectDegree, type NoteKeyMistakeStatsStore } from '../quiz/noteKeyMistakeStats'

type NoteKeyMistakeSummaryProps = {
  store: NoteKeyMistakeStatsStore
  title: string
}

export function NoteKeyMistakeSummary({ store, title }: NoteKeyMistakeSummaryProps) {
  if (store.length === 0) {
    return null
  }

  const aggregates = aggregateByCorrectDegree(store)
  const maxCount = Math.max(...aggregates.map((item) => item.count), 1)

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <p className="text-center text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </p>
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-4">
        {aggregates.map(({ degree, count }) => (
          <div key={degree} className="flex items-center gap-3">
            <span className="w-8 shrink-0 text-right text-sm tabular-nums text-[var(--text-secondary)]">
              {degree}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded bg-black/30">
              <div
                className="absolute inset-y-0 left-0 rounded bg-red-400/70 transition-all"
                style={{ width: count > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
