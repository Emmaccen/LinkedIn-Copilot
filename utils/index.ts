// Custom event for same-tab localStorage changes
export const STORAGE_CHANGE_EVENT = "customStorageChange"

// Helper function to dispatch custom storage events
const dispatchStorageEvent = (key: string, newValue: string | null) => {
  window.dispatchEvent(
    new CustomEvent(STORAGE_CHANGE_EVENT, {
      detail: { key, newValue }
    })
  )
}

export const loadFromLocalStorage = <T>(
  key: string,
  validator?: (data: unknown) => data is T
): T | null => {
  try {
    const storedValue = localStorage.getItem(key)

    if (storedValue === null) {
      return null
    }

    let parsedValue: unknown
    try {
      parsedValue = JSON.parse(storedValue)
    } catch {
      parsedValue = storedValue
    }

    if (validator && !validator(parsedValue)) {
      console.warn(`Invalid data structure for key "${key}"`)
      return null
    }

    return parsedValue as T
  } catch (error) {
    console.error("Error loading from storage:", error)
    return null
  }
}

export const saveToLocalStorage = <T>(key: string, value: T): boolean => {
  try {
    const serializedValue = JSON.stringify(value)
    localStorage.setItem(key, serializedValue)
    dispatchStorageEvent(key, serializedValue)
    return true
  } catch (error) {
    console.error("Error saving to storage:", error)
    return false
  }
}
export const removeFromLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error("Error removing from storage:", error)
  }
}
export const clearLocalStorage = () => {
  try {
    localStorage.clear()
  } catch (error) {
    console.error("Error clearing storage:", error)
  }
}
