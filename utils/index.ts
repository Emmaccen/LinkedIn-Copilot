export const loadFromStorage = async (key: string) => {
  try {
    const result = await chrome.storage.local.get(key)
    return result[key]
  } catch (error) {
    console.error("Error loading from storage:", error)
    return null
  }
}
export const removeFromStorage = async (key: string) => {
  try {
    await chrome.storage.local.remove(key)
  } catch (error) {
    console.error("Error removing from storage:", error)
  }
}
export const clearStorage = async () => {
  try {
    await chrome.storage.local.clear()
  } catch (error) {
    console.error("Error clearing storage:", error)
  }
}
