import { useCallback, useState } from 'react'
import type { Piano } from '../../../audio/piano'
import {
  chordKeyLabel,
  runChordProgressionLoop,
  runRandomChordEarLoop,
  type ChordDegree,
  type ChordKey,
  type ChordPlaybackMode,
  type ChordRhythm,
  type PlayedChord,
  type RandomChordSettings,
} from '../../../quiz/chordProgression'
import type { TrainerState } from '../../../quiz/sequencer'

type InitialChordProgressionSettings = {
  chordDegrees: ChordDegree[]
  chordRhythm: ChordRhythm
  chordKey: ChordKey
  chordMelodyEnabled: boolean
  chordPlaybackMode: ChordPlaybackMode
  randomChordSettings: RandomChordSettings
}

export function useChordProgressionPractice(initial: InitialChordProgressionSettings) {
  const [chordDegrees, setChordDegrees] = useState(initial.chordDegrees)
  const [currentChord, setCurrentChord] = useState<PlayedChord | null>(null)
  const [currentChordPosition, setCurrentChordPosition] = useState(-1)
  const [chordRhythm, setChordRhythm] = useState(initial.chordRhythm)
  const [currentChordBeat, setCurrentChordBeat] = useState(0)
  const [chordCountIn, setChordCountIn] = useState(false)
  const [chordKey, setChordKey] = useState(initial.chordKey)
  const [chordMelodyEnabled, setChordMelodyEnabled] = useState(initial.chordMelodyEnabled)
  const [chordPlaybackMode, setChordPlaybackMode] = useState(initial.chordPlaybackMode)
  const [randomChordSettings, setRandomChordSettings] = useState(initial.randomChordSettings)
  const [activeChordKeyLabel, setActiveChordKeyLabel] = useState<string | null>(null)

  const changeChordDegree = useCallback((position: number, degree: ChordDegree) => {
    setChordDegrees((current) => current.map((value, index) => index === position ? degree : value))
  }, [])

  const resetPlayback = useCallback(() => {
    setCurrentChord(null)
    setCurrentChordPosition(-1)
    setCurrentChordBeat(0)
    setChordCountIn(false)
    setActiveChordKeyLabel(null)
  }, [])

  const run = useCallback(async (
    piano: Piano,
    signal: AbortSignal,
    onStateChange: (state: TrainerState) => void,
  ) => {
    const pitchClass = chordKey === 'random' ? Math.floor(Math.random() * 12) : chordKey
    setActiveChordKeyLabel(chordKeyLabel(pitchClass))

    const onBeat = (beat: number, isCountIn: boolean) => {
      setCurrentChordBeat(beat)
      setChordCountIn(isCountIn)
    }

    if (chordPlaybackMode === 'random-ear') {
      await runRandomChordEarLoop(piano, randomChordSettings, chordRhythm, {
        onChord: (chord) => {
          setChordCountIn(false)
          setCurrentChord(chord)
          setCurrentChordPosition(-1)
        },
        onBeat,
        onPhase: (phase) => onStateChange(
          phase === 'chord' ? 'playing_harmonic' : phase === 'root' ? 'playing_root' : 'gap',
        ),
      }, signal, 48 + pitchClass)
      return
    }

    await runChordProgressionLoop(piano, chordDegrees, chordRhythm, {
      onChord: (chord, position) => {
        setChordCountIn(false)
        setCurrentChord(chord)
        setCurrentChordPosition(position)
        onStateChange('playing_harmonic')
      },
      onBeat,
    }, signal, 48 + pitchClass, chordMelodyEnabled)
  }, [
    chordDegrees,
    chordKey,
    chordMelodyEnabled,
    chordPlaybackMode,
    chordRhythm,
    randomChordSettings,
  ])

  return {
    chordDegrees,
    currentChord,
    currentChordPosition,
    chordRhythm,
    currentChordBeat,
    chordCountIn,
    chordKey,
    activeChordKeyLabel,
    chordMelodyEnabled,
    chordPlaybackMode,
    randomChordSettings,
    setChordDegrees,
    setChordRhythm,
    setChordKey,
    setChordMelodyEnabled,
    setChordPlaybackMode,
    setRandomChordSettings,
    changeChordDegree,
    resetPlayback,
    run,
  }
}
