import type { ReactNode } from 'react'
import type { AppMode } from '../quiz/sequencer'
import { VersionInfo } from './VersionInfo'

type AppShellProps = {
  mode: AppMode
  modeSwitch: ReactNode
  settingsSummary: ReactNode
  footer: ReactNode
  children: ReactNode
  focused?: boolean
}

export function AppShell({
  mode,
  modeSwitch,
  settingsSummary,
  footer,
  children,
  focused = false,
}: AppShellProps) {
  const meta =
    mode === 'chordDegree'
      ? { eyebrow: '和声辨识', title: '猜和弦', subtitle: '以 do 为参考，辨认随机转位三和弦的级数' }
      : mode === 'chordProgression'
      ? { eyebrow: '和声训练', title: '和弦进行', subtitle: '在循环中建立级数走向与和声色彩的听感' }
      : mode === 'intervalSpeed'
      ? { eyebrow: '辨认挑战', title: '音程辨认', subtitle: '听到音程后立即作答，训练反应速度与准确度' }
      : mode === 'scaleDegree'
        ? { eyebrow: '调性感知', title: '音级辨识', subtitle: '先建立调性，再辨认音在调内的位置' }
        : { eyebrow: '基础训练', title: '音程跟听', subtitle: '循环聆听并跟随播报，建立音程声音记忆' }

  return (
    <div data-training-mode={mode} className="training-shell mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-7">
      <header className={focused ? 'mb-3' : 'mb-5'}>
        <div className="mx-auto flex w-full max-w-3xl items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            {!focused && <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-sky-300">{meta.eyebrow}</p>}
            <h1 className={focused ? 'text-lg font-semibold' : 'text-2xl font-bold tracking-tight sm:text-3xl'}>{meta.title}</h1>
            {!focused && <p className="mt-1 text-sm text-[var(--text-secondary)]">{meta.subtitle}</p>}
          </div>
          <span className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)] sm:block">{focused ? '专注训练中' : '听感实验室'}</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {!focused && modeSwitch}
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
