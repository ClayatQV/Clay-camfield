import { useEffect, useState } from 'react'
import { Shell } from './components/Shell'
import { ToastHost } from './components/Toast'
import { useRoute } from './lib/router'
import { applyTheme } from './lib/theme'
import { useData } from './store/store'
import { Today } from './screens/Today'
import { Home } from './screens/Home'
import { Progress } from './screens/Progress'
import { Plan } from './screens/Plan'
import { Lessons } from './screens/Lessons'
import { LessonPage } from './screens/LessonPage'
import { Lab } from './screens/Lab'
import { Settings } from './screens/Settings'
import { NotFound } from './screens/NotFound'
import { Assessment } from './screens/Assessment'
import { AssessmentResults } from './screens/AssessmentResults'
import { AssessmentHub } from './screens/AssessmentHub'
import { AiAssessment } from './screens/AiAssessment'
import { AiResults } from './screens/AiResults'
import { BuildPlan } from './screens/BuildPlan'
import { EarGuide } from './screens/EarGuide'
import { SongPage } from './screens/SongPage'
import { applyUpdate } from './lib/sw'

export function App() {
  const route = useRoute()
  const { settings } = useData()
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq?.addEventListener?.('change', on)
    return () => mq?.removeEventListener?.('change', on)
  }, [settings.theme])

  useEffect(() => {
    const on = () => setUpdateReady(true)
    window.addEventListener('pc:update-ready', on)
    return () => window.removeEventListener('pc:update-ready', on)
  }, [])

  // Scroll to top on route change (but not on query-only changes within the Lab).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.path])

  const [first, second] = route.segments
  let screen
  switch (first) {
    case undefined:
      screen = <Home />
      break
    case 'practice':
      screen = <Today />
      break
    case 'progress':
      screen = <Progress />
      break
    case 'plan':
      screen = <Plan blockParam={second === 'block' ? route.segments[2] : undefined} />
      break
    case 'lessons':
      screen = second ? <LessonPage id={decodeURIComponent(second)} query={route.query} /> : <Lessons query={route.query} />
      break
    case 'lab':
      screen = <Lab query={route.query} />
      break
    case 'ear':
      screen = <EarGuide query={route.query} />
      break
    case 'song':
      screen = <SongPage query={route.query} />
      break
    case 'settings':
      screen = <Settings />
      break
    case 'assessment':
      screen =
        second === 'results' ? (
          <AssessmentResults id={route.segments[2]} />
        ) : second === 'tap' ? (
          <Assessment />
        ) : second === 'ai' ? (
          route.segments[2] === 'results' ? (
            <AiResults />
          ) : (
            <AiAssessment />
          )
        ) : second === 'build' ? (
          <BuildPlan />
        ) : (
          <AssessmentHub />
        )
      break
    default:
      screen = <NotFound />
  }

  const fullscreen = first === 'assessment' && (second === 'tap' || (second === 'ai' && route.segments[2] !== 'results'))
  return (
    <div className={fullscreen ? 'app fullscreen' : 'app'}>
      {!fullscreen && <Shell path={route.path} />}
      <main className="main">{screen}</main>
      <ToastHost />
      {updateReady && !fullscreen && (
        <div className="banner" role="status">
          <span>A new version is ready.</span>
          <button className="btn sm" onClick={() => applyUpdate()}>
            Reload
          </button>
        </div>
      )}
    </div>
  )
}
