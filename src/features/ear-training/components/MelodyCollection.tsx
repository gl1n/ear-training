import { useState } from 'react'
import type { MelodyScaleDegreeQuiz } from '../../../quiz/keys'
import { loadMelodyFavorites, melodyFavoriteId, melodyOctaveLabel, removeMelodyFavorite, saveMelodyFavorite } from '../../../quiz/melodyFavorites'
import { Button } from '../../../common/ui/Button'

export function SaveMelodyButton({ quiz }: { quiz: MelodyScaleDegreeQuiz }) {
  const [saved, setSaved] = useState(() => loadMelodyFavorites().some((item) => melodyFavoriteId(item) === melodyFavoriteId(quiz)))
  const [error, setError] = useState(false)
  return <div className="text-center">
    <Button variant="ghost" disabled={saved} onClick={() => {
      const success = saveMelodyFavorite(quiz)
      setSaved(success)
      setError(!success)
    }}>{saved ? '已收藏原句' : '收藏这句旋律'}</Button>
    {error && <p role="status" className="text-xs text-red-400">未能保存，请检查浏览器存储后重试</p>}
  </div>
}

export function MelodyCollection({ onPlay, isReplayBusy }: { onPlay: (quiz: MelodyScaleDegreeQuiz) => void; isReplayBusy: boolean }) {
  const [favorites, setFavorites] = useState(loadMelodyFavorites)
  const [error, setError] = useState(false)
  return <section className="mt-4 space-y-3 rounded-xl border border-[var(--border-subtle)] p-4" aria-label="收藏的旋律">
    <h2 className="font-semibold">收藏的旋律 · {favorites.length}</h2>
    <p className="text-xs text-[var(--text-secondary)]">保存原调、每个音的八度、节奏和播放速度；保存在当前浏览器中。</p>
    {!favorites.length && <p className="text-sm text-[var(--text-secondary)]">答题后点击“收藏这句旋律”，下次可在这里重听。</p>}
    {favorites.map((quiz) => <div key={melodyFavoriteId(quiz)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--bg-elevated)] p-3">
      <div><p className="text-xs text-[var(--text-secondary)]">{quiz.keyLabel}</p><div className="mt-1 flex flex-wrap gap-3">{quiz.degrees.map((degree, i) => <span key={i} className="text-center"><strong>{degree}</strong><span className="block text-[10px] text-[var(--text-secondary)]">{melodyOctaveLabel(quiz, i)} · {quiz.noteBeats?.[i] ?? 1} 拍</span></span>)}</div></div>
      <div className="flex gap-2"><Button disabled={isReplayBusy} onClick={() => onPlay(quiz)}>重听原句</Button><Button variant="ghost" disabled={isReplayBusy} onClick={() => {
        const success = removeMelodyFavorite(quiz)
        setError(!success)
        if (success) setFavorites(loadMelodyFavorites())
      }}>取消收藏</Button></div>
    </div>)}
    {error && <p role="status">未能更新收藏，请重试。</p>}
  </section>
}
