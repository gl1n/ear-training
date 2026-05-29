export type IntervalPreset = {
  id: string
  label: string
  description: string
  priority: number
  intervalIds: string[]
}

export const INTERVAL_PRESETS: IntervalPreset[] = [
  {
    id: 'seconds',
    label: '二度音程',
    description: '入门：辨别半音与全音',
    priority: 1,
    intervalIds: ['m2', 'M2'],
  },
  {
    id: 'thirds',
    label: '三度音程',
    description: '大小三度，旋律基础',
    priority: 2,
    intervalIds: ['m3', 'M3'],
  },
  {
    id: 'fourths-fifths',
    label: '四五度',
    description: '纯四、纯五，稳定协和',
    priority: 3,
    intervalIds: ['P4', 'P5'],
  },
  {
    id: 'sixths',
    label: '六度音程',
    description: '大小六度',
    priority: 4,
    intervalIds: ['m6', 'M6'],
  },
  {
    id: 'sevenths-octave',
    label: '七度与八度',
    description: '大小七度、纯八度',
    priority: 5,
    intervalIds: ['m7', 'M7', 'P8'],
  },
  {
    id: 'tritone',
    label: '增四度',
    description: '三全音，较难辨别',
    priority: 6,
    intervalIds: ['A4'],
  },
  {
    id: 'all',
    label: '全部音程',
    description: '十二种旋律音程',
    priority: 7,
    intervalIds: ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'],
  },
]
