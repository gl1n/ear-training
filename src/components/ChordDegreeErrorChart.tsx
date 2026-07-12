import { CHORD_DEGREE_IDS, type ChordDegreeHistory } from '../quiz/chordDegreeQuiz'
import type { SessionStats } from '../quiz/stats'

type Props = { sessionStats: SessionStats; history: ChordDegreeHistory }

export function ChordDegreeErrorChart({ sessionStats, history }: Props) {
  const values = CHORD_DEGREE_IDS.flatMap((degree) => {
    const session = sessionStats.byKey[degree]
    const historical = history[degree]
    const currentRate = session?.totalCount ? (session.totalCount - session.correctCount) / session.totalCount : 0
    const historyRate = historical.attempts ? historical.errors / historical.attempts : 0
    return [currentRate, historyRate]
  })
  const maxRate = Math.max(0.1, ...values)

  return (
    <section className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold">各级数错误率</p><p className="mt-1 text-xs text-[var(--text-secondary)]">本局与累计历史对照</p></div>
        <div className="flex gap-3 text-[11px] text-[var(--text-secondary)]"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-400" />本局</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-violet-400" />历史</span></div>
      </div>
      <div className="mt-5 grid h-44 grid-cols-7 gap-2" role="img" aria-label="本局和历史各级和弦错误率直方图">
        {CHORD_DEGREE_IDS.map((degree) => {
          const current = sessionStats.byKey[degree]
          const historical = history[degree]
          const currentRate = current?.totalCount ? (current.totalCount - current.correctCount) / current.totalCount : 0
          const historyRate = historical.attempts ? historical.errors / historical.attempts : 0
          return <div key={degree} className="flex min-w-0 flex-col items-center">
            <div className="flex min-h-0 flex-1 items-end gap-1">
              <div title={`本局 ${Math.round(currentRate * 100)}%`} className="w-2.5 rounded-t bg-sky-400 transition-[height] sm:w-3" style={{ height: `${currentRate / maxRate * 100}%` }} />
              <div title={`历史 ${Math.round(historyRate * 100)}%`} className="w-2.5 rounded-t bg-violet-400 transition-[height] sm:w-3" style={{ height: `${historyRate / maxRate * 100}%` }} />
            </div>
            <span className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">{degree}</span>
          </div>
        })}
      </div>
    </section>
  )
}
