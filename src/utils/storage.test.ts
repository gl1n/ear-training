import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStorage, removeStorage, writeStorage } from './storage'

describe('safe storage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not let unavailable storage break the application', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('quota') },
      removeItem: () => { throw new Error('blocked') },
    })
    expect(readStorage('key')).toBeNull()
    expect(writeStorage('key', 'value')).toBe(false)
    expect(removeStorage('key')).toBe(false)
  })
})
