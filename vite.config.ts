import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function getGitInfo(): { commit: string; date: string } {
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    const date = execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim()
    return { commit, date }
  } catch {
    return { commit: 'dev', date: '' }
  }
}

const gitInfo = getGitInfo()

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  define: {
    __GIT_COMMIT__: JSON.stringify(gitInfo.commit),
    __GIT_COMMIT_DATE__: JSON.stringify(gitInfo.date),
  },
})
