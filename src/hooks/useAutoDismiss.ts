import { useEffect } from 'react'

export function useAutoDismiss<T>(
  value: T | null | undefined,
  delayMs: number,
  onDismiss: () => void,
  dependency?: unknown,
): void {
  useEffect(() => {
    if (!value) {
      return
    }

    const timeoutId = setTimeout(onDismiss, delayMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delayMs, onDismiss, dependency])
}
