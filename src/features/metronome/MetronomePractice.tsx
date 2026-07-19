import { AppShell, type AppShellMeta } from '../../common/AppShell'
import { MetronomePanel } from '../../components/MetronomePanel'

const METRONOME_META: AppShellMeta = {
  eyebrow: '节奏工具',
  title: '节拍器',
  subtitle: '稳定速度，感受强拍与拍号的循环',
  badge: '节奏小屋',
  accent: '#fb7185',
}

export function MetronomePractice() {
  return (
    <AppShell meta={METRONOME_META}>
      <MetronomePanel />
    </AppShell>
  )
}
