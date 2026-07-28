# 格林的音乐练习小屋

A browser-based music practice cabin with separate entrances for fretboard practice, ear training, and rhythm tools. Built with React 19, TypeScript, and Vite.

## Features

- **独立首页** — Choose between fretboard practice, ear training, and the metronome without loading practice bundles up front
- **指板练习** — Locate notes in random fretboard regions, freely audition notes, and review note performance and a heatmap built from the latest 30 samples per target note
- **节拍器** — Keep time with adjustable BPM, meter accents, keyboard control, and tap tempo
- **五声走位** — Practice ascending and descending major/minor pentatonic runs with guitar input, a non-scoring metronome companion, three clean repetitions per position, and optional automatic tempo increases
- **音阶漫游** — Loop major/minor pentatonic scales and seven modes in beat-synced 4/4 phrases while rotating evenly through all twelve movable-do tonics
- **音程跟听** — Loop playback with spoken interval names (Web Speech API, zh-CN)
- **音程辨认** — Interval challenge with reaction-weighted scoring and mistake-weighted question selection
- **音级辨识** — Identify scale degrees in random major keys, with optional mistake review mode
- **猜和弦** — Identify diatonic triad degrees with guided key establishment, custom degree sets, replay and comparison tools, progressive difficulty, and per-degree error history
- **和弦进行** — Build harmonic intuition by looping configurable diatonic progressions

User preferences and progress (mistake stats, best records, session history) are stored in `localStorage`. Piano samples load from CDN via [smplr](https://github.com/danigb/smplr) on first use.

## Product design principles / 产品设计原则

### 训练优先于考试

默认体验应帮助玩家建立听觉映射，而不是测试已经具备的能力。高难度条件应逐步解锁或由玩家主动选择，不要把随机调、完整选项集、随机转位和限次播放同时作为默认条件。

- 提供清晰的难度阶梯和有意义的预设。例如猜和弦从 `C 大调 + 1/4/5 级 + 根位` 开始，再逐步增加完整级数、随机调和随机转位。
- 将影响认知负担的维度拆开配置，如调性、出题范围和转位方式，而不是用一个含义模糊的“难度”数值隐藏它们。
- 新手默认值必须本身可练习；进阶模式可以更接近考试。

### 先建立听觉上下文

依赖调性的题目必须先帮助玩家进入当前调性。参考音应该直接服务于任务：猜级数时提供本局的主音 `do`，而不是要求玩家先从标准音推算调性。

- 每局调性固定，随机调也不能在一局中途改变。
- 开局使用简短音阶片段和主和弦建立调性感，避免重复播放已经包含在片段开头的独立主音。
- 关键参考音应在训练过程中常驻、可随时重听。

### 允许主动探索

一次播放通常不足以形成可靠判断。播放题目不是稀缺资源，除非玩家明确选择考试模式。

- 允许不限次数重听参考音、题目，以及“参考音 → 题目”的连续播放。
- 重听不扣分，不计为错误；可以记录播放次数用于理解训练行为，但不能污染准确率。
- 音频触发发声后立即开放答案，不要强迫玩家等待尾音结束。延音可以自然继续，交互不应被音频时长锁住。

### 答错后提供可听见的纠正

只显示“错误”或要求盲猜第二次没有足够的教学价值。纠错阶段应让玩家直接比较自己的心理答案与实际题目。

- 提供“播放所选答案”“播放题目”和“所选答案 → 题目”的对比试听。
- 允许玩家纠正到正确答案后再进入下一题，让正确声音与标签完成绑定。
- 准确率和历史错误只记录第一次答案；纠正过程不重复累计错误。

### 出题既随机又均衡

纯随机在短局中容易产生扎堆和缺席，给玩家造成题库偏斜的感觉。随机性应保留不可预测性，同时动态照顾本局出现较少的答案。

- 复用共享的 session frequency weighting，而不是为每种训练重新实现随机策略。
- 根据本局各答案的出现次数动态调整权重，出现越少，后续权重越高。
- 权重只作用于当前启用的答案范围。例如 `1/4/5` 模式不应被未启用的其他级数影响。

### 音频首先要像音乐

正确的 MIDI 音高并不等于良好的听觉体验。和弦需要足够的起音、共鸣和间隔，不能机械复用单音或音程的快速时值。

- 不同训练对象可以有独立的播放时长；和弦延音不应受音程速度档位控制。
- 对比播放之间保留可感知的间隔，避免两个和弦糊在一起。
- 播放下一题、连续播放中的下一个声音或纠错对比的第二个和弦前，必须主动停止上一组声音。允许单个和弦自然延音，但不能让尾音跨题或跨比较步骤叠加。
- 快速连续点击播放控件时，取消尚未开始的后续音频，避免多个播放序列互相叠加。
- 随机调不能简单把所有主音依次放在同一个向上的八度。必须为参考音选择舒适音区，并检查三和弦经过随机转位后的整体音域，避免最高音过高、采样发薄或破音。
- 当前猜和弦的随机调主音约束在 C3–B3；若未来调整和弦排列、转位规则或采样乐器，应同时重新验证最低音和最高音边界。

### 数据要回答“哪里需要练”

- 统计按正确答案归档，而不是按玩家误选的答案归档。
- 结算视图应在同一可视化中对照本局与历史错误率，帮助玩家区分偶发失误和长期弱项。
- 历史记录持久化，但存储失败或历史数据损坏不能阻止训练本身。

## Development

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build   # typecheck + production build
npm test        # vitest
npm run lint
npm run preview # preview production build locally
npm run check:bundle # enforce the JS/CSS size baseline after build
```

Node.js 22 or newer is required. Pull requests and deployments should pass lint with zero
warnings, all unit tests, the production build, and the bundle-size check.

## Deployment

The app is configured for GitHub Pages at `/ear-training/` (`BASE_PATH` in `vite.config.ts`). CI deploys from `.github/workflows/deploy.yml`.

## Project structure

```
src/
  common/       Shared app shell, version display, and UI primitives
  features/     Independently loaded ear-training and fretboard applications
  home/         Landing page and practice entrances
  audio/        Web Audio, piano samples, speech synthesis
  components/   Ear-training presentation components
  hooks/        Settings, stats, session, audio engine
  quiz/         Domain logic, game loops, persistence
```

Shared ear-training domain logic lives in `src/quiz/` with colocated Vitest tests. Feature entry points live under `src/features/` and are lazy-loaded from the hash-based application router.

## Architecture boundaries

- `audio/` owns browser audio resources; consumers stop or dispose them through `useAudioEngine`.
- Beat-based tools share the `BeatScheduler` audio clock so clicks, notes, and visual pulses stay on the same timeline.
- `quiz/` contains framework-independent session and scoring rules.
- `hooks/` bridge React state, persistence, audio, and quiz sessions.
- `features/ear-training/` wires the ear-training session state and view.
- `features/fretboard/` owns fretboard UI, game rules, and tests.
- `components/` contains ear-training views; shared interaction primitives and the shared shell live in `common/`.
- Browser storage is best-effort. Invalid, unavailable, or full storage must never prevent training.

When changing a session loop, preserve its abort contract: after cancellation it must stop audio,
detach pending answer listeners, and avoid publishing further UI state.
