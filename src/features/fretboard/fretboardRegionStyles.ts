import type { FretboardCell, FretboardQuestion } from './fretboard'

export function fretboardRegionEdgeClasses(
  cell: Pick<FretboardCell, 'stringIndex' | 'fret'>,
  region: FretboardQuestion['region'],
  outlined: boolean,
): string {
  if (!outlined) return ''

  return [
    'fretboard-cell--region-edge',
    cell.stringIndex === region.stringStart && 'fretboard-cell--region-top',
    cell.stringIndex === region.stringStart + 2 && 'fretboard-cell--region-bottom',
    cell.fret === region.fretStart && 'fretboard-cell--region-left',
    cell.fret === region.fretStart + 3 && 'fretboard-cell--region-right',
  ].filter(Boolean).join(' ')
}
