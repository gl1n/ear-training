import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  appendNoteKeySessionRecord,
  clearNoteKeySessionHistory,
  loadNoteKeySessionHistory,
} from './noteKeySessionHistory'

const STORAGE_KEY = 'ear-trainer:note-key-session-history'

function createLocalStorageMock() {
  const store = new Map<string, string>()

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
  }
}

describe('noteKeySessionHistory', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts empty', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
    expect(loadNoteKeySessionHistory()).toEqual([])
  })

  it('appends session records', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock())

    appendNoteKeySessionRecord(3)
    appendNoteKeySessionRecord(7)

    expect(loadNoteKeySessionHistory()).toEqual([
      { correctCount: 3, at: expect.any(Number) },
      { correctCount: 7, at: expect.any(Number) },
    ])
  })

  it('clears stored history', () => {
    const localStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorage)

    appendNoteKeySessionRecord(5)
    clearNoteKeySessionHistory()

    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(loadNoteKeySessionHistory()).toEqual([])
  })
})
