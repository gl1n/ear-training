import { useEffect } from 'react'

export function useDebouncedPersist(effect: () => void, deps: unknown[], delayMs = 300): void {
  useEffect(() => {
    const timeoutId = setTimeout(effect, delayMs)

    return () => {
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies full dependency list
  }, deps)
}
