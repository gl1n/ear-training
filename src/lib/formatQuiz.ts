import { midiToNoteName, type Quiz } from '../quiz/intervals'
import { getDirectionLabel } from './labels'

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
  return getDirectionLabel(quiz.direction)
}
