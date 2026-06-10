export function pickUniform<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null
  return items[Math.floor(Math.random() * items.length)]!
}

export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number): T | null {
  const weighted = items.filter((item) => weight(item) > 0)
  if (weighted.length === 0) return null

  const totalWeight = weighted.reduce((sum, item) => sum + weight(item), 0)
  if (totalWeight === 0) return pickUniform(items)

  let pick = Math.random() * totalWeight
  for (const item of weighted) {
    pick -= weight(item)
    if (pick <= 0) {
      return item
    }
  }

  return weighted[weighted.length - 1]!
}
