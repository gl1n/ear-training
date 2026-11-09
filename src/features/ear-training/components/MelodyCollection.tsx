import { useState } from 'react'
import type { MelodyScaleDegreeQuiz } from '../../../quiz/keys'
import { loadMelodyFavorites, melodyFavoriteId, removeMelodyFavorite, saveMelodyFavorite, type MelodyFavorite } from '../../../quiz/melodyFavorites'
import { Button } from '../../../common/ui/Button'

export function SaveMelodyButton({ quiz, answerDegrees }: { quiz: MelodyScaleDegreeQuiz; answerDegrees: number[] }) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const exists = loadMelodyFavorites().some((item) => melodyFavoriteId(item) === melodyFavoriteId(quiz))
  return <div className="text-center">
    <Button variant="ghost" disabled={saved} onClick={() => {
      const success = saveMelodyFavorite({ ...quiz, answerDegrees, mastered: false })
      setSaved(success)
      setError(!success)
    }}>{saved ? '已收藏本次答题' : exists ? '更新收藏中的答题记录' : '收藏这句旋律'}</Button>
    {error && <p role="status" className="text-xs text-red-400">未能保存，请检查浏览器存储后重试</p>}
  </div>
}

const PAGE_SIZE = 6
const fieldClass = 'min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm'

export function MelodyCollection({ onPlay, isReplayBusy }: { onPlay: (quiz: MelodyScaleDegreeQuiz) => void; isReplayBusy: boolean }) {
  const [favorites, setFavorites] = useState(loadMelodyFavorites)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [length, setLength] = useState('all')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [removed, setRemoved] = useState<MelodyFavorite | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const pendingCount = favorites.filter((quiz) => !quiz.mastered).length
  const query = search.trim().toLowerCase()
  const filtered = favorites.filter((quiz) =>
    (status === 'all' || (status === 'mastered' ? quiz.mastered : !quiz.mastered)) &&
    (length === 'all' || quiz.degrees.length === Number(length)) &&
    (!query || quiz.keyLabel.toLowerCase().includes(query) || quiz.degrees.join('').includes(query.replace(/[\s,，-]/g, ''))),
  ).reverse()
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  const refresh = (success: boolean) => {
    setError(!success)
    if (success) setFavorites(loadMelodyFavorites())
    return success
  }

  return <section className="mt-4 space-y-4 rounded-xl border border-[var(--border-subtle)] p-4" aria-label="收藏的旋律">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-semibold">收藏的旋律 <span className="text-sm font-normal text-[var(--text-secondary)]">{favorites.length} 句</span></h2>
      <span className="text-xs text-[var(--text-secondary)]">{pendingCount} 句待复习</span>
    </div>
    <p className="text-xs text-[var(--text-secondary)]">红色标出收藏时答错的位置，展开可对照当时答案。收藏保存在当前浏览器中。</p>
    {favorites.length > 0 && <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="收藏分类">
        {[['pending', `待复习 ${pendingCount}`], ['mastered', `已掌握 ${favorites.length - pendingCount}`], ['all', '全部']].map(([value, label]) =>
          <Button key={value} variant="ghost" aria-pressed={status === value} className={status === value ? 'ring-2 ring-sky-400' : ''} onClick={() => { setStatus(value!); setPage(0) }}>{label}</Button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="search" aria-label="搜索收藏旋律" placeholder="搜索调性或音级，如 C、135" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} className={`${fieldClass} min-w-0 flex-1`} />
        <select aria-label="按旋律音数筛选" value={length} onChange={(event) => { setLength(event.target.value); setPage(0) }} className={fieldClass}>
          <option value="all">全部音数</option>{[3, 5, 7].map((count) => <option key={count} value={count}>{count} 音</option>)}
        </select>
      </div>
    </>}
    {!favorites.length && <p className="text-sm text-[var(--text-secondary)]">答题后点击“收藏这句旋律”，把想再练的句子留在这里。</p>}
    {favorites.length > 0 && !filtered.length && <div className="space-y-2 text-sm text-[var(--text-secondary)]">
      <p>{status === 'pending' && !pendingCount ? '收藏的旋律都已掌握。可切换到“已掌握”再次复习。' : '没有符合条件的旋律。'}</p>
      <Button variant="ghost" onClick={() => { setSearch(''); setLength('all'); setStatus('all'); setPage(0) }}>查看全部收藏</Button>
    </div>}
    <div className="space-y-2">
      {filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((quiz) => {
        const id = melodyFavoriteId(quiz)
        const wrongCount = quiz.answerDegrees?.filter((degree, i) => degree !== quiz.degrees[i]).length
        const isExpanded = expanded === id
        return <article key={id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" aria-expanded={isExpanded} aria-label={`${quiz.keyLabel}，${quiz.degrees.join(' ')}，${isExpanded ? '收起' : '展开'}答题记录`} className="min-w-0 space-y-2 text-left" onClick={() => setExpanded(isExpanded ? null : id)}>
              <span className="block text-xs text-[var(--text-secondary)]">{quiz.keyLabel} · {quiz.degrees.length} 音 · {wrongCount === undefined ? '未记录当时答案' : wrongCount ? `${wrongCount} 处错音` : '当时全对'} · {isExpanded ? '收起 ▴' : '展开 ▾'}</span>
              <span className="flex flex-wrap gap-2">{quiz.degrees.map((degree, i) => {
                const wrong = quiz.answerDegrees && quiz.answerDegrees[i] !== degree
                return <strong key={i} aria-label={`第 ${i + 1} 音 ${degree}${wrong ? '，当时答错' : ''}`} className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${wrong ? 'bg-red-500/15 text-red-400 ring-1 ring-red-400/40' : ''}`}>{degree}</strong>
              })}</span>
            </button>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" disabled={isReplayBusy} onClick={() => { setPlaying(id); onPlay(quiz) }}>{isReplayBusy && playing === id ? '播放中…' : '重听'}</Button>
              <Button variant="ghost" onClick={() => refresh(saveMelodyFavorite({ ...quiz, mastered: !quiz.mastered }))}>{quiz.mastered ? '移回待复习' : '标记已掌握'}</Button>
            </div>
          </div>
          {isExpanded && <div className="mt-3 space-y-3 border-t border-[var(--border-subtle)] pt-3">
            {quiz.answerDegrees ? <div className="flex flex-wrap gap-2">{quiz.answerDegrees.map((answer, i) => {
              const wrong = answer !== quiz.degrees[i]
              return <div key={i} className={`min-w-14 rounded-lg p-2 text-center ${wrong ? 'bg-red-500/10 text-red-400' : 'text-[var(--text-secondary)]'}`}>
                <span className="block text-[10px]">第 {i + 1} 音</span><strong className="block text-lg">{answer}</strong>
                <span className="block text-xs">{wrong ? `应为 ${quiz.degrees[i]}` : '✓ 正确'}</span>
              </div>
            })}</div> : <p className="text-xs text-[var(--text-secondary)]">这句是早期收藏，没有保存当时的答案；原句仍可完整重听。</p>}
            <Button variant="ghost" onClick={() => {
              if (refresh(removeMelodyFavorite(quiz))) { setRemoved(quiz); setExpanded(null) }
            }}>移除收藏</Button>
          </div>}
        </article>
      })}
    </div>
    {filtered.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
      <span>共 {filtered.length} 句 · 最近收藏优先 · {currentPage + 1} / {pages} 页</span>
      {pages > 1 && <div className="flex gap-2"><Button variant="ghost" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>上一页</Button><Button variant="ghost" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}>下一页</Button></div>}
    </div>}
    {removed && <div role="status" className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-elevated)] p-3 text-sm"><span>已移除 {removed.keyLabel} · {removed.degrees.join(' ')}</span><Button variant="ghost" onClick={() => { if (refresh(saveMelodyFavorite(removed))) setRemoved(null) }}>撤销</Button></div>}
    {error && <p role="alert" className="text-sm text-red-400">未能更新收藏，请检查浏览器存储后重试。</p>}
  </section>
}
