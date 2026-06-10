type RecentRecordStoreOptions<T> = {
  storageKey: string
  maxRecords: number
  isValidRecord: (value: unknown) => value is T
  isValidStore: (value: unknown) => value is T[]
  schemaStorageKey?: string
  schemaVersion?: number
  sanitizeLoaded?: (store: T[]) => T[]
  normalizeForSave?: (store: T[]) => T[]
}

export function createRecentRecordStore<T>(options: RecentRecordStoreOptions<T>) {
  const {
    storageKey,
    maxRecords,
    isValidRecord,
    isValidStore,
    schemaStorageKey,
    schemaVersion,
    sanitizeLoaded = (store) => store,
    normalizeForSave = (store) => store.filter(isValidRecord).slice(-maxRecords),
  } = options

  function clearStorage(): void {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore private mode errors.
    }
  }

  function syncSchema(): boolean {
    if (schemaStorageKey === undefined || schemaVersion === undefined) {
      return false
    }

    try {
      const storedVersion = localStorage.getItem(schemaStorageKey)
      if (storedVersion === String(schemaVersion)) {
        return false
      }

      clearStorage()
      localStorage.setItem(schemaStorageKey, String(schemaVersion))
      return true
    } catch {
      return false
    }
  }

  function load(): T[] {
    if (syncSchema()) {
      return []
    }

    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        return []
      }

      const parsed: unknown = JSON.parse(raw)
      if (isValidStore(parsed)) {
        return sanitizeLoaded(parsed.slice(-maxRecords))
      }

      return []
    } catch {
      return []
    }
  }

  function save(store: T[]): void {
    const normalized = normalizeForSave(store).slice(-maxRecords)

    try {
      localStorage.setItem(storageKey, JSON.stringify(normalized))
    } catch {
      // Ignore quota / private mode errors.
    }
  }

  function clear(): void {
    clearStorage()
  }

  function appendInMemory(store: T[], record: T): void {
    if (!isValidRecord(record)) {
      return
    }

    store.push(record)

    if (store.length > maxRecords) {
      store.splice(0, store.length - maxRecords)
    }
  }

  return { load, save, clear, appendInMemory }
}
