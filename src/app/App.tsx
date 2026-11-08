import { Suspense, useEffect, useState } from 'react'
import { HomePage } from '../home/HomePage'
import { APP_TITLE, findPracticeRoute, type PracticeRoute } from './routes'
import { RouteFallback } from './RouteFallback'

function readRoute(): PracticeRoute | null {
  return findPracticeRoute(window.location.hash)
}

export function App() {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const handleHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    document.title = route ? `${route.title} · ${APP_TITLE}` : APP_TITLE
    window.scrollTo({ top: 0 })
  }, [route])

  if (!route) return <HomePage />

  const PracticePage = route.component
  return (
    <Suspense fallback={<RouteFallback />}>
      <PracticePage />
    </Suspense>
  )
}
