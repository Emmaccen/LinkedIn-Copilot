import type { PlasmoCSConfig } from "plasmo"

import { linkedInCopilotStyles } from "~styles"
import type {
  ContextType,
  DropdownAction,
  NotificationType,
  TemplateCategory,
  UsageStats,
  UserDetails,
  UserInfo,
  UserSettings
} from "~types"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/*"],
  all_frames: false
}

class LinkedinCopilot {
  private templates: Record<string, TemplateCategory>
  private settings: UserSettings
  private activeDropdowns: Set<HTMLElement> = new Set()
  private observer: MutationObserver
  private userDetails: UserDetails

  constructor() {
    this.templates = {}
    this.settings = {
      typingDelay: 40,
      enableTypingSimulation: true
    }
    this.init()
  }

  private async init(): Promise<void> {
    await this.loadSettings()
    this.reloadSettingsOnStorageUpdate()
    this.setupDropdownObserver()
    this.injectStyles()
    this.scanForInputs()
  }

  private reloadSettingsOnStorageUpdate = () => {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local")
        if (
          changes["userSettings"] ||
          changes["templates"] ||
          changes["userDetails"]
        )
          this.loadSettings()
    })
  }
  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        "templates",
        "userSettings",
        "userDetails"
      ])
      console.log(result.templates)
      this.settings = {
        ...this.settings,
        ...(result.settings ? JSON.parse(result.settings) : {})
      }
      this.userDetails = result.UserDetails
        ? JSON.parse(result.UserDetails)
        : {
            fullName: "",
            professionalTitle: "",
            professionalSummary: ""
          }

      if (result.templates) this.templates = JSON.parse(result.templates)
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  private injectStyles(): void {
    const styleId = "copilot-dropdown-styles"
    if (document.getElementById(styleId)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = linkedInCopilotStyles
    document.head.appendChild(style)
  }

  private setupDropdownObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element

              // Scan for inputs
              this.scanForInputs(element)
            }
          })
        }
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  private scanForInputs(container: Element = document as any as Element): void {
    const placeholders = [
      "comment",
      "loved",
      "support",
      "insightful",
      "funny",
      "wishes"
    ]
    const commentBoxes = Array.from(
      container.querySelectorAll(".ql-editor[role='textbox']")
    ).filter((el) =>
      placeholders.some((text) =>
        el.getAttribute("data-placeholder")?.toLowerCase().includes(text)
      )
    )

    commentBoxes.forEach((box) =>
      this.attachDropdown(box as HTMLElement, "feed")
    )
  }

  private findTopLevelContainer(
    element: HTMLElement,
    criteria: (current: HTMLElement) => boolean
  ): HTMLElement {
    let current = element

    while (
      !criteria(current) &&
      current.parentElement &&
      current.parentElement.tagName !== "BODY"
    ) {
      current = current.parentElement
    }

    return current
  }

  private attachDropdown(
    inputElement: HTMLElement,
    context: ContextType
  ): void {
    if (inputElement.hasAttribute("data-copilot-attached")) return

    inputElement.setAttribute("data-copilot-attached", "true")

    const dropdown = this.createDropdown(context, inputElement)

    const inputContainer = inputElement.closest(
      ".comments-comment-box__form"
    ) as HTMLElement

    if (inputContainer.parentElement) {
      inputContainer.parentElement.insertAdjacentElement("afterend", dropdown)
    }

    // Show dropdown on focus
    inputElement.addEventListener("focus", () => {
      this.showDropdown(dropdown)
    })

    // Input might already be focused before we attached the "focus" event
    if (document.activeElement === inputElement) {
      this.showDropdown(dropdown)
    }

    // Hide dropdown on blur (with delay for click handling)
    inputElement.addEventListener("blur", () => {
      setTimeout(() => {
        if (!dropdown.matches(":hover")) {
          this.hideDropdown(dropdown)
        }
      }, 150)
    })
  }

  private createDropdown(
    context: ContextType,
    inputElement: HTMLElement
  ): HTMLElement {
    const dropdown = document.createElement("div")
    dropdown.className = "copilot-dropdown"
    dropdown.style.display = "none"

    const actions = this.getActionsForContext(context)

    // Create capsule container
    const capsuleContainer = document.createElement("div")
    capsuleContainer.className = "copilot-capsule-container"

    actions.forEach((action) => {
      const capsule = document.createElement("div")
      capsule.className = `copilot-capsule ${action.category === "ai" ? "copilot-capsule-ai" : "copilot-capsule-template"}`

      capsule.innerHTML = `
      <span class="copilot-capsule-icon">${action.icon}</span>
      <span class="copilot-capsule-text">${action.label}</span>
      ${action.category === "ai" ? '<span class="copilot-ai-badge">AI</span>' : ""}
    `

      capsule.addEventListener("click", (e) => {
        e.preventDefault()
        this.handleDropdownAction(action, inputElement, context)
        this.hideDropdown(dropdown)
      })

      capsuleContainer.appendChild(capsule)
    })

    dropdown.appendChild(capsuleContainer)

    return dropdown
  }

  private getActionsForContext(context: ContextType): DropdownAction[] {
    const baseActions: DropdownAction[] = []

    const sectionTemplate = () => {
      let allSections: {
        [Key: string]: {
          [group: string]: TemplateCategory
        }
      } = {}
      for (const [group, template] of Object.entries(this.templates)) {
        if (template.active && template.context.includes(context)) {
          template.context.forEach((section) => {
            if (!allSections[section]) {
              allSections[section] = {}
            }
            allSections[section][group] = template
          })
        }
      }

      return allSections
    }

    if (context === "feed") {
      for (const [group] of Object.entries(sectionTemplate()["feed"] ?? {})) {
        baseActions.push({
          id: `template-${group}`,
          label: `Reply with ${group}`,
          icon: this.templates[group].icon,
          category: group
        })
      }
    }

    return baseActions
  }

  private async handleDropdownAction(
    action: DropdownAction,
    inputElement: HTMLElement,
    context: ContextType
  ): Promise<void> {
    try {
      await this.handleTemplateReply(action.category, inputElement)
    } catch (error) {
      console.error("Error handling dropdown action:", error)
      this.showNotification("Failed to generate reply", error)
    }
  }

  private extractUserInfo(inputElement: HTMLElement): UserInfo {
    const info: UserInfo = {}

    const postContainer =
      inputElement.closest(".feed-shared-update-v2") ||
      inputElement.closest(".feed-shared-update-detail-viewer__right-panel")
    if (!postContainer) return {}

    // Try to extract name
    const nameElement = postContainer.querySelector(
      ".update-components-actor__title"
    )
    if (nameElement?.textContent) {
      info.name = nameElement.textContent.trim().split(" ")[0]
    }

    const userDesc = postContainer.querySelector(
      ".update-components-actor__description"
    )
    if (userDesc?.textContent) {
      info.desc = userDesc.textContent.trim()
    }

    return info
  }

  private async handleTemplateReply(
    category: string,
    inputElement: HTMLElement
  ): Promise<void> {
    if (
      this.templates[category].active &&
      !this.templates[category].templates.length
    )
      return this.showNotification(
        `No templates available for "${category}"`,
        "warning"
      )

    const template: TemplateCategory = this.templates[category]

    template.templates = template.templates.filter(
      (template) => template.active
    )

    // For now, we'll use random selection
    // TODO: Implement template selection dropdown for better UX
    const selectedTemplate =
      template.templates[Math.floor(Math.random() * template.templates.length)]

    this.showNotification(`Using "${category}" template...`, "info")

    const userInfo = this.extractUserInfo(inputElement)
    const message = this.processTemplate(selectedTemplate.message, userInfo)

    if (this.settings.enableTypingSimulation) {
      await this.typeMessage(message, inputElement)
    } else {
      this.setInputValue(message, inputElement)
    }
    this.updateUsageStats(category)
  }

  private showDropdown(dropdown: HTMLElement): void {
    dropdown.style.display = "block"
    this.activeDropdowns.add(dropdown)
  }

  private hideDropdown(dropdown: HTMLElement): void {
    dropdown.style.display = "none"
    this.activeDropdowns.delete(dropdown)
  }

  private processTemplate(message: string, userInfo: UserInfo): string {
    let processed = message

    Object.keys(userInfo).forEach((key) => {
      const placeholder = `{{${key}}}`
      const value = userInfo[key]
      if (processed.includes(placeholder) && value) {
        processed = processed.replace(new RegExp(placeholder, "g"), value)
      }
    })

    processed = processed.replace(/\{\{[^}]+\}\}/g, "") // Remove any remaining placeholders
    return processed.trim()
  }

  private async typeMessage(
    message: string,
    inputElement: HTMLElement
  ): Promise<void> {
    inputElement.focus()

    let i = 0
    const typeChar = (): void => {
      if (i >= message.length) return

      const char = message.charAt(i)

      if (inputElement.tagName === "TEXTAREA") {
        const textarea = inputElement as HTMLTextAreaElement
        textarea.value += char
      } else {
        inputElement.textContent += char
      }

      const inputEvent = new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        data: char,
        inputType: "insertText"
      })

      inputElement.dispatchEvent(inputEvent)
      i++

      if (i < message.length) {
        setTimeout(typeChar, this.settings.typingDelay)
      }
    }

    typeChar()
  }

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
      if (append) inputElement.textContent += message
      else inputElement.innerHTML = message
    }

    inputElement.dispatchEvent(new Event("input", { bubbles: true }))
    inputElement.dispatchEvent(new Event("change", { bubbles: true }))
  }

  private showNotification(
    message: string,
    type: NotificationType = "info"
  ): void {
    const notification = document.createElement("div")
    notification.className = `linkedin-auto-reply-notification ${type}`
    notification.textContent = message

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.add("show")
    }, 100)

    setTimeout(() => {
      notification.classList.remove("show")
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  private updateUsageStats(category: string): void {
    const today = new Date().toDateString()
    chrome.storage.local.get(["usageStats"], (result) => {
      const stats: UsageStats = JSON.parse(result.usageStats) || {}
      if (!stats[today]) stats[today] = {}
      if (!stats[today][category]) stats[today][category] = 0

      stats[today][category]++
      stats[today].total = (stats[today].total || 0) + 1

      chrome.storage.local.set({ usageStats: stats })
    })
  }

  // Cleanup on unload
  public destroy(): void {
    this.observer?.disconnect()
    this.activeDropdowns.forEach((dropdown) => dropdown.remove())
    this.activeDropdowns.clear()
  }
}

// Initialize when DOM is ready
const initializeCopilot = (): void => {
  new LinkedinCopilot()
  console.log("LinkedIn Copilot initialized")
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCopilot)
} else {
  initializeCopilot()
}

export { LinkedinCopilot }
