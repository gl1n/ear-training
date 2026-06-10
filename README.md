# Ear Trainer / 练耳工具

Browser-based ear training for interval recognition and scale-degree identification. Built with React 19, TypeScript, and Vite.

## Features

- **音程跟听** — Loop playback with spoken interval names (Web Speech API, zh-CN)
- **音程竞速** — 30-second timed challenge with mistake-weighted question selection
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
```

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
