import type { CSSProperties, ReactNode } from 'react'
import { VersionInfo } from './VersionInfo'

export type AppShellMeta = {
  eyebrow: string
  title: string
  subtitle: string
  badge: string
  accent: string
}

type AppShellProps = {
  meta: AppShellMeta
  navigation?: ReactNode
  settingsSummary?: ReactNode
  footer?: ReactNode
  children: ReactNode
  focused?: boolean
  wide?: boolean
}

export function AppShell({
  meta,
  navigation,
  settingsSummary,
  footer,
  children,
  focused = false,
  wide = false,
}: AppShellProps) {
  const contentWidthClass = wide ? 'max-w-5xl' : 'max-w-3xl'
  const shellStyle = { '--mode-accent': meta.accent } as CSSProperties

  return (
    <div className="training-shell mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-7" style={shellStyle}>
      <header className={focused ? 'mb-3' : 'mb-5'}>
        <div className={`mx-auto flex w-full ${contentWidthClass} items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-5`}>
          <div>
            {!focused && <p className="mb-1 text-xs font-semibold tracking-[0.18em]" style={{ color: meta.accent }}>{meta.eyebrow}</p>}
            <h1 className={focused ? 'text-lg font-semibold' : 'text-2xl font-bold tracking-tight sm:text-3xl'}>{meta.title}</h1>
            {!focused && <p className="mt-1 text-sm text-[var(--text-secondary)]">{meta.subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!focused && <a className="home-link" href="#/">返回小屋</a>}
            <span className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] sm:block">{focused ? '专注训练中' : meta.badge}</span>
          </div>
        </div>
      </header>

      <div className={`mx-auto flex w-full ${contentWidthClass} flex-1 flex-col gap-5`}>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {!focused && navigation}
          {!focused && settingsSummary}
          <main className="flex flex-1 flex-col gap-4">{children}</main>
          <footer className="sticky bottom-0 z-10 -mx-4 flex flex-col items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
            {!focused && <VersionInfo />}
          </footer>
        </div>
      </div>
    </div>
  )
}
