import type { SessionStats } from '../quiz/stats'
import type { DegreePracticeRecord } from '../quiz/degreePracticeHistory'

export function ListeningResults({ listening }: { listening: NonNullable<SessionStats['listening']> }) {
  const total = listening.firstAttempts + listening.replayAttempts
  return <div className="rounded-xl border border-sky-400/20 p-4 text-center text-sm">
    <p>首听整句正确：{listening.firstCorrect} / {total} · {total ? Math.round(listening.firstCorrect / total * 100) : 0}%</p>
    <p className="mt-1 text-[var(--text-secondary)]">重听后整句正确：{listening.replayCorrect} / {listening.replayAttempts} 道重听题</p>
  </div>
}

export function DegreePracticeProgress({ records }: { records: DegreePracticeRecord[] }) {
  if (!records.length) return null
  const total = records.reduce((sum, record) => sum + record.total, 0)
  const correct = records.reduce((sum, record) => sum + record.correct, 0)
  const listening = records.some((record) => record.listening) ? records.reduce((sum, record) => ({
    firstCorrect: sum.firstCorrect + (record.listening?.firstCorrect ?? 0),
    replayCorrect: sum.replayCorrect + (record.listening?.replayCorrect ?? 0),
    firstAttempts: sum.firstAttempts + (record.listening?.firstAttempts ?? 0),
    replayAttempts: sum.replayAttempts + (record.listening?.replayAttempts ?? 0),
  }), { firstCorrect: 0, replayCorrect: 0, firstAttempts: 0, replayAttempts: 0 }) : null
  return <div className="space-y-2 text-center text-sm">
    <p>当前训练设置 · 最近 {records.length} 轮 · 答对 {correct}/{total}（{Math.round(correct / total * 100)}%）</p>
    {listening && <ListeningResults listening={listening} />}
  </div>
}
