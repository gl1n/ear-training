import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  EMPTY_FRETBOARD_STATS,
  FRETBOARD_NOTE_NAMES,
  accuracy,
  averageReactionMs,
  createFretboardQuestion,
  fretboardCellsForNote,
  fretboardMistakeHeatmap,
  formatRegion,
  recentFretboardAnswers,
  recentFretboardMistakes,
  recordFretboardAnswer,
  recordFretboardTimeout,
  randomFretboardNote,
  regionId,
  type FretboardCell,
  type FretboardQuestion,
  type FretboardRegionCounts,
  type FretboardStat,
  type FretboardStats,
} from './fretboard'
import { STORAGE_KEYS } from '../../quiz/storageKeys'
import { readStorage, writeStorage } from '../../utils/storage'
import { FretboardBoard, type FretboardPluck } from './FretboardBoard'
import { Button } from '../../common/ui/Button'
import { Card } from '../../common/ui/Card'

type GamePhase = 'idle' | 'playing' | 'feedback' | 'finished'
type GameMode = 'region' | 'all-notes'

const ROUND_SECONDS = 60
const SLOW_ANSWER_MS = 5_000
const EMPTY_ROUND = { score: 0, streak: 0, bestStreak: 0, answered: 0, totalReactionMs: 0 }

function loadStats(): FretboardStats {
  try {
    const raw = readStorage(STORAGE_KEYS.fretboardStats)
    if (!raw) return EMPTY_FRETBOARD_STATS
    const parsed = JSON.parse(raw) as Partial<FretboardStats>
    if (!parsed.notes || !parsed.regions) return EMPTY_FRETBOARD_STATS
    const mistakes = recentFretboardMistakes(Array.isArray(parsed.mistakes) ? parsed.mistakes : [])
    const answers = recentFretboardAnswers(Array.isArray(parsed.answers) ? parsed.answers : [])
    const next = {
      notes: parsed.notes,
      regions: parsed.regions,
      questions: parsed.questions ?? {},
      answers,
      mistakes,
    }
    writeStorage(STORAGE_KEYS.fretboardStats, JSON.stringify(next))
    return next
  } catch {
    return EMPTY_FRETBOARD_STATS
  }
}

function StatLine({ label, stat }: { label: string; stat: FretboardStat }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/6 py-2.5 last:border-0">
      <span className="truncate text-sm font-medium text-white">{label}</span>
      <span className="text-xs tabular-nums text-[var(--text-secondary)]">{Math.round(accuracy(stat) * 100)}%</span>
      <span className="w-14 text-right text-xs tabular-nums text-[var(--text-secondary)]">{(averageReactionMs(stat) / 1000).toFixed(1)}s</span>
    </div>
  )
}

type FretboardTrainerProps = {
  onPlayNote: (midi: number) => void
}

export function FretboardTrainer({ onPlayNote }: FretboardTrainerProps) {
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [gameMode, setGameMode] = useState<GameMode>('region')
  const [continuous, setContinuous] = useState(true)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [question, setQuestion] = useState<FretboardQuestion>(() => createFretboardQuestion())
  const [round, setRound] = useState(EMPTY_ROUND)
  const [wrongCellKey, setWrongCellKey] = useState<string | null>(null)
  const [foundCellKeys, setFoundCellKeys] = useState<string[]>([])
  const [pluck, setPluck] = useState<FretboardPluck>({ stringIndex: -1, fret: 1, token: 0 })
  const [stats, setStats] = useState<FretboardStats>(loadStats)
  const statsRef = useRef(stats)
  const deadlineRef = useRef(0)
  const questionStartedAtRef = useRef(0)
  const questionTimedOutRef = useRef(false)
  const feedbackTimerRef = useRef<number | null>(null)
  const roundRegionCountsRef = useRef<FretboardRegionCounts>({})
  const fullscreenRef = useRef<HTMLDivElement | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const exitFullscreen = useCallback(async () => {
    setFullscreen(false)
    try {
      screen.orientation.unlock()
    } catch {
      // Direction locking is optional and is not available in every browser.
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const enterFullscreen = useCallback(async () => {
    setFullscreen(true)
    const container = fullscreenRef.current
    if (container?.requestFullscreen && !document.fullscreenElement) {
      await container.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined)
    }
    try {
      await screen.orientation.lock('landscape')
    } catch {
      // CSS rotates the layout on portrait phones when orientation lock is unavailable.
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setFullscreen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreen) void exitFullscreen()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [exitFullscreen, fullscreen])

  useEffect(() => {
    if (!fullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [fullscreen])

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = null
  }, [])

  const finishGame = useCallback(() => {
    clearFeedbackTimer()
    setPhase('finished')
    setTimeLeft(0)
    setWrongCellKey(null)
  }, [clearFeedbackTimer])

  const createRoundQuestion = useCallback(() => {
    if (gameMode === 'all-notes') {
      return { region: { stringStart: 0, fretStart: 0 }, targetNote: randomFretboardNote() }
    }
    const next = createFretboardQuestion(
      Math.random,
      statsRef.current,
      Date.now(),
      roundRegionCountsRef.current,
    )
    const id = regionId(next.region)
    roundRegionCountsRef.current[id] = (roundRegionCountsRef.current[id] ?? 0) + 1
    return next
  }, [gameMode])

  const nextQuestion = useCallback(() => {
    setQuestion(createRoundQuestion())
    setWrongCellKey(null)
    setFoundCellKeys([])
    setPhase('playing')
    questionTimedOutRef.current = false
    questionStartedAtRef.current = performance.now()
  }, [createRoundQuestion])

  const startGame = useCallback(() => {
    clearFeedbackTimer()
    roundRegionCountsRef.current = {}
    setQuestion(createRoundQuestion())
    setRound(EMPTY_ROUND)
    setWrongCellKey(null)
    setFoundCellKeys([])
    setTimeLeft(ROUND_SECONDS)
    deadlineRef.current = performance.now() + ROUND_SECONDS * 1000
    questionTimedOutRef.current = false
    questionStartedAtRef.current = performance.now()
    setPhase('playing')
  }, [clearFeedbackTimer, createRoundQuestion])

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'feedback') return
    if (continuous) return

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - performance.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) finishGame()
    }, 100)

    return () => window.clearInterval(timer)
  }, [continuous, finishGame, phase])

  useEffect(() => {
    if (phase !== 'playing') return

    const elapsedMs = performance.now() - questionStartedAtRef.current
    const timer = window.setTimeout(() => {
      questionTimedOutRef.current = true
      setStats((current) => {
        const next = recordFretboardTimeout(
          current,
          question,
          SLOW_ANSWER_MS,
          Date.now(),
          gameMode === 'all-notes',
        )
        statsRef.current = next
        writeStorage(STORAGE_KEYS.fretboardStats, JSON.stringify(next))
        return next
      })
      setRound((current) => ({
        ...current,
        answered: current.answered + 1,
        totalReactionMs: current.totalReactionMs + SLOW_ANSWER_MS,
      }))
    }, Math.max(0, SLOW_ANSWER_MS - elapsedMs))

    return () => window.clearTimeout(timer)
  }, [gameMode, phase, question])

  useEffect(() => () => clearFeedbackTimer(), [clearFeedbackTimer])

  const handleCellClick = useCallback((cell: FretboardCell, answeredAt: number) => {
    setPluck((current) => ({ stringIndex: cell.stringIndex, fret: cell.fret, token: current.token + 1 }))
    if (phase !== 'playing') {
      onPlayNote(cell.midi)
      return
    }

    const correct = cell.note === question.targetNote
    const reactionMs = Math.max(1, Math.round(answeredAt - questionStartedAtRef.current))
    onPlayNote(cell.midi)

    if (gameMode === 'all-notes') {
      const key = `${cell.stringIndex}:${cell.fret}`
      const targetCount = fretboardCellsForNote(question.targetNote).length

      if (!correct) {
        setWrongCellKey(key)
        clearFeedbackTimer()
        feedbackTimerRef.current = window.setTimeout(() => setWrongCellKey(null), 500)
        return
      }

      const nextFoundCellKeys = foundCellKeys.includes(key) ? foundCellKeys : [...foundCellKeys, key]
      setFoundCellKeys(nextFoundCellKeys)
      setWrongCellKey(null)
      if (nextFoundCellKeys.length < targetCount) return

      setPhase('feedback')
      if (!questionTimedOutRef.current) {
        setRound((current) => {
          const streak = current.streak + 1
          return {
            score: current.score + 1,
            streak,
            bestStreak: Math.max(current.bestStreak, streak),
            answered: current.answered + 1,
            totalReactionMs: current.totalReactionMs + reactionMs,
          }
        })
      }
      clearFeedbackTimer()
      feedbackTimerRef.current = window.setTimeout(() => {
        if (!continuous && performance.now() >= deadlineRef.current) finishGame()
        else nextQuestion()
      }, 650)
      return
    }

    setPhase('feedback')
    setWrongCellKey(correct ? null : `${cell.stringIndex}:${cell.fret}`)
    const resolvesTimedOutQuestion = correct && questionTimedOutRef.current
    if (!resolvesTimedOutQuestion) {
      setRound((current) => {
        const streak = correct ? current.streak + 1 : 0
        return {
          score: current.score + (correct ? 1 : 0),
          streak,
          bestStreak: Math.max(current.bestStreak, streak),
          answered: current.answered + 1,
          totalReactionMs: current.totalReactionMs + reactionMs,
        }
      })
      setStats((current) => {
        const next = recordFretboardAnswer(current, question, cell, correct, reactionMs)
        statsRef.current = next
        writeStorage(STORAGE_KEYS.fretboardStats, JSON.stringify(next))
        return next
      })
    }

    clearFeedbackTimer()
    feedbackTimerRef.current = window.setTimeout(() => {
      if (!continuous && performance.now() >= deadlineRef.current) finishGame()
      else nextQuestion()
    }, correct ? 320 : 500)
  }, [clearFeedbackTimer, continuous, finishGame, foundCellKeys, gameMode, nextQuestion, onPlayNote, phase, question])

  const weakestNotes = useMemo(
    () => FRETBOARD_NOTE_NAMES
      .flatMap((note) => stats.notes[note] ? [{ label: note, stat: stats.notes[note] }] : [])
      .sort((a, b) => accuracy(a.stat) - accuracy(b.stat) || b.stat.attempts - a.stat.attempts)
      .slice(0, 6),
    [stats.notes],
  )
  const weakestRegions = useMemo(
    () => Object.entries(stats.regions)
      .map(([label, stat]) => ({ label: label.replace(/^s/, '').replace(':f', ' 弦 · ').replace('-', '–') + ' 品', stat }))
      .sort((a, b) => accuracy(a.stat) - accuracy(b.stat) || b.stat.attempts - a.stat.attempts)
      .slice(0, 4),
    [stats.regions],
  )
  const averageMs = round.answered === 0 ? 0 : round.totalReactionMs / round.answered
  const mistakeHeatmap = useMemo(() => fretboardMistakeHeatmap(stats.answers), [stats.answers])
  const roundActive = phase === 'playing' || phase === 'feedback'
  const showStats = phase === 'idle' || phase === 'finished'
  const targetCellCount = gameMode === 'all-notes' ? fretboardCellsForNote(question.targetNote).length : 0

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-4 gap-2" aria-label="本轮数据">
        {[
          { label: continuous ? '模式' : '剩余', value: continuous ? '∞' : `${timeLeft}s` },
          { label: gameMode === 'all-notes' ? '通过' : '得分', value: String(round.score) },
          gameMode === 'all-notes'
            ? { label: '已找到 / 全部', value: roundActive ? `${foundCellKeys.length}/${targetCellCount}` : '—' }
            : { label: '连击', value: String(round.streak) },
          { label: '平均', value: averageMs ? `${(averageMs / 1000).toFixed(1)}s` : '—' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-white/[0.035] px-2 py-3 text-center">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">{item.value}</p>
          </div>
        ))}
      </section>

      <div ref={fullscreenRef} className={`fretboard-focus-shell${fullscreen ? ' fretboard-focus-shell--fullscreen fixed inset-0 z-[100] h-dvh w-screen overflow-hidden bg-[#080d14]' : ''}`}>
        <Card className={`overflow-hidden border-amber-300/15 bg-[linear-gradient(145deg,rgba(251,191,36,.08),rgba(255,255,255,.025))] p-4 sm:p-6 ${fullscreen ? 'flex h-full flex-col rounded-xl !p-3' : ''}`}>
          <div className={`fretboard-trainer-heading flex items-end justify-between gap-3 ${fullscreen ? 'mb-2 min-h-14' : 'mb-5 min-h-[5.25rem]'}`}>
            {roundActive ? (
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-amber-300">
                  {gameMode === 'all-notes' ? `全指板 · 已找到 ${foundCellKeys.length} / ${targetCellCount}` : formatRegion(question.region)}
                </p>
                <div className="mt-1 flex items-baseline gap-3">
                  <h2 className={`${fullscreen ? 'text-base' : 'text-xl'} font-semibold text-white`}>
                    {gameMode === 'all-notes' ? '找出全部' : '找到这个音'}
                  </h2>
                  <span className={`${fullscreen ? 'text-3xl' : 'text-4xl sm:text-5xl'} font-black tracking-tight text-amber-300`}>{question.targetNote}</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-amber-300">指板定位训练</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{phase === 'finished' ? '本轮已结束' : '准备开始'}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {gameMode === 'all-notes' ? '找齐 0–12 品内的全部目标音才算通过' : '点击指板可自由试音，开始后将显示随机区域与目标音'}
                </p>
              </div>
            )}
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-300/15"
                onClick={() => void (fullscreen ? exitFullscreen() : enterFullscreen())}
                aria-label={fullscreen ? '退出全屏指板' : '横屏全屏显示指板'}
                aria-pressed={fullscreen}
              >
                <span aria-hidden="true">{fullscreen ? '↙' : '↗'}</span>
                {fullscreen ? '退出全屏' : '横屏全屏'}
              </button>
              <p className={`${fullscreen ? 'hidden' : 'fretboard-tuning-label'} text-xs text-[var(--text-secondary)]`}>标准调弦 · 点按正确品格</p>
            </div>
          </div>

          <FretboardBoard
            question={question}
            showQuestion={roundActive}
            canAnswer={phase === 'playing'}
            revealAnswer={phase === 'feedback'}
            wrongCellKey={wrongCellKey}
            pluck={pluck}
            mistakeHeatmap={showStats ? mistakeHeatmap : {}}
            wholeBoard={gameMode === 'all-notes'}
            foundCellKeys={foundCellKeys}
            fullscreen={fullscreen}
            onSelect={handleCellClick}
          />
          {showStats && stats.answers.length > 0 && (
            <div className={`${fullscreen ? 'hidden' : 'mt-3 flex'} items-center justify-end gap-2 text-xs text-[var(--text-secondary)]`} aria-label="错题热力图图例">
              <span>错题位置</span>
              <span className="h-2.5 w-16 rounded-full bg-gradient-to-r from-red-500/10 to-red-500/80" aria-hidden="true" />
              <span>越红错误率越高 · 近 48 小时</span>
            </div>
          )}
          <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-white/8 ${fullscreen ? 'mt-2 pt-2' : 'mt-5 pt-4'}`}>
            <div className={`${fullscreen ? 'hidden' : 'flex'} flex-wrap items-center gap-3`}>
              <div className="flex rounded-xl border border-[var(--border-subtle)] bg-black/20 p-1" aria-label="指板练习模式">
                {([
                  ['region', '区域闪击'],
                  ['all-notes', '全指板找音'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGameMode(value)}
                    disabled={roundActive}
                    aria-pressed={gameMode === value}
                    className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition ${
                      gameMode === value ? 'bg-amber-300 text-slate-950' : 'text-[var(--text-secondary)] hover:bg-white/8 hover:text-white'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={continuous}
                  onChange={(event) => setContinuous(event.target.checked)}
                  disabled={roundActive}
                  className="size-4 accent-amber-300"
                />
                连续模式（不计时）
              </label>
            </div>
            {roundActive ? (
              <Button variant="ghost" onClick={finishGame}>结束本轮</Button>
            ) : (
              <Button onClick={startGame} className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                {phase === 'finished' ? '再来一轮' : '开始训练'}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {phase === 'finished' && (
        <Card className="border-emerald-300/15 bg-emerald-300/[0.045] p-5 text-center">
          <p className="text-xs font-semibold tracking-[0.16em] text-emerald-300">本轮完成</p>
          <p className="mt-2 text-2xl font-bold">
            {gameMode === 'all-notes' ? `找齐并通过 ${round.score} 个音` : `答对 ${round.score} 题 · 最长连击 ${round.bestStreak}`}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {gameMode === 'all-notes' ? `平均每个音用时 ${(averageMs / 1000).toFixed(1)} 秒` : `共作答 ${round.answered} 次，平均反应 ${(averageMs / 1000).toFixed(1)} 秒`}
          </p>
        </Card>
      )}

      {showStats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">薄弱音名</h3><span className="text-xs text-[var(--text-secondary)]">正确率 · 平均耗时</span>
            </div>
            {weakestNotes.length ? weakestNotes.map((item) => <StatLine key={item.label} {...item} />) : <p className="py-6 text-center text-sm text-[var(--text-secondary)]">完成第一轮后显示音名统计</p>}
          </Card>
          <Card className="p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">薄弱区域</h3><span className="text-xs text-[var(--text-secondary)]">正确率 · 平均耗时</span>
            </div>
            {weakestRegions.length ? weakestRegions.map((item) => <StatLine key={item.label} {...item} />) : <p className="py-6 text-center text-sm text-[var(--text-secondary)]">每个 3 × 4 区域会独立记录</p>}
          </Card>
        </div>
      )}
    </div>
  )
}
