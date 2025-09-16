import type { PlasmoCSConfig } from "plasmo"

import type { UserSettings } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/*"],
  all_frames: false
}

class LinkedInTypingSimulator {
  /**
   * Simulates typing in LinkedIn's contenteditable message box
   */
  private async typeMessage(
    message: string,
    inputElement: HTMLElement,
    userSettings: UserSettings
  ): Promise<void> {
    // Focus the element first
    inputElement.focus()

    // Clear the placeholder content properly
    this.clearContentEditableElement(inputElement)

    let i = 0
    const typeChar = (): void => {
      if (i >= message.length) {
        // Dispatch final events
        this.dispatchTypingEvents(inputElement, message[i - 1] || "")
        return
      }

      const char = message.charAt(i)
      this.insertCharacterAtCursor(inputElement, char)
      this.dispatchTypingEvents(inputElement, char)

      i++

      if (i < message.length) {
        setTimeout(typeChar, userSettings.typingDelay)
      }
    }

    typeChar()
  }

  /**
   * Sets the value instantly (no typing animation)
   */
  private setInputValue(
    message: string,
    inputElement: HTMLElement,
    append = false
  ): void {
    inputElement.focus()

    if (inputElement.tagName === "TEXTAREA") {
      const textarea = inputElement as HTMLTextAreaElement
      if (append) textarea.value += message
      else textarea.value = message
    } else {
      // Handle contenteditable div
      if (!append) {
        this.clearContentEditableElement(inputElement)
      }

      this.insertTextAtCursor(inputElement, message)
    }

    this.dispatchTypingEvents(inputElement, message)
  }

  /**
   * Clears contenteditable element properly, handling LinkedIn's structure
   */
  private clearContentEditableElement(element: HTMLElement): void {
    // Remove all content
    element.innerHTML = ""

    // Create the structure LinkedIn expects for empty state
    const p = document.createElement("p")
    const br = document.createElement("br")
    p.appendChild(br)
    element.appendChild(p)

    // Set cursor at the beginning
    this.setCursorToStart(element)
  }

  /**
   * Inserts a single character at the current cursor position
   */
  private insertCharacterAtCursor(element: HTMLElement, char: string): void {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      // If no selection, append to the end
      this.insertTextAtEnd(element, char)
      return
    }

    const range = selection.getRangeAt(0)

    // Handle different cases based on where the cursor is
    if (char === "\n") {
      // Handle line breaks
      const br = document.createElement("br")
      range.deleteContents()
      range.insertNode(br)
      range.setStartAfter(br)
      range.setEndAfter(br)
    } else {
      // Insert regular character
      const textNode = document.createTextNode(char)
      range.deleteContents()
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)
    }

    selection.removeAllRanges()
    selection.addRange(range)
  }

  /**
   * Inserts text at the cursor position, handling LinkedIn's DOM structure
   */
  private insertTextAtCursor(element: HTMLElement, text: string): void {
    const selection = window.getSelection()

    if (!selection || selection.rangeCount === 0) {
      this.insertTextAtEnd(element, text)
      return
    }

    const range = selection.getRangeAt(0)

    // Handle line breaks in the text
    const lines = text.split("\n")

    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        // Insert line break
        const br = document.createElement("br")
        range.insertNode(br)
        range.setStartAfter(br)
        range.setEndAfter(br)
      }

      if (lines[i]) {
        const textNode = document.createTextNode(lines[i])
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
      }
    }

    selection.removeAllRanges()
    selection.addRange(range)
  }

  /**
   * Inserts text at the end of the contenteditable element
   */
  private insertTextAtEnd(element: HTMLElement, text: string): void {
    // Find the last text node or create one
    let lastP = element.querySelector("p:last-child")

    if (!lastP) {
      lastP = document.createElement("p")
      element.appendChild(lastP)
    }

    // Remove empty <br> if it exists
    const br = lastP.querySelector("br")
    if (br && lastP.textContent === "") {
      br.remove()
    }

    // Add the text
    const lines = text.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        const newP = document.createElement("p")
        element.appendChild(newP)
        lastP = newP
      }

      if (lines[i]) {
        lastP.appendChild(document.createTextNode(lines[i]))
      }
    }

    // Set cursor to end
    this.setCursorToEnd(element)
  }

  /**
   * Sets cursor to the start of the contenteditable element
   */
  private setCursorToStart(element: HTMLElement): void {
    const range = document.createRange()
    const selection = window.getSelection()

    if (element.firstChild) {
      range.setStart(element.firstChild, 0)
      range.setEnd(element.firstChild, 0)
    } else {
      range.setStart(element, 0)
      range.setEnd(element, 0)
    }

    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  /**
   * Sets cursor to the end of the contenteditable element
   */
  private setCursorToEnd(element: HTMLElement): void {
    const range = document.createRange()
    const selection = window.getSelection()

    range.selectNodeContents(element)
    range.collapse(false)

    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  /**
   * Dispatches the necessary events for LinkedIn to recognize the input
   */
  private dispatchTypingEvents(element: HTMLElement, char: string): void {
    // Dispatch multiple events that LinkedIn might be listening for
    const events = [
      new Event("input", { bubbles: true }),
      new Event("change", { bubbles: true }),
      new KeyboardEvent("keydown", {
        bubbles: true,
        key: char,
        code: `Key${char.toUpperCase()}`,
        which: char.charCodeAt(0)
      }),
      new KeyboardEvent("keypress", {
        bubbles: true,
        key: char,
        code: `Key${char.toUpperCase()}`,
        which: char.charCodeAt(0)
      }),
      new KeyboardEvent("keyup", {
        bubbles: true,
        key: char,
        code: `Key${char.toUpperCase()}`,
        which: char.charCodeAt(0)
      }),
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        data: char,
        inputType: "insertText"
      })
    ]

    events.forEach((event) => {
      try {
        element.dispatchEvent(event)
      } catch (error) {
        console.warn("Failed to dispatch event:", event.type, error)
      }
    })

    // Also dispatch on parent elements that might be listening
    let parent = element.parentElement
    while (parent && parent !== document.body) {
      try {
        parent.dispatchEvent(new Event("input", { bubbles: true }))
        parent.dispatchEvent(new Event("change", { bubbles: true }))
      } catch (error) {
        // Ignore errors on parent events
      }
      parent = parent.parentElement
    }
  }

  /**
   * Public method to type a message with animation
   */
  public async simulateTyping(
    message: string,
    element: HTMLElement,
    userSettings: UserSettings
  ): Promise<void> {
    await this.typeMessage(message, element, userSettings)
  }

  /**
   * Public method to set message instantly
   */
  public setMessage(
    message: string,
    element: HTMLElement,
    append = false
  ): void {
    this.setInputValue(message, element, append)
  }

  /**
   * Public method to clear the input
   */
  public clearInput(element: HTMLElement): void {
    this.clearContentEditableElement(element)
    this.dispatchTypingEvents(element, "")
  }

  /**
   * Check if the element is empty (has only placeholder content)
   */
  public isElementEmpty(element: HTMLElement): boolean {
    const text = element.textContent?.trim() || ""
    return text === "" || text === "\n"
  }

  /**
   * Wait for element to be ready for input
   */
  public async waitForElement(
    selector: string,
    timeout = 5000
  ): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      const startTime = Date.now()

      const checkElement = () => {
        const element = document.querySelector(selector) as HTMLElement

        if (element && element.isContentEditable) {
          resolve(element)
          return
        }

        if (Date.now() - startTime > timeout) {
          resolve(null)
          return
        }

        setTimeout(checkElement, 100)
      }

      checkElement()
    })
  }
}

export const linkedInTyping = new LinkedInTypingSimulator()
