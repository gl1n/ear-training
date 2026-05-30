import type { ReactNode } from 'react'
import type { AppMode } from '../quiz/sequencer'

type AppShellProps = {
  mode: AppMode
  modeSwitch: ReactNode
  settingsSummary: ReactNode
  settingsPanel: ReactNode
  footer: ReactNode
  children: ReactNode
}

export function AppShell({
  mode,
  modeSwitch,
  settingsSummary,
  settingsPanel,
  footer,
  children,
}: AppShellProps) {
  const isArcade = mode === 'arcade'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-col items-center text-center">
        <h1 className="text-xl font-bold sm:text-2xl">音程练耳</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          {isArcade ? '听音辨程 · 即时作答 · 统计成绩' : '上行 · 下行 · 和弦 · 中文播报'}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {modeSwitch}
          {settingsSummary}
          <main className="flex flex-1 flex-col gap-4">{children}</main>
          <footer className="sticky bottom-0 z-10 -mx-4 flex flex-col items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/90 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <h2 className="mb-4 text-sm font-medium text-[var(--text-secondary)]">练习设置</h2>
            {settingsPanel}
          </div>
        </aside>
      </div>
    </div>
  )
}
