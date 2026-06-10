import { EncouragementToast } from '../ui/EncouragementToast'
import type { PracticeEncouragement } from './types'

type PracticeEncouragementOverlayProps = {
  encouragement: PracticeEncouragement | null
  variant: 'orange' | 'emerald'
}

export function PracticeEncouragementOverlay({
  encouragement,
  variant,
}: PracticeEncouragementOverlayProps) {
  if (!encouragement) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-4">
      <EncouragementToast
        key={encouragement.key}
        message={encouragement.message}
        variant={variant}
      />
    </div>
  )
}
