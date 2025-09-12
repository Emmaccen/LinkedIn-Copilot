export const STORAGE_CHANGE_EVENT = "customStorageChange"
export const ENCRYPTION_KEY_NAME = "linkedin-copilot-key" // For storing the encryption key
export const ENCRYPTED_API_KEY_NAME = "encrypted-groq-api-key" // For storing the encrypted API key
const dispatchStorageEvent = (key: string, newValue: string | null) => {
  window.dispatchEvent(
    new CustomEvent(STORAGE_CHANGE_EVENT, {
      detail: { key, newValue }
    })
  )
}

export const loadFromLocalStorage = async <T>(
  key: string,
  validator?: (data: unknown) => data is T
): Promise<T> | null => {
  try {
    const storedValue = await chrome.storage.local.get(key)

    if (Object.keys(storedValue).length === 0) {
      return null
    }

    let parsedValue: unknown
    try {
      parsedValue = JSON.parse(storedValue[key])
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

export const saveToLocalStorage = async <T>(
  key: string,
  value: T,
  announce: boolean = false
): Promise<boolean> => {
  try {
    const serializedValue = JSON.stringify(value)

    await chrome.storage.local.set({ [key]: serializedValue })
    if (announce) {
      dispatchStorageEvent(key, serializedValue)
    }
    return true
  } catch (error) {
    console.error("Error saving to storage:", error)
    return false
  }
}
export const removeFromLocalStorage = async (key: string) => {
  try {
    await chrome.storage.local.remove(key)
  } catch (error) {
    console.error("Error removing from storage:", error)
  }
}
export const clearLocalStorage = async () => {
  try {
    await chrome.storage.local.clear()
  } catch (error) {
    console.error("Error clearing storage:", error)
  }
}

function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)))
}

export async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get(ENCRYPTION_KEY_NAME)

  if (stored[ENCRYPTION_KEY_NAME]) {
    try {
      const rawKey = base64ToBuffer(stored[ENCRYPTION_KEY_NAME])
      return await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
        "encrypt",
        "decrypt"
      ])
    } catch (error) {
      console.warn("Failed to import stored key, creating new one:", error)
      // Clear corrupted key and create new one
      await chrome.storage.local.remove(ENCRYPTION_KEY_NAME)
    }
  }

  // Create new key
  const raw = crypto.getRandomValues(new Uint8Array(32)) // 256-bit
  await chrome.storage.local.set({
    [ENCRYPTION_KEY_NAME]: bufferToBase64(raw)
  })

  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt"
  ])
}

export async function encryptApiKey(apiKey: string): Promise<string> {
  try {
    const key = await getOrCreateKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(apiKey)

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    )

    const result = {
      iv: bufferToBase64(iv),
      data: bufferToBase64(new Uint8Array(encrypted))
    }

    return JSON.stringify(result)
  } catch (error) {
    console.error("Encryption failed:", error)
    throw new Error("Failed to encrypt API key")
  }
}

export async function decryptApiKey(cipherText: string): Promise<string> {
  try {
    const key = await getOrCreateKey()

    // Add more detailed logging
    // console.log("Cipher text received:", cipherText)

    const payload = JSON.parse(cipherText)
    // console.log("Parsed payload:", payload)

    // Validate payload structure
    if (!payload.iv || !payload.data) {
      throw new Error("Invalid cipher text format - missing iv or data")
    }

    const iv = base64ToBuffer(payload.iv)
    const data = base64ToBuffer(payload.data)

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    )

    const result = new TextDecoder().decode(decrypted)
    // console.log("Decryption successful, API key length:", result.length)
    return result
  } catch (error) {
    console.error("Decryption failed:", error)
    console.error("Error details:", error.message)
    console.error("Stack trace:", error.stack)

    // If decryption fails, it might be a key mismatch - clear and retry once
    if (
      error.message.includes("decrypt") ||
      error.message.includes("OperationError")
    ) {
      console.warn("Clearing encryption key due to decrypt failure")
      await chrome.storage.local.remove(ENCRYPTION_KEY_NAME)
    }

    throw new Error(`Failed to decrypt API key: ${error.message}`)
  }
}

// Helper function to save encrypted API key
export async function saveEncryptedApiKey(apiKey: string): Promise<void> {
  try {
    const encryptedKey = await encryptApiKey(apiKey)
    await chrome.storage.local.set({
      [ENCRYPTED_API_KEY_NAME]: encryptedKey
    })
  } catch (error) {
    console.error("Failed to save encrypted API key:", error)
    throw error
  }
}

// Helper function to get decrypted API key
export async function getDecryptedApiKey(): Promise<string | null> {
  try {
    const stored = await chrome.storage.local.get(ENCRYPTED_API_KEY_NAME)
    if (!stored[ENCRYPTED_API_KEY_NAME]) {
      return null
    }

    return await decryptApiKey(stored[ENCRYPTED_API_KEY_NAME])
  } catch (error) {
    console.error("Failed to get decrypted API key:", error)
    return null
  }
}

// Debug function to check storage contents
export async function debugStorage(): Promise<void> {
  const allStorage = await chrome.storage.local.get(null)
  console.log("All storage contents:", allStorage)
  console.log("Encryption key exists:", !!allStorage[ENCRYPTION_KEY_NAME])
  console.log("Encrypted API key exists:", !!allStorage[ENCRYPTED_API_KEY_NAME])
}
