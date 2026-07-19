import { useCallback, useEffect, useRef, useState } from 'react'
import { createAudioContext, unlockAudioContextSync } from '../../audio/context'
import { Button } from '../../common/ui/Button'
import {
  RHYTHM_STEPS_PER_BAR,
  adaptRhythmDifficulty,
  createRhythmPattern,
  getRhythmTolerance,
  scoreRhythmTaps,
  type RhythmDifficulty,
  type RhythmPattern,
  type RhythmScore,
} from '../../quiz/rhythm'

type RhythmPhase = 'idle' | 'count-in' | 'listen' | 'tap' | 'paused'

type SessionStats = {
  rounds: number
  accuracyTotal: number
  streak: number
  bestStreak: number
}

type Feedback = {
  pattern: RhythmPattern
  score: RhythmScore
}

const DIFFICULTY_LABELS: Record<RhythmDifficulty, string> = {
  1: '稳拍与休止',
  2: '八分音符',
  3: '切分节奏',
  4: '十六分组合',
}

const EMPTY_STATS: SessionStats = {
  rounds: 0,
  accuracyTotal: 0,
  streak: 0,
  bestStreak: 0,
}

function phaseCopy(phase: RhythmPhase): { kicker: string; title: string; detail: string } {
  if (phase === 'count-in') {
    return { kicker: '准备', title: '听四拍预备', detail: '先让身体找到稳定的拍子' }
  }
  if (phase === 'listen') {
    return { kicker: '听', title: '记住这段节奏', detail: '下一小节轮到你回应' }
  }
  if (phase === 'tap') {
    return { kicker: '轮到你', title: '把刚才的节奏敲回来', detail: '空格键、鼠标或触屏都可以' }
  }
  if (phase === 'paused') {
    return { kicker: '已暂停', title: '休息一下', detail: '继续时会重新给四拍预备' }
  }
  return { kicker: '无限回声模式', title: '一次开始，持续练习', detail: '听一小节，再用敲击回应一小节' }
}

function timingSummary(score: RhythmScore): string {
  if (score.meanOffsetBeats === null) return '还没有命中节奏'
  if (Math.abs(score.meanOffsetBeats) <= 0.05) return '整体落点很稳'
  return score.meanOffsetBeats < 0 ? '整体稍微偏早' : '整体稍微偏晚'
}

export function RhythmPracticePanel() {
  const [bpm, setBpm] = useState(84)
  const [difficulty, setDifficulty] = useState<RhythmDifficulty>(1)
  const [adaptive, setAdaptive] = useState(false)
  const [phase, setPhase] = useState<RhythmPhase>('idle')
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [tapMarks, setTapMarks] = useState<number[]>([])
  const [pattern, setPattern] = useState(() => createRhythmPattern(1))
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)

  const contextRef = useRef<AudioContext | null>(null)
  const timersRef = useRef<number[]>([])
  const oscillatorsRef = useRef(new Set<OscillatorNode>())
  const phaseRef = useRef<RhythmPhase>('idle')
  const bpmRef = useRef(bpm)
  const difficultyRef = useRef(difficulty)
  const adaptiveRef = useRef(adaptive)
  const patternRef = useRef(pattern)
  const inputWindowRef = useRef<{
    responseStart: number
    responseEnd: number
    toleranceSec: number
  } | null>(null)
  const tapsRef = useRef<number[]>([])
  const recentScoresRef = useRef<number[]>([])
  const sessionTokenRef = useRef(0)
  const scheduleCycleRef = useRef<(
    nextPattern: RhythmPattern,
    includeCountIn: boolean,
    startTime?: number,
  ) => void>(() => {})

  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])
  useEffect(() => { adaptiveRef.current = adaptive }, [adaptive])
  useEffect(() => { patternRef.current = pattern }, [pattern])

  const changePhase = useCallback((next: RhythmPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const clearTimersAndSounds = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    timersRef.current = []
    for (const oscillator of oscillatorsRef.current) {
      try { oscillator.stop() } catch { /* already stopped */ }
    }
    oscillatorsRef.current.clear()
  }, [])

  const scheduleUi = useCallback((context: AudioContext, time: number, action: () => void) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((pending) => pending !== timer)
      action()
    }, Math.max(0, (time - context.currentTime) * 1000))
    timersRef.current.push(timer)
  }, [])

  const playTone = useCallback((
    context: AudioContext,
    time: number,
    frequency: number,
    volume: number,
    duration = 0.055,
  ) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, time)
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillatorsRef.current.add(oscillator)
    oscillator.onended = () => oscillatorsRef.current.delete(oscillator)
    oscillator.start(time)
    oscillator.stop(time + duration + 0.01)
  }, [])

  const scheduleCycle = useCallback((
    nextPattern: RhythmPattern,
    includeCountIn: boolean,
    startTime?: number,
  ) => {
    const context = contextRef.current
    if (!context || context.state === 'closed') return
    const token = sessionTokenRef.current
    const beatDuration = 60 / bpmRef.current
    const barDuration = beatDuration * 4
    const baseTime = startTime ?? context.currentTime + 0.08
    const listenStart = baseTime + (includeCountIn ? barDuration : 0)
    const responseStart = listenStart + barDuration
    const responseEnd = responseStart + barDuration
    const evaluationTime = responseEnd - Math.min(0.06, beatDuration * 0.08)
    const tolerance = getRhythmTolerance(nextPattern, beatDuration)
    const inputOpenTime = responseStart - tolerance.closeWindowSec
    inputWindowRef.current = {
      responseStart,
      responseEnd,
      toleranceSec: tolerance.closeWindowSec,
    }
    tapsRef.current = []
    setTapMarks([])

    if (includeCountIn) {
      changePhase('count-in')
      for (let beat = 0; beat < 4; beat += 1) {
        const time = baseTime + beat * beatDuration
        playTone(context, time, beat === 0 ? 1120 : 760, beat === 0 ? 0.18 : 0.1)
        scheduleUi(context, time, () => {
          if (sessionTokenRef.current === token) setActiveStep(beat * 4)
        })
      }
    } else {
      changePhase('listen')
    }

    scheduleUi(context, listenStart, () => {
      if (sessionTokenRef.current !== token) return
      changePhase('listen')
      setTapMarks([])
      setActiveStep(null)
    })

    for (const step of nextPattern.steps) {
      const time = listenStart + step * beatDuration / 4
      playTone(context, time, step === 0 ? 1320 : 940, step === 0 ? 0.22 : 0.15, 0.07)
      scheduleUi(context, time, () => {
        if (sessionTokenRef.current === token) setActiveStep(step)
      })
    }

    scheduleUi(context, inputOpenTime, () => {
      if (sessionTokenRef.current !== token) return
      changePhase('tap')
    })

    scheduleUi(context, responseStart, () => {
      if (sessionTokenRef.current === token) setActiveStep(0)
    })

    for (let beat = 0; beat < 4; beat += 1) {
      const step = beat * 4
      const time = responseStart + beat * beatDuration
      playTone(context, time, beat === 0 ? 620 : 480, beat === 0 ? 0.075 : 0.04, 0.04)
      scheduleUi(context, time, () => {
        if (sessionTokenRef.current === token) setActiveStep(step)
      })
    }

    scheduleUi(context, evaluationTime, () => {
      if (sessionTokenRef.current !== token) return
      changePhase('listen')
      setActiveStep(null)
      const score = scoreRhythmTaps(nextPattern, tapsRef.current, beatDuration)
      const scoreWindow = [...recentScoresRef.current, score.accuracy].slice(-10)
      const nextDifficulty = adaptiveRef.current
        ? adaptRhythmDifficulty(difficultyRef.current, scoreWindow)
        : difficultyRef.current

      recentScoresRef.current = nextDifficulty === difficultyRef.current ? scoreWindow : []
      difficultyRef.current = nextDifficulty
      setDifficulty(nextDifficulty)
      setFeedback({ pattern: nextPattern, score })
      setStats((current) => {
        const streak = score.accuracy >= 75 ? current.streak + 1 : 0
        return {
          rounds: current.rounds + 1,
          accuracyTotal: current.accuracyTotal + score.accuracy,
          streak,
          bestStreak: Math.max(current.bestStreak, streak),
        }
      })

      const followingPattern = createRhythmPattern(
        nextDifficulty,
        Math.random,
        nextPattern.signature,
      )
      patternRef.current = followingPattern
      setPattern(followingPattern)
      scheduleCycleRef.current(followingPattern, false, responseEnd)
    })
  }, [changePhase, playTone, scheduleUi])

  useEffect(() => {
    scheduleCycleRef.current = scheduleCycle
  }, [scheduleCycle])

  const start = useCallback(() => {
    const context = contextRef.current && contextRef.current.state !== 'closed'
      ? contextRef.current
      : createAudioContext()
    contextRef.current = context
    unlockAudioContextSync(context)
    clearTimersAndSounds()
    sessionTokenRef.current += 1

    if (phaseRef.current === 'idle') {
      setStats(EMPTY_STATS)
      setFeedback(null)
      recentScoresRef.current = []
    }
    scheduleCycle(patternRef.current, true)
  }, [clearTimersAndSounds, scheduleCycle])

  const pause = useCallback(() => {
    sessionTokenRef.current += 1
    clearTimersAndSounds()
    inputWindowRef.current = null
    setActiveStep(null)
    changePhase('paused')
  }, [changePhase, clearTimersAndSounds])

  const handleTap = useCallback(() => {
    const context = contextRef.current
    const inputWindow = inputWindowRef.current
    if (!context || !inputWindow) return
    const now = context.currentTime
    if (
      now < inputWindow.responseStart - inputWindow.toleranceSec ||
      now > inputWindow.responseEnd
    ) return
    const relativeTime = now - inputWindow.responseStart
    tapsRef.current = [...tapsRef.current, relativeTime]
    setTapMarks(tapsRef.current)
    playTone(context, context.currentTime, 1180, 0.11, 0.045)
  }, [playTone])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, select, textarea, button, [contenteditable="true"]')) return
      if (event.code !== 'Space' || event.repeat) return
      event.preventDefault()
      if (
        phaseRef.current === 'count-in' ||
        phaseRef.current === 'listen' ||
        phaseRef.current === 'tap'
      ) handleTap()
      else if (phaseRef.current === 'idle' || phaseRef.current === 'paused') start()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTap, start])

  useEffect(() => () => {
    sessionTokenRef.current += 1
    for (const timer of timersRef.current) window.clearTimeout(timer)
    for (const oscillator of oscillatorsRef.current) {
      try { oscillator.stop() } catch { /* already stopped */ }
    }
    void contextRef.current?.close()
  }, [])

  const copy = phaseCopy(phase)
  const isRunning = phase === 'count-in' || phase === 'listen' || phase === 'tap'
  const averageAccuracy = stats.rounds === 0 ? 0 : Math.round(stats.accuracyTotal / stats.rounds)
  const beatDuration = 60 / bpm

  return (
    <section className="rhythm-practice" aria-label="无限节奏回声练习">
      <div className="rhythm-session-bar">
        <div className="rhythm-stat">
          <span>已完成</span>
          <strong>{stats.rounds}</strong>
          <small>小节</small>
        </div>
        <div className="rhythm-stat">
          <span>平均准确率</span>
          <strong>{averageAccuracy}</strong>
          <small>%</small>
        </div>
        <div className="rhythm-stat">
          <span>当前连击</span>
          <strong>{stats.streak}</strong>
          <small>最佳 {stats.bestStreak}</small>
        </div>
        <div className="rhythm-level">
          <span>当前训练内容</span>
          <strong>{DIFFICULTY_LABELS[difficulty]}</strong>
          <small>{adaptive ? '闯关模式 · 达标后自动升级' : '固定模式 · 不会自动升级'}</small>
        </div>
      </div>

      <div className={`rhythm-stage rhythm-stage--${phase}`}>
        <div className="rhythm-stage-heading" aria-live="polite">
          <span>{copy.kicker}</span>
          <h2>{copy.title}</h2>
          <p>{copy.detail}</p>
        </div>

        <div className="rhythm-grid-wrap">
          <div className="rhythm-beat-numbers" aria-hidden="true">
            {[1, 2, 3, 4].map((beat) => <span key={beat}>{beat}</span>)}
          </div>
          <div className="rhythm-grid" aria-label="一小节八分音符网格">
            {Array.from({ length: RHYTHM_STEPS_PER_BAR }, (_, step) => {
              const showTarget = phase === 'listen' && pattern.steps.includes(step)
              const isPulse = activeStep === step && isRunning
              return (
                <span
                  key={step}
                  className={[
                    'rhythm-cell',
                    step % 4 === 0 ? 'rhythm-cell--beat' : '',
                    showTarget ? 'rhythm-cell--target' : '',
                    isPulse ? 'rhythm-cell--active' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {showTarget && <i aria-hidden="true" />}
                </span>
              )
            })}
            {phase === 'tap' && tapMarks.map((tap, index) => (
              <i
                className="rhythm-tap-mark"
                key={`${tap}-${index}`}
                style={{ left: `${Math.max(0, Math.min(99, tap / (beatDuration * 4) * 100))}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`rhythm-pad ${phase === 'tap' ? 'rhythm-pad--ready' : ''}`}
          disabled={phase !== 'tap' && phase !== 'listen'}
          onPointerDown={(event) => {
            event.preventDefault()
            handleTap()
          }}
          onClick={(event) => {
            if (event.detail === 0) handleTap()
          }}
        >
          <span>{phase === 'tap' ? '敲击' : phase === 'listen' ? '先听' : phase === 'count-in' ? '准备' : '等待开始'}</span>
          <small>SPACE</small>
        </button>
      </div>

      {feedback && (
        <div className="rhythm-feedback" aria-live="polite">
          <div className="rhythm-feedback-score">
            <strong>{feedback.score.accuracy}</strong>
            <span>%</span>
          </div>
          <div className="rhythm-feedback-copy">
            <strong>{feedback.score.accuracy >= 90 ? '很稳，保持住' : feedback.score.accuracy >= 70 ? '不错，再贴紧一点' : '放松，听清重拍再回应'}</strong>
            <span>
              {timingSummary(feedback.score)}
              {feedback.score.extraCount > 0 ? ` · 多敲 ${feedback.score.extraCount} 次` : ''}
            </span>
          </div>
          <div className="rhythm-result-grid" aria-label="上一小节逐拍结果">
            {Array.from({ length: RHYTHM_STEPS_PER_BAR }, (_, step) => {
              const target = feedback.score.targets.find((result) => result.step === step)
              return (
                <span
                  key={step}
                  className={`rhythm-result rhythm-result--${target?.grade ?? 'empty'}`}
                  title={target?.offsetBeats === null || target?.offsetBeats === undefined
                    ? undefined
                    : `${target.offsetBeats > 0 ? '晚' : '早'} ${Math.round(Math.abs(target.offsetBeats) * 100)}% 拍`}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="rhythm-controls">
        <div className="rhythm-setting">
          <label htmlFor="rhythm-bpm">速度 <strong>{bpm} BPM</strong></label>
          <input
            id="rhythm-bpm"
            type="range"
            min="60"
            max="120"
            step="2"
            value={bpm}
            disabled={isRunning}
            onChange={(event) => setBpm(Number(event.target.value))}
          />
        </div>
        <div className="rhythm-setting">
          <span>训练内容</span>
          <div className="rhythm-difficulty-options">
            {([1, 2, 3, 4] as const).map((level) => (
              <button
                type="button"
                key={level}
                disabled={isRunning}
                className={difficulty === level ? 'is-selected' : ''}
                onClick={() => {
                  difficultyRef.current = level
                  setDifficulty(level)
                  const nextPattern = createRhythmPattern(level)
                  patternRef.current = nextPattern
                  setPattern(nextPattern)
                  recentScoresRef.current = []
                }}
              >
                {DIFFICULTY_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
        <label className="rhythm-adaptive">
          <input
            type="checkbox"
            checked={adaptive}
            disabled={isRunning}
            onChange={(event) => setAdaptive(event.target.checked)}
          />
          闯关模式
        </label>
        <Button
          onClick={isRunning ? pause : start}
          className="rhythm-session-button"
        >
          {isRunning ? '暂停练习' : phase === 'paused' ? '继续练习' : '开始无限练习'}
        </Button>
      </div>
    </section>
  )
}
