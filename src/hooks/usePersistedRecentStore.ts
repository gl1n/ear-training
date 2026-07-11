import { useCallback, useRef, useState } from 'react'
import { useDebouncedPersist } from './useDebouncedPersist'

export function usePersistedRecentStore<T>(
  load: () => T[],
  save: (store: T[]) => void,
) {
  const [initialStore] = useState<T[]>(load)
  const storeRef = useRef<T[]>(initialStore)
  const [snapshot, setSnapshot] = useState<T[]>(() => [...initialStore])

  useDebouncedPersist(() => {
    save(storeRef.current)
  }, [snapshot])

  const bump = useCallback(() => {
    setSnapshot([...storeRef.current])
  }, [])

  const reset = useCallback(() => {
    storeRef.current = []
    setSnapshot([])
  }, [])

  return {
    storeRef,
    snapshot,
    bump,
    reset,
  }
}
