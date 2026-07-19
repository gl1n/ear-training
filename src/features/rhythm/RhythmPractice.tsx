import { AppShell, type AppShellMeta } from '../../common/AppShell'
import { RhythmPracticePanel } from './RhythmPracticePanel'

const RHYTHM_META: AppShellMeta = {
  eyebrow: 'RHYTHM ECHO',
  title: '节奏回声',
  subtitle: '听一小节，敲一小节，不停顿地练出内在律动',
  badge: '无限模式',
  accent: '#a78bfa',
}

export function RhythmPractice() {
  return (
    <AppShell meta={RHYTHM_META} wide>
      <RhythmPracticePanel />
    </AppShell>
  )
}
