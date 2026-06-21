import type { PlasmoCSConfig } from "plasmo"

import { messageExtractor } from "~contents/LinkedInMessageExtractor"
import { linkedInTyping } from "~contents/TypingSimulator"
import { createLinkedInPostWithAi, generateReply } from "~lib/ai-copilot"
import Analytics from "~lib/analytics"
import {
  AiCommentSystemMessage,
  AiDmChatSystemMessage,
  AiSingleDmSystemMessage,
  AiThreadReplySystemMessage,
  aiWritingStyleSystemMessage
} from "~static-data"
import { linkedInCopilotStyles } from "~styles"
import {
  AnalyticsEventTypes,
  type AiDMChatMessage,
  type ContextType,
  type DropdownAction,
  type NotificationType,
  type TemplateCategory,
  type UsageStats,
  type UserDetails,
  type UserInfo,
  type UserSettings
} from "~types"
import { extractLinkedInComments, formatPostCommentThreadItems } from "~utils"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/*"],
  all_frames: false
}

class LinkedinCopilot {
  private templates: Record<string, TemplateCategory>
  private userSettings: UserSettings
  private activeDropdowns: Set<HTMLElement> = new Set()
  private observer: MutationObserver
  private userDetails: UserDetails
  private messageObserver: MutationObserver
  private UserAnalytics: typeof Analytics

  constructor() {
    this.templates = {}
    this.userSettings = {
      typingDelay: 40,
      enableTypingSimulation: true
    }
    this.init()
    this.UserAnalytics = Analytics
  }

  private async init(): Promise<void> {
    await this.loadSettings()
    this.reloadSettingsOnStorageUpdate()
    this.setupDropdownObserver()
    this.injectStyles()
    this.scanForInputs()
    this.messageObserver = messageExtractor.watchForNewMessages(
      (message, replyButton) => this.AiReplySingleDM(message, replyButton)
    )
    this.unloadOnDestroy()
  }
  // run destroy to unload when user closes tab
  private unloadOnDestroy = () => {
    window.addEventListener("unload", () => {
      this.destroy()
    })
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

  private attachWritePostWithAiUI = (element: Element) => {
    // Check specifically for post dialog
    const postDialog = element.classList.contains("share-box")

    if (postDialog) {
      const postContainer = element
      const postInputBox = postContainer.querySelector(
        ".ql-editor[role='textbox']"
      )
      const writeWithAiTip = document.createElement("div")
      writeWithAiTip.innerHTML = `
                <div class="writeWithAiTip">
                  <p class="">Linkedin Copilot is enabled, describe your post and click the "Pilot Button" to generate/edit content</p>
                  <button class="writeWithAiButton">Pilot ✨</button>
                </div>
                `
      const writeWithAiButtonAction = writeWithAiTip.querySelector(
        ".writeWithAiButton"
      ) as HTMLButtonElement
      writeWithAiButtonAction.addEventListener("click", async (e) => {
        e.preventDefault()
        await this.writeFeedPostWithAi()
      })
      if (postInputBox) {
        postInputBox.parentElement.insertBefore(writeWithAiTip, postInputBox)
      }
    }
  }

  private convertTextToHtml(text: string): string {
    // Split into paragraphs (with line breaks)
    const paragraphs = text.split(/\n\s*\n/)
    return paragraphs
      .map((paragraph) => `<p>${paragraph}</p><p><br></p>`)
      .join("")
  }
  private async writeFeedPostWithAi(): Promise<void> {
    // share-creation-state__text-editor
    const postContainer = document.querySelector(".share-box") as HTMLElement
    if (!postContainer) return
    this.startAiProcessing(postContainer)
    const inputElement = postContainer.querySelector(
      ".ql-editor[role='textbox']"
    ) as HTMLElement

    if (!inputElement) {
      this.stopAiProcessing(postContainer)
      return this.showNotification("Post input not found", "error")
    }

    const textContent = inputElement?.textContent?.trim() || ""
    if (!textContent) {
      this.stopAiProcessing(postContainer)
      return this.showNotification("Post content is empty", "warning")
    }

    try {
      const stream = await createLinkedInPostWithAi({
        message: textContent,
        systemMessage: aiWritingStyleSystemMessage({
          personalInfo: this.userDetails
        })
      })
      this.setInputValue("", inputElement)
      let finalOutput = ""
      for await (const chunk of stream) {
        finalOutput += chunk.choices[0]?.delta?.content || ""
        this.setInputValue(
          chunk.choices[0]?.delta?.content || "",
          inputElement,
          true
        )
      }

      // For contenteditable elements (like LinkedIn's post composer)
      const htmlMessage = this.convertTextToHtml(finalOutput)
      this.setInputValue(htmlMessage, inputElement, false)

      this.stopAiProcessing(postContainer)
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_EVENT,
          eventName: AnalyticsEventTypes.AI_POST_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
    } catch (error) {
      this.showNotification("AI service unavailable", "error")
      this.stopAiProcessing(postContainer)
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_ERROR_EVENT,
          eventName: AnalyticsEventTypes.AI_POST_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
    }
  }

  private AiReplySingleDM = (
    message: AiDMChatMessage,
    replyButton: Element
  ) => {
    replyButton.addEventListener("click", (e) => {
      e.preventDefault()

      const dmContainer = this.findTopLevelContainer(
        message.element as HTMLElement,
        (element) =>
          !!element.querySelector(
            ".msg-form__contenteditable[contenteditable='true']"
          )
      )
      if (!dmContainer) return

      const dmInput = dmContainer.querySelector(
        ".msg-form__contenteditable[contenteditable='true']"
      ) as HTMLElement
      if (!dmInput) return
      const loaderContainer = dmInput.closest(
        ".msg-form__msg-content-container--scrollable"
      ) as HTMLElement
      this.startAiProcessing(loaderContainer)
      this.handleSingleDmMessageAIReply(dmInput, message.text).finally(() => {
        this.stopAiProcessing(loaderContainer)
      })
    })
  }
  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        "templates",
        "userSettings",
        "userDetails"
      ])
      this.userSettings = {
        ...this.userSettings,
        ...(result.userSettings ? JSON.parse(result.userSettings) : {})
      }
      this.userDetails = result.userDetails
        ? JSON.parse(result.userDetails)
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
              this.attachWritePostWithAiUI(element)
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

    const subCommentBoxes = Array.from(
      container.querySelectorAll(".ql-editor[role='textbox']")
    )
      .filter((el) =>
        el
          .getAttribute("data-placeholder")
          // ?.toLowerCase()
          .includes("Add a reply…")
      )
      .map((commentBox) => {
        commentBox.setAttribute("is-sub-reply", "true")
        commentBox.setAttribute("replying-to", commentBox.textContent)
        return commentBox
      })

    const dmBoxes = container.querySelectorAll(
      ".msg-form__contenteditable[contenteditable='true']"
    )
    if (dmBoxes.length > 0) {
      this.attachPilotToDmBoxes(dmBoxes[0] as HTMLElement, "dm")
    }

    commentBoxes.forEach((box) =>
      this.attachDropdown(box as HTMLElement, "feed")
    )
    subCommentBoxes.forEach((box) =>
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
    // inputElement.addEventListener("blur", () => {
    //   setTimeout(() => {
    //     if (!dropdown.matches(":hover")) {
    //       this.hideDropdown(dropdown)
    //     }
    //   }, 150)
    // })
  }

  private attachPilotToDmBoxes = (
    inputElement: HTMLElement,
    context: ContextType
  ): void => {
    if (inputElement.hasAttribute("data-copilot-attached")) return

    inputElement.setAttribute("data-copilot-attached", "true")

    const dropdown = this.createDropdown(context, inputElement)

    const inputContainer = inputElement.closest(
      ".msg-form__msg-content-container"
    ) as HTMLElement

    inputContainer.insertAdjacentElement("afterend", dropdown)
  }

  private createDropdown(
    context: ContextType,
    inputElement: HTMLElement
  ): HTMLElement {
    const dropdown = document.createElement("div")
    dropdown.className = "copilot-dropdown"
    // dropdown.style.display = "none"

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
    `

      capsule.addEventListener("click", (e) => {
        e.preventDefault()
        this.handleDropdownAction(action, inputElement, context)
        // this.hideDropdown(dropdown)
      })

      capsuleContainer.appendChild(capsule)
    })

    dropdown.appendChild(capsuleContainer)

    return dropdown
  }

  private startAiProcessing(element: HTMLElement): void {
    if (element) element.classList.add("ai-processing", "ai-processing-shimmer")
  }

  private stopAiProcessing(element: HTMLElement): void {
    if (element)
      element.classList.remove("ai-processing", "ai-processing-shimmer")
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
      baseActions.push({
        id: "ai-reply",
        label: "Reply with AI",
        icon: "",
        category: "ai"
      })
      for (const [group] of Object.entries(sectionTemplate()["feed"] ?? {})) {
        baseActions.push({
          id: `template-${group}`,
          label: `Reply with ${group}`,
          icon: this.templates[group].icon,
          category: group
        })
      }
    }

    if (context === "dm") {
      baseActions.push({
        id: "ai-reply",
        label: "Reply with AI",
        icon: "",
        category: "ai"
      })
      for (const [group] of Object.entries(sectionTemplate()["dm"] ?? {})) {
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
    if (action.category === "ai") {
      if (action.id === "ai-reply") {
        // Handle AI reply for feed or DM
        if (context === "dm") {
          await this.handleAIChatHistoryReply(inputElement)
        } else {
          if (inputElement.getAttribute("is-sub-reply") === "true") {
            const topLevelCommentContainer = this.findTopLevelContainer(
              inputElement,
              (searchElement) =>
                searchElement.tagName === "ARTICLE" &&
                searchElement.getAttribute("tabindex") === "-1" &&
                searchElement.parentElement.tagName === "DIV"
            )
            if (topLevelCommentContainer) {
              const comments = extractLinkedInComments(
                topLevelCommentContainer.parentElement
              )
              if (!!comments.length) {
                let formattedCommentForAi =
                  formatPostCommentThreadItems(comments)
                const replyingTo = inputElement.getAttribute("replying-to")
                formattedCommentForAi += `\n You're replying To: ${replyingTo}`

                if (!replyingTo) {
                  this.showNotification(
                    "Unable to process who you're replying to. Please click the reply button and focus input",
                    "error"
                  )
                  return
                }
                this.showNotification(
                  `Replying to ${replyingTo ?? "Comment"}`,
                  "info"
                )

                await this.ReplyPostCommentWithAI(
                  inputElement,
                  context,
                  formattedCommentForAi
                )
              }
            }
          } else await this.ReplyPostCommentWithAI(inputElement, context)
        }
      }
    } else {
      await this.handleTemplateReply(action.category, inputElement, context)
    }
  }

  private extractPostContent(inputElement: HTMLElement): string {
    // Find the post content relative to the comment box
    const postContainer =
      inputElement.closest(".feed-shared-update-v2") ||
      inputElement.closest(
        ".feed-shared-update-detail-viewer__overflow-content"
      )
    if (!postContainer) return ""

    const contentElement = postContainer.querySelector(
      ".update-components-text"
    )
    return contentElement?.textContent?.trim() || ""
  }

  private async handleSingleDmMessageAIReply(
    inputElement: HTMLElement,
    DmMessage: string
  ): Promise<void> {
    try {
      linkedInTyping.setMessage("", inputElement)

      const stream = await generateReply({
        message: DmMessage,
        systemMessage: AiSingleDmSystemMessage({
          personalInfo: this.userDetails
        })
      })
      let reply = ""
      for await (const chunk of stream) {
        reply += chunk.choices[0]?.delta?.content || ""
      }
      linkedInTyping.setMessage(reply, inputElement)
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_EVENT,
          eventName: AnalyticsEventTypes.AI_DM_SINGLE_REPLY_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
    } catch (error) {
      console.log(error)
      this.showNotification("AI service unavailable", "error")
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_ERROR_EVENT,
          eventName: AnalyticsEventTypes.AI_DM_SINGLE_REPLY_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
    }
  }
  private async handleAIChatHistoryReply(
    inputElement: HTMLElement
  ): Promise<void> {
    try {
      const loaderContainer = inputElement.closest(
        ".msg-form__msg-content-container--scrollable"
      ) as HTMLElement
      this.startAiProcessing(loaderContainer)
      const chatContext = messageExtractor.getChatContextForAI()

      linkedInTyping.setMessage("", inputElement)

      const stream = await generateReply({
        message: chatContext,
        systemMessage: AiDmChatSystemMessage({
          personalInfo: this.userDetails
        })
      })
      let reply = ""
      for await (const chunk of stream) {
        reply += chunk.choices[0]?.delta?.content || ""
      }
      linkedInTyping.setMessage(reply, inputElement)
      this.stopAiProcessing(loaderContainer)
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_EVENT,
          eventName: AnalyticsEventTypes.AI_DM_CHAT_HISTORY_REPLY_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
    } catch (error) {
      this.showNotification("AI service unavailable", "error")
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_ERROR_EVENT,
          eventName: AnalyticsEventTypes.AI_DM_CHAT_HISTORY_REPLY_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
    }
  }
  private async ReplyPostCommentWithAI(
    inputElement: HTMLElement,
    context: ContextType,
    threadCommentData?: string
  ): Promise<void> {
    // Extract post content for context
    const postContent = this.extractPostContent(inputElement)
    const userInfo = this.extractUserInfo(inputElement)

    try {
      // only clear input when we're re-trying not when we've only just mentioned @handle/tag
      const possibleReplyToNameInInput =
        inputElement.textContent.trim().length <= 30
      if (!possibleReplyToNameInInput) {
        this.setInputValue("", inputElement)
      }
      const loaderContainer = inputElement.closest(
        ".comments-comment-texteditor"
      ) as HTMLElement
      this.startAiProcessing(loaderContainer)
      const stream = await generateReply({
        message: postContent,
        systemMessage: threadCommentData
          ? AiThreadReplySystemMessage({
              linkedInPostUserInfo: userInfo,
              personalInfo: this.userDetails,
              context,
              threadComment: threadCommentData
            })
          : AiCommentSystemMessage({
              linkedInPostUserInfo: userInfo,
              personalInfo: this.userDetails,
              context
            })
      })
      for await (const chunk of stream) {
        this.setInputValue(
          chunk.choices[0]?.delta?.content || "",
          inputElement,
          true
        )
      }
      this.stopAiProcessing(loaderContainer)
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_EVENT,
          eventName: AnalyticsEventTypes.POST_COMMENT_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
    } catch (error) {
      console.log(error)
      this.showNotification("AI service unavailable", "error")
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_ERROR_EVENT,
          eventName: AnalyticsEventTypes.POST_COMMENT_CREATED,
          eventParams: undefined
        },
        (response) => {}
      )
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
      info.name = nameElement.textContent.trim().split(" ").join(" ")
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
    inputElement: HTMLElement,
    context: ContextType
  ): Promise<void> {
    if (
      this.templates[category].active &&
      !this.templates[category].templates.length
    )
      return this.showNotification(
        `No templates available for "${category}"`,
        "warning"
      )

    try {
      const template: TemplateCategory = this.templates[category]

      template.templates = template.templates.filter(
        (template) => template.active
      )

      // For now, I'll use random selection
      // TODO: Implement template selection dropdown for better UX
      const selectedTemplate =
        template.templates[
          Math.floor(Math.random() * template.templates.length)
        ]

      this.showNotification(`Using "${category}" template...`, "info")

      const userInfo = this.extractUserInfo(inputElement)
      const message = this.processTemplate(selectedTemplate.message, userInfo)

      if (this.userSettings.enableTypingSimulation) {
        if (context === "dm")
          await linkedInTyping.simulateTyping(
            message,
            inputElement,
            this.userSettings
          )
        else await this.typeMessage(message, inputElement)
      } else {
        if (context === "dm") linkedInTyping.setMessage(message, inputElement)
        else this.setInputValue(message, inputElement)
      }
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_EVENT,
          eventName: AnalyticsEventTypes.TEMPLATE_USED,
          eventParams: undefined
        },
        (response) => {}
      )
    } catch (error) {
      console.error("Error handling template reply:", error)
      this.showNotification("Failed to apply template", "error")
      chrome.runtime.sendMessage(
        {
          type: AnalyticsEventTypes.GA_ERROR_EVENT,
          eventName: AnalyticsEventTypes.TEMPLATE_USED,
          eventParams: undefined
        },
        (response) => {}
      )
    }
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
        setTimeout(typeChar, this.userSettings.typingDelay)
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
      }, 2000)
    }, 4000)
  }

  private async updateUsageStats(category: string): Promise<void> {
    const today = new Date().toDateString()
    let currentUsageStats = await chrome.storage.local.get(["usageStats"])
    const stats: UsageStats = currentUsageStats.usageStats
      ? currentUsageStats.usageStats
      : {}
    if (!stats[today]) stats[today] = {}
    if (!stats[today][category]) stats[today][category] = 0

    stats[today][category]++
    stats[today].total = (stats[today].total || 0) + 1

    chrome.storage.local.set({ usageStats: stats })
  }

  // Cleanup on unload
  public destroy(): void {
    this.observer?.disconnect()
    this.activeDropdowns.forEach((dropdown) => dropdown.remove())
    this.activeDropdowns.clear()
    this.messageObserver.disconnect()
    chrome.storage.local.remove("sessionData")
    console.log("LinkedIn Copilot session terminated")
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
