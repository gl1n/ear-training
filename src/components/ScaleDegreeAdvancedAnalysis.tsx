import { DEGREE_SOLFEGE_LABELS, type DEGREE_OPTION_IDS } from '../quiz/keys'
import {
  aggregateByPreviousInterval,
  analyzeScaleDegreeWeaknesses,
  type ScaleDegreeMistakeStatsStore,
} from '../quiz/scaleDegreeMistakeStats'

function degreeName(degree: number) {
  return `${degree} (${DEGREE_SOLFEGE_LABELS[String(degree) as (typeof DEGREE_OPTION_IDS)[number]]})`
}

function intervalName(semitones: number) {
  const names: Record<number, string> = { 0: '同音', 1: '小二度', 2: '大二度', 3: '小三度', 4: '大三度', 5: '纯四度', 7: '纯五度', 12: '纯八度' }
  const direction = semitones > 0 ? '上行' : semitones < 0 ? '下行' : ''
  return `${direction}${names[Math.abs(semitones)] ?? `${Math.abs(semitones)} 半音`}`
}

export function ScaleDegreeAdvancedAnalysis({ store }: { store: ScaleDegreeMistakeStatsStore }) {
  const weaknesses = analyzeScaleDegreeWeaknesses(store)
  const transitions = aggregateByPreviousInterval(store)
  if (store.length < 3) return null
  const top = weaknesses[0]!

  return (
    <section className="w-full max-w-2xl rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 to-indigo-500/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold tracking-[.14em] text-sky-300">高级弱项分析</p><h3 className="mt-1 text-lg font-bold">你的高频错误模式</h3></div>
        <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200">{store.length} 条样本</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        首要弱项是 <strong className="text-white">{degreeName(top.degree)}</strong>，占全部错题的 {Math.round(top.share * 100)}%；其中 {Math.round(top.confusionRate * 100)}% 会误听成 <strong className="text-red-200">{degreeName(top.topWrongDegree)}</strong>。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-[var(--text-secondary)]">重点音级</p>{weaknesses.slice(0, 3).map((item) => <div key={item.degree} className="mt-2 flex items-center justify-between text-sm"><span>{degreeName(item.degree)} → {degreeName(item.topWrongDegree)}</span><span className="text-red-300">{item.count} 次</span></div>)}</div>
        <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-[var(--text-secondary)]">易错前后音程</p>{transitions.length ? transitions.slice(0, 3).map((item) => <div key={item.semitones} className="mt-2 flex items-center justify-between text-sm"><span>{intervalName(item.semitones)}</span><span className="text-amber-200">{item.count} 次 · 音级 {item.correctDegrees.join('/')}</span></div>) : <p className="mt-2 text-sm text-[var(--text-secondary)]">再完成几道题后，将开始识别上、下行跳进规律。</p>}</div>
      </div>
      <p className="mt-4 text-xs leading-5 text-sky-100/70">开启下方专项训练后，出题会综合错误频率、近期错误和固定混淆组合；有足够新样本时，还会复现你易错的前后音程关系。</p>
    </section>
  )
}
