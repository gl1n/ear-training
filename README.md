# Ear Trainer / 练耳工具

Browser-based ear training for interval recognition and scale-degree identification. Built with React 19, TypeScript, and Vite.

## Features

- **音程跟听** — Loop playback with spoken interval names (Web Speech API, zh-CN)
- **音程辨认** — Interval challenge with reaction-weighted scoring and mistake-weighted question selection
- **音级辨识** — Identify scale degrees in random major keys, with optional mistake review mode

Progress (mistake stats, best records, session history) is stored in `localStorage`. Piano samples load from CDN via [smplr](https://github.com/danigb/smplr) on first use.

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
  audio/        Web Audio, piano samples, speech synthesis
  components/   UI (practice/, ui/ shared primitives)
  hooks/        Settings, stats, session, audio engine
  quiz/         Domain logic, game loops, persistence
```

Domain logic lives in `src/quiz/` with colocated Vitest tests. The root `Trainer` component wires hooks and delegates rendering to `PracticeView`.

## Architecture boundaries

- `audio/` owns browser audio resources; consumers stop or dispose them through `useAudioEngine`.
- `quiz/` contains framework-independent session and scoring rules.
- `hooks/` bridge React state, persistence, audio, and quiz sessions.
- `components/` render state and emit user intent; shared interaction primitives live in `components/ui/`.
- Browser storage is best-effort. Invalid, unavailable, or full storage must never prevent training.

When changing a session loop, preserve its abort contract: after cancellation it must stop audio,
detach pending answer listeners, and avoid publishing further UI state.
