import { VersionInfo } from '../common/VersionInfo'

const ENTRANCES = [
  {
    href: '#/fretboard',
    eyebrow: 'FRETBOARD',
    title: '指板练习',
    description: '看见音名，迅速落指。用随机区域与错题热力图，慢慢画出属于你的指板地图。',
    detail: '音名定位 · 自由试音 · 薄弱区域',
    icon: '♯',
    tone: 'amber',
  },
  {
    href: '#/pentatonic-play',
    eyebrow: 'PENTATONIC PLAY',
    title: '五声走位',
    description: '守住指定的根音与骨干音位置，自由组织其余指法，在节拍里弹完一轮五声音阶。',
    detail: '吉他输入 · 指定音位 · 合拍评价',
    icon: '◇',
    tone: 'teal',
  },
  {
    href: '#/ear-training',
    eyebrow: 'EAR TRAINING',
    title: '练耳',
    description: '从音程、音级到和弦进行，在声音里建立稳定、可调用的音乐直觉。',
    detail: '音程 · 音级 · 和弦',
    icon: '♪',
    tone: 'sky',
  },
  {
    href: '#/modal-scale',
    eyebrow: 'SCALE JOURNEY',
    title: '音阶漫游',
    description: '选定一种音阶，让每一轮从新的 do 出发，在稳定的 4/4 拍中建立可移动的相对音感。',
    detail: '五声音阶 · 七种调式 · 节拍同步',
    icon: '∞',
    tone: 'emerald',
  },
  {
    href: '#/rhythm',
    eyebrow: 'RHYTHM ECHO',
    title: '节奏回声',
    description: '听一小节，再敲回一小节。无需反复点下一题，在连续循环中练出准确的节奏感。',
    detail: '无限循环 · 即时反馈 · 自适应难度',
    icon: '◉',
    tone: 'violet',
  },
  {
    href: '#/metronome',
    eyebrow: 'RHYTHM',
    title: '节拍器',
    description: '选择速度与拍号，让清晰稳定的节拍陪你自由练习，逐渐建立可靠的内在律动。',
    detail: '速度调节 · 拍号 · 点按测速',
    icon: '♩',
    tone: 'sky',
  },
] as const

export function HomePage() {
  return (
    <main className="home-page">
      <div className="home-orbit home-orbit--one" aria-hidden="true" />
      <div className="home-orbit home-orbit--two" aria-hidden="true" />

      <header className="home-hero">
        <p className="home-kicker"><span aria-hidden="true">✦</span> GREEN'S MUSIC CABIN</p>
        <h1>格林的音乐<br className="sm:hidden" />练习小屋</h1>
        <p>推开一扇门，专注练一件事。练手、练耳，或让稳定的节拍陪你开始。</p>
      </header>

      <section className="home-entrances" aria-label="选择练习">
        {ENTRANCES.map((entrance, index) => (
          <a key={entrance.href} className={`entrance-card entrance-card--${entrance.tone}`} href={entrance.href}>
            <span className="entrance-number" aria-hidden="true">0{index + 1}</span>
            <span className="entrance-icon" aria-hidden="true">{entrance.icon}</span>
            <span className="entrance-copy">
              <span className="entrance-eyebrow">{entrance.eyebrow}</span>
              <strong>{entrance.title}</strong>
              <span className="entrance-description">{entrance.description}</span>
              <span className="entrance-detail">{entrance.detail}</span>
            </span>
            <span className="entrance-action">进入练习 <span aria-hidden="true">→</span></span>
          </a>
        ))}
      </section>

      <footer className="home-footer">
        <span>每一次认真聆听，都在为音乐直觉添一块木头。</span>
        <VersionInfo />
      </footer>
    </main>
  )
}
