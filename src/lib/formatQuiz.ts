import { DIRECTION_OPTIONS, midiToNoteName, type Quiz } from '../quiz/intervals'

export function formatQuizNotes(quiz: Quiz): string {
  const lower = midiToNoteName(Math.min(quiz.root, quiz.second))
  const higher = midiToNoteName(Math.max(quiz.root, quiz.second))

  switch (quiz.direction) {
    case 'descending':
      return `${higher} → ${lower}`
    case 'harmonic':
      return `${lower} + ${higher}`
    default:
      return `${lower} → ${higher}`
  }
}

export function formatQuizDirection(quiz: Quiz): string {
  return DIRECTION_OPTIONS.find((option) => option.value === quiz.direction)?.label ?? ''
}
