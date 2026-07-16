import { AppShell, type AppShellMeta } from '../../common/AppShell'
import { useAudioEngine } from '../../hooks/useAudioEngine'
import { FretboardTrainer } from './FretboardTrainer'

const FRETBOARD_META: AppShellMeta = {
  eyebrow: '指板定位',
  title: '音名闪击',
  subtitle: '在随机区域中快速找到目标音，建立指板空间记忆',
  badge: '指板小屋',
  accent: '#fbbf24',
}

export function FretboardPractice() {
  const { playMidi } = useAudioEngine()

  return (
    <AppShell meta={FRETBOARD_META} wide>
      <FretboardTrainer onPlayNote={playMidi} />
    </AppShell>
  )
}
