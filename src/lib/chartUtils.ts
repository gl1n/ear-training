export function buildCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}
