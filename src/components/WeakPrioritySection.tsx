import { useId, useState } from 'react'
import { MAX_LEVEL, type WeakPriorityItem } from '../quiz/quizPriority'
import type { Quiz } from '../quiz/intervals'
import { PlayableIntervalCard } from './PlayableIntervalCard'

type WeakPrioritySectionProps = {
  items: WeakPriorityItem[]
  replayingQuizKey: string | null
  isReplayBusy: boolean
  onPlayQuiz: (quiz: Quiz) => void
}

export function WeakPrioritySection({
  items,
  replayingQuizKey,
  isReplayBusy,
  onPlayQuiz,
}: WeakPrioritySectionProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const count = items.length

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-black/20 px-4 py-3 text-left transition hover:border-orange-400/25 hover:bg-orange-500/5"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            薄弱项
          </p>
          <p className="mt-0.5 text-sm text-[var(--text-primary)]">
            {count === 0 ? '暂无，继续保持' : `${count} 个音高对待加强`}
          </p>
        </div>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--text-secondary)] transition ${
            expanded ? 'rotate-180 bg-white/5' : ''
          }`}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {expanded && (
        <div
          id={panelId}
          className="animate-priority-boost-in rounded-xl border border-orange-400/15 bg-black/25 px-3 py-3"
        >
          {count === 0 ? (
            <p className="px-1 py-2 text-center text-sm text-[var(--text-secondary)]">
              还没有需要加重的题目。答错或反应变慢时会自动记录在这里。
            </p>
          ) : (
            <>
              <p className="mb-2 px-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                薄弱分 1–5（失误 +2、答对 -1）；出题 35% 抽薄弱项、65% 随机。点击可试听。
              </p>
              <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-0.5">
                {items.map((item) => (
                  <li key={item.key}>
                    <PlayableIntervalCard
                      quiz={item.quiz}
                      level={item.level}
                      variant="compact"
                      focusBadge={item.level >= MAX_LEVEL}
                      isPlaying={replayingQuizKey === item.key}
                      disabled={isReplayBusy && replayingQuizKey !== item.key}
                      onPlay={() => onPlayQuiz(item.quiz)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
