import { useCallback, useEffect, useRef, useState } from 'react'
import { DEGREE_OPTION_IDS, DEGREE_SOLFEGE_LABELS, type MelodyScaleDegreeQuiz } from '../quiz/keys'
import type { TrainerState } from '../quiz/sequencer'
import { gradeMelody } from '../quiz/degreePractice'
import { Button } from '../common/ui/Button'

type Props = {
  quiz: MelodyScaleDegreeQuiz
  state: TrainerState
  isReplayBusy: boolean
  isLastQuestion: boolean
  onSubmit: (answer: string) => void
  onReplay?: () => void
  onNext?: () => void
}

export function MelodyDictation({ quiz, state, isReplayBusy, isLastQuestion, onSubmit, onReplay, onNext }: Props) {
  const [draft, setDraft] = useState<string[]>(() => quiz.degrees.map(() => ''))
  const [cursor, setCursor] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const submitLock = useRef(false)
  const [replayed, setReplayed] = useState(false)
  const revealed = state === 'answer_revealed'
  const canEdit = state === 'awaiting_answer' && !isReplayBusy && !submitted
  const results = revealed ? gradeMelody(quiz.degrees, draft.join('-')) : null
  const complete = draft.every(Boolean)

  const choose = useCallback((degree: string) => {
    if (!canEdit) return
    setDraft((current) => current.map((value, index) => index === cursor ? degree : value))
    setCursor((index) => Math.min(index + 1, quiz.degrees.length - 1))
  }, [canEdit, cursor, quiz.degrees.length])
  const erase = useCallback(() => {
    if (!canEdit) return
    const index = draft[cursor] ? cursor : Math.max(0, cursor - 1)
    setDraft((current) => current.map((value, i) => i === index ? '' : value))
    setCursor(index)
  }, [canEdit, cursor, draft])
  const submit = useCallback(() => {
    if (!canEdit || !complete || submitLock.current) return
    submitLock.current = true
    setSubmitted(true)
    onSubmit(draft.join('-'))
  }, [canEdit, complete, draft, onSubmit])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (/^[1-7]$/.test(event.key)) { event.preventDefault(); choose(event.key) }
      if (event.key === 'Backspace') { event.preventDefault(); erase() }
      if (event.key === 'Enter') { event.preventDefault(); if (revealed && !isReplayBusy) onNext?.(); else submit() }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [choose, erase, submit, revealed, isReplayBusy, onNext])

  return (
    <div className="flex flex-1 flex-col justify-center gap-5" aria-label="旋律整句听写">
      <p className="text-center text-sm text-[var(--text-secondary)]" aria-live="polite">
        {revealed ? results?.every(Boolean) ? `${replayed ? '重听后' : '首听'}整句正确` : '对照每个位置的正确音级，再重听原句' : canEdit ? `填写 ${quiz.degrees.length} 个音，点击位置可修改；整句提交后判分` : isReplayBusy ? '正在重听旋律…' : submitted ? '正在判分…' : `聆听 ${quiz.degrees.length} 音旋律…`}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {draft.map((degree, index) => (
          <button key={index} type="button" disabled={!canEdit} onClick={() => setCursor(index)}
            aria-label={`第 ${index + 1} 音：${degree || '未填写'}${revealed ? results?.[index] ? '，正确' : `，正确答案 ${quiz.degrees[index]}` : ''}`}
            aria-pressed={!revealed && index === cursor}
            className={`min-h-16 min-w-12 rounded-xl border px-3 py-2 text-center ${revealed ? results?.[index] ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-red-400/60 bg-red-500/15' : index === cursor ? 'border-sky-400 bg-sky-400/10' : 'border-[var(--border-subtle)]'}`}>
            <span className="block text-xs text-[var(--text-secondary)]">{index + 1}</span>
            <span className="block text-xl font-bold">{degree || '—'}</span>
            {revealed && <span className={`block text-xs ${results?.[index] ? 'text-emerald-300' : 'text-red-300'}`}>{results?.[index] ? '✓' : `应为 ${quiz.degrees[index]}`}</span>}
          </button>
        ))}
      </div>
      {!revealed && <>
        <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-2">
          {DEGREE_OPTION_IDS.map((degree) => <Button key={degree} disabled={!canEdit} onClick={() => choose(degree)} className="min-h-16">
            <span className="flex flex-col"><strong className="text-xl">{degree}</strong><span className="text-xs opacity-70">{DEGREE_SOLFEGE_LABELS[degree]}</span></span>
          </Button>)}
          <Button variant="ghost" disabled={!canEdit || !draft.some(Boolean)} onClick={erase}>删除</Button>
        </div>
        <Button disabled={!canEdit || !complete} onClick={submit} className="mx-auto min-h-11">提交整句</Button>
      </>}
      <div className="flex flex-wrap justify-center gap-3">
        {(state === 'awaiting_answer' || revealed) && <Button variant="ghost" disabled={isReplayBusy || (submitted && !revealed)} onClick={() => { if (!revealed) setReplayed(true); onReplay?.() }}>{isReplayBusy ? '重听中…' : '重听原句'}</Button>}
        {revealed && <Button disabled={isReplayBusy} onClick={onNext}>{isLastQuestion ? '查看结果' : '下一题'}</Button>}
      </div>
      {!revealed && <p className="text-center text-xs text-[var(--text-secondary)]">{replayed ? '本题计入重听练习' : '首听与重听成绩分别统计'} · 数字键输入，Enter 提交</p>}
    </div>
  )
}
