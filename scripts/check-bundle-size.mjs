import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const limits = { '.js': 380_000, '.css': 70_000 }
const assetsDir = new URL('../dist/assets/', import.meta.url)

for (const file of await readdir(assetsDir)) {
  const extension = Object.keys(limits).find((candidate) => file.endsWith(candidate))
  if (!extension) continue
  const { size } = await stat(join(assetsDir.pathname, file))
  if (size > limits[extension]) {
    throw new Error(`${file} is ${size} bytes; limit is ${limits[extension]} bytes`)
  }
}

console.log('Bundle size is within the configured baseline.')
