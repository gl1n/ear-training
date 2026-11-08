import { PRACTICE_CATEGORIES, PRACTICE_ROUTES, practiceRouteHref } from '../app/routes'
import { VersionInfo } from '../common/VersionInfo'

const EAR_TRAINING_ID = 'ear-training'
const METRONOME_ID = 'metronome'

export function HomePage() {
  const earTraining = PRACTICE_ROUTES.find((route) => route.id === EAR_TRAINING_ID)!
  const metronome = PRACTICE_ROUTES.find((route) => route.id === METRONOME_ID)!
  const libraryRoutes = PRACTICE_ROUTES.filter(
    (route) => route.id !== EAR_TRAINING_ID && route.id !== METRONOME_ID,
  )

  return (
    <main className="home-page">
      <header className="home-topbar">
        <a className="home-brand" href="#/" aria-label="格林的音乐练习小屋首页">
          <span aria-hidden="true">G</span>
          <span>格林的音乐练习小屋</span>
        </a>
        <p>一个人，也可以认真练一会儿</p>
      </header>

      <section className="home-focus" aria-labelledby="home-focus-title">
        <div className="home-focus-main">
          <span className="home-focus-label">常用入口</span>
          <h1 id="home-focus-title">练耳训练</h1>
          <p>音程、音级与和弦训练集中在这里。进入后，直接选择你现在想练的内容。</p>
          <div className="home-focus-meta" aria-label="练习内容">
            <span>音程辨认</span>
            <span>音级听辨</span>
            <span>和弦训练</span>
          </div>
          <a className="home-primary-action" href={practiceRouteHref(earTraining)}>
            打开练耳
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <aside className="home-quick-tool">
          <span className="home-quick-icon" aria-hidden="true">{metronome.home.icon}</span>
          <div>
            <span className="home-focus-label">练琴工具</span>
            <h2>{metronome.title}</h2>
            <p>不设目标，打开就能陪你练琴。</p>
          </div>
          <a href={practiceRouteHref(metronome)}>
            打开节拍器 <span aria-hidden="true">→</span>
          </a>
        </aside>
      </section>

      <section className="home-library" aria-labelledby="home-library-title">
        <header className="home-library-heading">
          <div>
            <span className="home-section-index">练习库</span>
            <h2 id="home-library-title">换个方向练</h2>
          </div>
          <p>专项练习都在这里，按你现在想练的内容选择。</p>
        </header>

        <div className="home-groups">
          {PRACTICE_CATEGORIES.map((category) => {
            const routes = libraryRoutes.filter((route) => route.category === category.id)
            if (routes.length === 0) return null

            return (
              <section className="home-group" aria-labelledby={`group-${category.id}`} key={category.id}>
                <header className="home-group-heading">
                  <h3 id={`group-${category.id}`}>{category.title}</h3>
                  <span>{String(routes.length).padStart(2, '0')}</span>
                </header>
                <div className="home-entrances">
                  {routes.map((route) => (
                    <a
                      key={route.id}
                      className={`entrance-card entrance-card--${route.home.tone}`}
                      href={practiceRouteHref(route)}
                    >
                      <span className="entrance-icon" aria-hidden="true">{route.home.icon}</span>
                      <span className="entrance-copy">
                        <span className="entrance-eyebrow">{route.home.eyebrow}</span>
                        <strong>{route.title}</strong>
                        <span className="entrance-description">{route.home.description}</span>
                        <span className="entrance-detail">{route.home.detail}</span>
                      </span>
                      <span className="entrance-action" aria-hidden="true">→</span>
                    </a>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </section>

      <footer className="home-footer">
        <span>选一项，开始练。</span>
        <VersionInfo />
      </footer>
    </main>
  )
}
