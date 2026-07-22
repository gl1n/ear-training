import { lazy, Suspense, useEffect, useState } from 'react'
import { HomePage } from './home/HomePage'

const EarTraining = lazy(() => import('./features/ear-training/Trainer').then((module) => ({ default: module.Trainer })))
const FretboardPractice = lazy(() => import('./features/fretboard/FretboardPractice').then((module) => ({ default: module.FretboardPractice })))
const MetronomePractice = lazy(() => import('./features/metronome/MetronomePractice').then((module) => ({ default: module.MetronomePractice })))
const RhythmPractice = lazy(() => import('./features/rhythm/RhythmPractice').then((module) => ({ default: module.RhythmPractice })))
const ModalScalePractice = lazy(() => import('./features/modal-scale/ModalScalePractice').then((module) => ({ default: module.ModalScalePractice })))
const PentatonicPlayPractice = lazy(() => import('./features/pentatonic-play/PentatonicPlayPractice').then((module) => ({ default: module.PentatonicPlayPractice })))

type Route = 'home' | 'ear-training' | 'fretboard' | 'pentatonic-play' | 'metronome' | 'rhythm' | 'modal-scale'

function readRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '')
  if (path === 'ear-training') return 'ear-training'
  if (path === 'fretboard') return 'fretboard'
  if (path === 'pentatonic-play') return 'pentatonic-play'
  if (path === 'metronome') return 'metronome'
  if (path === 'rhythm') return 'rhythm'
  if (path === 'modal-scale') return 'modal-scale'
  return 'home'
}

function RouteFallback() {
  return (
    <div className="route-fallback" role="status">
      <span aria-hidden="true">♪</span>
      <p>正在点亮练习室…</p>
    </div>
  )
}

export function App() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const handleHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    document.title = route === 'home'
      ? '格林的音乐练习小屋'
      : route === 'fretboard'
        ? '指板练习 · 格林的音乐练习小屋'
        : route === 'pentatonic-play'
          ? '五声走位 · 格林的音乐练习小屋'
        : route === 'metronome'
          ? '节拍器 · 格林的音乐练习小屋'
          : route === 'rhythm'
          ? '节奏回声 · 格林的音乐练习小屋'
          : route === 'modal-scale'
            ? '音阶漫游 · 格林的音乐练习小屋'
          : '练耳 · 格林的音乐练习小屋'
    window.scrollTo({ top: 0 })
  }, [route])

  if (route === 'home') return <HomePage />

  return (
    <Suspense fallback={<RouteFallback />}>
      {route === 'ear-training'
        ? <EarTraining />
        : route === 'fretboard'
          ? <FretboardPractice />
          : route === 'pentatonic-play'
            ? <PentatonicPlayPractice />
        : route === 'metronome'
          ? <MetronomePractice />
          : route === 'rhythm'
            ? <RhythmPractice />
            : <ModalScalePractice />}
    </Suspense>
  )
}
