import type { PlasmoCSConfig } from "plasmo"

import type { AiDMChatContext, AiDMChatMessage } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/*"],
  all_frames: false
}

class LinkedInMessageExtractor {
  private readonly MAX_TOTAL_CHARS = 3000
  private readonly MIN_MESSAGES = 3
  private readonly MAX_MESSAGES = 10
  private readonly MAX_SINGLE_MESSAGE_CHARS = 500

  /**
   * Extracts chat messages with smart limiting
   */
  public extractChatContext(): AiDMChatContext {
    const messageElements = this.getMessageElements()
    const messages: AiDMChatMessage[] = []
    let totalChars = 0
    let truncated = false

    // Process messages from newest to oldest (reverse order)
    const reversedElements = Array.from(messageElements).reverse()

    for (let i = 0; i < reversedElements.length && i < this.MAX_MESSAGES; i++) {
      const element = reversedElements[i]
      const message = this.extractMessageFromElement(element)

      if (!message) continue

      // Truncate individual message if too long
      if (message.text.length > this.MAX_SINGLE_MESSAGE_CHARS) {
        message.text =
          message.text.substring(0, this.MAX_SINGLE_MESSAGE_CHARS) + "..."
        truncated = true
      }

      const messageLength = message.text.length + message.sender.length + 4 // +4 for formatting

      // Check if adding this message would exceed our limit
      if (
        messages.length >= this.MIN_MESSAGES &&
        totalChars + messageLength > this.MAX_TOTAL_CHARS
      ) {
        truncated = true
        break
      }

      messages.unshift(message) // Add to beginning to maintain chronological order
      totalChars += messageLength
    }

    // If we have too few messages and they're over the limit, truncate the oldest ones
    if (
      messages.length < this.MIN_MESSAGES &&
      totalChars > this.MAX_TOTAL_CHARS
    ) {
      this.truncateOldestMessages(messages, this.MAX_TOTAL_CHARS)
      truncated = true
    }

    return {
      messages,
      totalCharacters: totalChars,
      truncated
    }
  }

  /**
   * Gets all message elements from the chat
   */
  private getMessageElements(): NodeListOf<Element> {
    return document.activeElement.querySelectorAll(
      ".msg-s-event-listitem[data-event-urn]"
    )
  }

  /**
   * Extracts message data from a single DOM element
   */
  private extractMessageFromElement(element: Element): AiDMChatMessage | null {
    const messageTextElement = element.querySelector(
      ".msg-s-event-listitem__body"
    )
    const senderNameElement = element.querySelector(
      ".msg-s-message-group__name"
    )
    const timestampElement = element.querySelector(
      ".msg-s-message-group__timestamp"
    )

    if (!messageTextElement) return null

    const text = this.cleanMessageText(messageTextElement.textContent || "")
    if (!text.trim()) return null

    const isOtherPerson = element.classList.contains(
      "msg-s-event-listitem--other"
    )

    // If it's your message, sender name won't be in the DOM - use "You"
    const sender = isOtherPerson
      ? senderNameElement?.textContent?.trim() || "LinkedIn User"
      : "You"

    const timestamp = timestampElement?.textContent?.trim() || ""

    return {
      sender,
      text,
      timestamp,
      isOtherPerson,
      element
    }
  }
  private attachSingleReplyAction(element: Element): Element | null {
    if (element.hasAttribute("data-copilot-reply-attached")) return
    const messageTextElement = element.querySelector(
      ".msg-s-event-listitem__body"
    )

    if (!messageTextElement) return null

    const isOtherPerson = element.classList.contains(
      "msg-s-event-listitem--other"
    )
    let ele = document.createElement("button")
    ele.classList.add("aiDirectDmReplyButton")
    ele.innerText = "Reply with AI"
    if (isOtherPerson) {
      element.insertAdjacentElement("beforeend", ele)
      element.setAttribute("data-copilot-reply-attached", "true")
    }

    return ele
  }

  /**
   * Cleans up message text (removes extra whitespace, etc.)
   */
  private cleanMessageText(text: string): string {
    return text
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .trim()
  }

  /**
   * Truncates oldest messages to fit within character limit
   */
  private truncateOldestMessages(
    messages: AiDMChatMessage[],
    maxChars: number
  ): void {
    let totalChars = messages.reduce(
      (sum, msg) => sum + msg.text.length + msg.sender.length + 4,
      0
    )

    while (messages.length > 1 && totalChars > maxChars) {
      const removed = messages.shift()!
      totalChars -= removed.text.length + removed.sender.length + 4
    }

    // If even one message is too long, truncate it
    if (messages.length === 1 && totalChars > maxChars) {
      const message = messages[0]
      const targetLength = maxChars - message.sender.length - 4 - 3 // -3 for "..."
      if (targetLength > 0) {
        message.text = message.text.substring(0, targetLength) + "..."
      }
    }
  }

  /**
   * Formats messages for AI context (you can customize this)
   */
  public formatForAI(context: AiDMChatContext): string {
    const formattedMessages = context.messages
      .map((msg) => `${msg.sender}: ${msg.text}`)
      .join("\n")

    return (
      formattedMessages + (context.truncated ? "\n[Context truncated]" : "")
    )
  }

  /**
   * Gets context and formats it in one call
   */
  public getChatContextForAI(): string {
    const context = this.extractChatContext()
    return this.formatForAI(context)
  }

  /**
   * Sets up MutationObserver to watch for new messages
   */
  public watchForNewMessages(
    callback: (newMessage: AiDMChatMessage, replyButton: Element) => void
  ): MutationObserver {
    const chatContainer = document.querySelector(".msg-s-message-list-content")

    if (!chatContainer) {
      // throw new Error("Chat container not found")
      // naa, decided to watch on doc.body instead
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element

              // Check if it's a message element or contains one
              let messageElement = element.classList.contains(
                "msg-s-event-listitem"
              )
                ? element
                : element.querySelector(".msg-s-event-listitem[data-event-urn]")

              if (messageElement) {
                let message = this.extractMessageFromElement(messageElement)
                message.text = `${message.sender}: ${message.text}`
                let attachedElement =
                  this.attachSingleReplyAction(messageElement)
                if (message && attachedElement) {
                  callback(message, attachedElement)
                }
              }
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return observer
  }

  /**
   * Debug function to see what messages are found
   */
  public debugMessages(): void {
    const context = this.extractChatContext()
    console.log("Chat Context:", context)
    console.log("Formatted for AI:", this.formatForAI(context))
  }
}

export const messageExtractor = new LinkedInMessageExtractor()
