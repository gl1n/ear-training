import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export const APP_TITLE = '格林的音乐练习小屋'

export type PracticeCategoryId = 'guitar' | 'ear'
export type PracticeRouteId =
  | 'fretboard'
  | 'pentatonic-play'
  | 'chord-tone-play'
  | 'metronome'
  | 'ear-training'
  | 'modal-scale'
  | 'melody-loop'

type EntranceTone = 'amber' | 'sky' | 'violet' | 'emerald' | 'teal'

export type PracticeRoute = {
  id: PracticeRouteId
  path: string
  title: string
  category: PracticeCategoryId
  component: LazyExoticComponent<ComponentType>
  home: {
    eyebrow: string
    description: string
    detail: string
    icon: string
    tone: EntranceTone
  }
}

export const PRACTICE_CATEGORIES = [
  {
    id: 'guitar',
    title: '吉他专项',
    description: '围绕指板、音阶与和弦，把知识真正落到手上。',
  },
  {
    id: 'ear',
    title: '听觉训练',
    description: '在音程、音级、调式与旋律循环里建立声音记忆。',
  },
] as const satisfies ReadonlyArray<{
  id: PracticeCategoryId
  title: string
  description: string
}>

export const PRACTICE_ROUTES = [
  {
    id: 'fretboard',
    path: 'fretboard',
    title: '指板练习',
    category: 'guitar',
    component: lazy(() => import('../features/fretboard/FretboardPractice').then((module) => ({ default: module.FretboardPractice }))),
    home: {
      eyebrow: 'FRETBOARD',
      description: '看见音名，迅速落指。用随机区域与错题热力图，慢慢画出属于你的指板地图。',
      detail: '音名定位 · 自由试音 · 薄弱区域',
      icon: '♯',
      tone: 'amber',
    },
  },
  {
    id: 'pentatonic-play',
    path: 'pentatonic-play',
    title: '五声走位',
    category: 'guitar',
    component: lazy(() => import('../features/pentatonic-play/PentatonicPlayPractice').then((module) => ({ default: module.PentatonicPlayPractice }))),
    home: {
      eyebrow: 'PENTATONIC PLAY',
      description: '跟随稳定节拍完成五声音阶上行与下行，连续弹净三遍后进入下一位置。',
      detail: '吉他输入 · 上行下行 · 自动升速',
      icon: '◇',
      tone: 'teal',
    },
  },
  {
    id: 'chord-tone-play',
    path: 'chord-tone-play',
    title: '和弦寻音',
    category: 'guitar',
    component: lazy(() => import('../features/chord-tone-play/ChordTonePlayPractice').then((module) => ({ default: module.ChordTonePlayPractice }))),
    home: {
      eyebrow: 'CHORD TONES',
      description: '看见一个七和弦，在吉他上依次弹出它的 3 音与 7 音，建立和弦与指板之间的直接连接。',
      detail: '吉他输入 · 3 音与 7 音 · 任意八度',
      icon: 'Ⅲ',
      tone: 'violet',
    },
  },
  {
    id: 'metronome',
    path: 'metronome',
    title: '节拍器',
    category: 'guitar',
    component: lazy(() => import('../features/metronome/MetronomePractice').then((module) => ({ default: module.MetronomePractice }))),
    home: {
      eyebrow: 'METRONOME',
      description: '选择速度与拍号，让清晰稳定的节拍陪你自由练习，逐渐建立可靠的内在律动。',
      detail: '速度调节 · 拍号 · 点按测速',
      icon: '♩',
      tone: 'sky',
    },
  },
  {
    id: 'ear-training',
    path: 'ear-training',
    title: '练耳',
    category: 'ear',
    component: lazy(() => import('../features/ear-training/Trainer').then((module) => ({ default: module.Trainer }))),
    home: {
      eyebrow: 'EAR TRAINING',
      description: '从音程、音级到和弦进行，在声音里建立稳定、可调用的音乐直觉。',
      detail: '音程 · 音级 · 和弦',
      icon: '♪',
      tone: 'sky',
    },
  },
  {
    id: 'modal-scale',
    path: 'modal-scale',
    title: '音阶漫游',
    category: 'ear',
    component: lazy(() => import('../features/modal-scale/ModalScalePractice').then((module) => ({ default: module.ModalScalePractice }))),
    home: {
      eyebrow: 'SCALE JOURNEY',
      description: '选定一种音阶，让每一轮从新的 do 出发，在稳定的 4/4 拍中建立可移动的相对音感。',
      detail: '五声音阶 · 七种调式 · 节拍同步',
      icon: '∞',
      tone: 'emerald',
    },
  },
  {
    id: 'melody-loop',
    path: 'melody-loop',
    title: '旋律工坊',
    category: 'ear',
    component: lazy(() => import('../features/melody-loop/MelodyLoop').then((module) => ({ default: module.MelodyLoop }))),
    home: {
      eyebrow: 'MELODY LOOP',
      description: '写下自己的旋律，选择拍号与小节数，让一段 Pattern 无缝循环，陪你反复练习。',
      detail: '旋律编辑 · 自定义小节 · 无缝循环',
      icon: '♫',
      tone: 'violet',
    },
  },
] as const satisfies readonly PracticeRoute[]

export function findPracticeRoute(hash: string): PracticeRoute | null {
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '')
  return PRACTICE_ROUTES.find((route) => route.path === path) ?? null
}

export function practiceRouteHref(route: PracticeRoute): string {
  return `#/${route.path}`
}
