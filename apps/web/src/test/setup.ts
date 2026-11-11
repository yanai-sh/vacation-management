import { beforeEach, vi } from 'vitest'

// Node's experimental localStorage is unset unless --localstorage-file is passed,
// which hides jsdom storage from the app code under test.
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear() {
      items.clear()
    },
    getItem(key: string) {
      return items.get(key) ?? null
    },
    key(index: number) {
      return [...items.keys()][index] ?? null
    },
    removeItem(key: string) {
      items.delete(key)
    },
    setItem(key: string, value: string) {
      items.set(key, String(value))
    },
  }
}

const storage = memoryStorage()
vi.stubGlobal('localStorage', storage)

beforeEach(() => {
  storage.clear()
})
