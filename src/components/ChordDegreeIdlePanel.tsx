import type { ChordDegreeHistory, ChordDegreeInversionMode, ChordDegreeKey, ChordDegreeQuiz, ChordDegreeRange } from '../quiz/chordDegreeQuiz'
import { getCorrectAnswerCount, getTotalAnswerCount, type SessionStats } from '../quiz/stats'
import { ChordDegreeErrorChart } from './ChordDegreeErrorChart'
import { PlayAreaCard } from './PlayAreaCard'
import { Button } from './ui/Button'
import { SegmentedControl } from './ui/SegmentedControl'

type Props = { quiz: ChordDegreeQuiz | null; sessionStats: SessionStats; history: ChordDegreeHistory; sessionCompleted: boolean; selectedKey: ChordDegreeKey; range: ChordDegreeRange; inversionMode: ChordDegreeInversionMode; onKeyChange: (key: ChordDegreeKey) => void; onRangeChange: (range: ChordDegreeRange) => void; onInversionModeChange: (mode: ChordDegreeInversionMode) => void; onApplyPreset: (preset: 'beginner' | 'standard' | 'advanced') => void; onPlayDo: () => void }

export function ChordDegreeIdlePanel({ quiz, sessionStats, history, sessionCompleted, selectedKey, range, inversionMode, onKeyChange, onRangeChange, onInversionModeChange, onApplyPreset, onPlayDo }: Props) {
  const total = getTotalAnswerCount(sessionStats)
  const correct = getCorrectAnswerCount(sessionStats)
  if (quiz && total > 0) return <PlayAreaCard className="gap-6">
    <div className="text-center"><p className="text-xs font-semibold tracking-[.16em] text-sky-300">{sessionCompleted ? '本轮完成' : '本轮结束'}</p><h2 className="mt-2 text-3xl font-bold">{correct} / {total}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">答对率 {Math.round(correct / total * 100)}%</p></div>
    <ChordDegreeErrorChart sessionStats={sessionStats} history={history} />
    <Button type="button" variant="ghost" onClick={onPlayDo}>♪ 播放 do</Button>
  </PlayAreaCard>
  return <PlayAreaCard className="gap-6">
    <div><p className="text-xs font-semibold tracking-[.16em] text-sky-300">和弦级数挑战</p><h2 className="mt-2 text-2xl font-bold">听三和弦，猜级数</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">开局通过 1–2–3–4–5 和主和弦建立调性。每题可随时重听 do、题目和弦或连续对照，第一次答案才计入统计。</p></div>
    <div><p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">一键难度</p><div className="grid grid-cols-3 gap-2"><Button variant="ghost" onClick={() => onApplyPreset('beginner')}>新手</Button><Button variant="ghost" onClick={() => onApplyPreset('standard')}>标准</Button><Button variant="ghost" onClick={() => onApplyPreset('advanced')}>进阶</Button></div></div>
    <div className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div><p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">每局调性</p><SegmentedControl value={selectedKey} onChange={onKeyChange} options={[{ value: 'c-major', label: 'C 大调' }, { value: 'random', label: '随机调' }]} /></div>
      <div><p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">出题范围</p><SegmentedControl value={range} onChange={onRangeChange} options={[{ value: 'primary', label: '1、4、5 级' }, { value: 'all', label: '1–7 级' }]} /></div>
      <div><p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">和弦转位</p><SegmentedControl value={inversionMode} onChange={onInversionModeChange} options={[{ value: 'root', label: '仅根位' }, { value: 'random', label: '随机转位' }]} /></div>
    </div>
    <Button type="button" variant="ghost" onClick={onPlayDo}>♪ 播放 do</Button>
    <ChordDegreeErrorChart sessionStats={sessionStats} history={history} />
  </PlayAreaCard>
}
