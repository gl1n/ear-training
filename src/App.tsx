import { lazy, Suspense, useEffect, useState } from 'react'
import { HomePage } from './home/HomePage'

const EarTraining = lazy(() => import('./features/ear-training/Trainer').then((module) => ({ default: module.Trainer })))
const FretboardPractice = lazy(() => import('./features/fretboard/FretboardPractice').then((module) => ({ default: module.FretboardPractice })))

type Route = 'home' | 'ear-training' | 'fretboard'

function readRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '')
  if (path === 'ear-training') return 'ear-training'
  if (path === 'fretboard') return 'fretboard'
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
      : route === 'fretboard' ? '指板练习 · 格林的音乐练习小屋' : '练耳 · 格林的音乐练习小屋'
    window.scrollTo({ top: 0 })
  }, [route])

  if (route === 'home') return <HomePage />

  return (
    <Suspense fallback={<RouteFallback />}>
      {route === 'ear-training' ? <EarTraining /> : <FretboardPractice />}
    </Suspense>
  )
}
