import type { PostCommentThreadItem } from "~types"

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

export function cleanName(name: string): string {
  return name
    .replace(/\s*•\s*\d+(?:st|nd|rd|th)\b/i, "") // remove connection state like " • 2nd"
    .replace(/\s+\d+(?:st|nd|rd|th)\b/i, "") // remove connection state like " 2nd"
    .trim()
}

export function extractNameFromLink(linkElement: Element): string {
  const hiddenSpan = linkElement.querySelector('span[aria-hidden="true"]')
  if (hiddenSpan) {
    const text = Array.from(hiddenSpan.childNodes)
      .find((node) => node.nodeType === 3) // TEXT_NODE
      ?.textContent?.trim()
    if (text) return cleanName(text)
  }
  const strong = linkElement.querySelector("strong")
  if (strong) {
    const text = Array.from(strong.childNodes)
      .find((node) => node.nodeType === 3)
      ?.textContent?.trim()
    if (text) return cleanName(text)
  }
  const span = linkElement.querySelector("span")
  if (span) {
    const text = Array.from(span.childNodes)
      .find((node) => node.nodeType === 3)
      ?.textContent?.trim()
    if (text) return cleanName(text)
  }
  return cleanName(linkElement.textContent?.trim() || "")
}

export function extractAuthorName(container: Element): {
  name: string
  link: Element | null
} {
  const links = findAllInShadows('a[href*="/in/"]', container)
  for (const link of links) {
    // Check if the link is within a social header action (e.g. "likes this")
    let parent: Node | null = link.parentNode
    let isSocial = false
    while (parent && parent !== container) {
      if (parent instanceof ShadowRoot) {
        parent = parent.host
        continue
      }
      const text = parent.textContent || ""
      if (
        /\b(likes this|commented on|reposted|suggested|promoted|sponsored)\b/i.test(
          text
        )
      ) {
        isSocial = true
        break
      }
      parent = parent.parentNode
    }
    if (isSocial) continue

    const name = extractNameFromLink(link)
    // Check if it's a real name (not empty, not just a help string, etc.)
    if (name && name.length > 1 && !/view\s+.*profile/i.test(name)) {
      return { name, link }
    }
  }
  return { name: "", link: null }
}

export function extractSingleComment(
  commentElement: Element
): PostCommentThreadItem | null {
  try {
    const { name } = extractAuthorName(commentElement)
    const finalName = name || "Unknown"

    const commentTextElement = findInShadows(
      '[data-testid="expandable-text-box"]',
      commentElement
    )
    let commentText = ""

    if (commentTextElement) {
      const clone = commentTextElement.cloneNode(true) as HTMLElement
      const moreButtons = clone.querySelectorAll(
        '[data-testid="expandable-text-button"]'
      )
      moreButtons.forEach((btn) => btn.remove())
      commentText = clone.textContent?.trim() || ""
      commentText = commentText.replace(/\s+/g, " ").trim()
    }

    if (finalName !== "Unknown" && commentText) {
      return {
        name: finalName,
        comment: commentText
      }
    }
  } catch (error) {
    console.error("Error extracting single comment:", error)
  }
  return null
}

export function extractLinkedInComments(element = document.body) {
  const comments: PostCommentThreadItem[] = []

  const commentElements = findAllInShadows(
    'div[componentkey^="replaceableComment_"]',
    element
  )

  commentElements.forEach((commentElement) => {
    const componentKey = commentElement.getAttribute("componentkey")
    const parent = commentElement.parentElement
    if (
      parent &&
      findClosestIncludingShadows(parent, `div[componentkey="${componentKey}"]`)
    ) {
      return
    }

    const single = extractSingleComment(commentElement)
    if (single) {
      comments.push(single)
    }
  })

  return comments
}

export function findCommentByUrn(
  urn: string,
  startNode: Node = document
): HTMLElement | null {
  const elements = findAllInShadows(
    `div[componentkey="${urn}"]`,
    startNode
  ) as HTMLElement[]
  return (
    elements.find((el) => {
      const parent = el.parentElement
      return (
        !parent ||
        !findClosestIncludingShadows(parent, `div[componentkey="${urn}"]`)
      )
    }) ?? null
  )
}

export function findClosestPrecedingComment(
  inputEl: HTMLElement,
  startNode: Node = document
): HTMLElement | null {
  const allComments = findAllInShadows(
    'div[componentkey^="replaceableComment_"]',
    startNode
  ) as HTMLElement[]

  const uniqueOutermostComments: HTMLElement[] = []
  const seenKeys = new Set<string>()

  allComments.forEach((el) => {
    const key = el.getAttribute("componentkey")
    if (key && !seenKeys.has(key)) {
      const parent = el.parentElement
      const isOutermost =
        !parent ||
        !findClosestIncludingShadows(parent, `div[componentkey="${key}"]`)
      if (isOutermost) {
        uniqueOutermostComments.push(el)
        seenKeys.add(key)
      }
    }
  })

  let closest: HTMLElement | null = null
  for (const commentEl of uniqueOutermostComments) {
    const pos = commentEl.compareDocumentPosition(inputEl)
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
      closest = commentEl
    }
  }
  return closest
}

export function formatPostCommentThreadItems(
  comments: PostCommentThreadItem[]
) {
  let output = "\n"

  comments.forEach((item, index) => {
    output += `${index + 1}. Name: ${item.name}\n  Comment: ${item.comment}\n\n`
  })

  return output
}

export function findInShadows(
  selector: string,
  startNode: Node = document
): Element | null {
  if (startNode instanceof Document || startNode instanceof Element) {
    try {
      const quick = (startNode as any).querySelector(selector)
      if (quick) return quick
    } catch (e) {}
  }

  let found: Element | null = null

  function walk(node: Node): boolean {
    if (node instanceof Element) {
      if (node.matches(selector)) {
        found = node
        return true
      }
      if (node.shadowRoot) {
        try {
          const quick = node.shadowRoot.querySelector(selector)
          if (quick) {
            found = quick
            return true
          }
        } catch (e) {}
        if (walk(node.shadowRoot)) return true
      }
    }

    let child = node.firstChild
    while (child) {
      if (walk(child)) return true
      child = child.nextSibling
    }
    return false
  }

  walk(startNode)
  return found
}

export function findAllInShadows(
  selector: string,
  startNode: Node = document
): Element[] {
  let results: Element[] = []
  if (startNode instanceof Document || startNode instanceof Element) {
    try {
      const quick = Array.from(
        (startNode as any).querySelectorAll(selector)
      ) as Element[]
      if (quick.length > 0) {
        results = quick
      }
    } catch (e) {}
  }

  const seen = new Set<Element>(results)

  function walk(node: Node) {
    if (node instanceof Element) {
      if (node.matches(selector)) {
        if (!seen.has(node)) {
          results.push(node)
          seen.add(node)
        }
      }
      if (node.shadowRoot) {
        try {
          const quick = Array.from(
            node.shadowRoot.querySelectorAll(selector)
          ) as Element[]
          quick.forEach((el) => {
            if (!seen.has(el)) {
              results.push(el)
              seen.add(el)
            }
          })
        } catch (e) {}
        walk(node.shadowRoot)
      }
    }

    let child = node.firstChild
    while (child) {
      walk(child)
      child = child.nextSibling
    }
  }

  walk(startNode)
  return results
}

export function findClosestIncludingShadows(
  node: Node | null,
  selector: string
): Element | null {
  let current: Node | null = node
  while (current) {
    if (current instanceof Element) {
      if (current.matches(selector)) {
        return current
      }
    }
    if (current instanceof ShadowRoot) {
      current = current.host
    } else {
      current = current.parentNode
    }
  }
  return null
}

export function getCommentIndentation(commentEl: HTMLElement): number {
  const avatarLink = findInShadows(
    'a[href*="/in/"]',
    commentEl
  ) as HTMLElement | null
  if (!avatarLink) return 0

  const style = avatarLink.getAttribute("style") || ""
  if (
    style.includes("margin-inline-start") ||
    style.includes("margin-left") ||
    style.includes("--_25701a71")
  ) {
    return 1
  }

  let curr: HTMLElement | null = avatarLink
  while (curr && curr !== commentEl) {
    const inlineStyle = curr.getAttribute("style") || ""
    if (
      inlineStyle.includes("margin-inline-start") ||
      inlineStyle.includes("margin-left") ||
      inlineStyle.includes("--_25701a71")
    ) {
      return 1
    }
    curr = curr.parentElement
  }

  try {
    const computed = window.getComputedStyle(avatarLink)
    const marginStart = computed.marginInlineStart || computed.marginLeft || "0"
    if (
      marginStart &&
      marginStart !== "0" &&
      marginStart !== "0px" &&
      marginStart !== "normal"
    ) {
      return 1
    }
  } catch (e) {}

  return 0
}
