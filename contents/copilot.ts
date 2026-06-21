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
    // LinkedIn's feed class names are hashed and rotate on each deploy, so
    // we rely on aria-label instead. LinkedIn has to keep that stable for
    // accessibility. If this breaks, check whether the aria-label changed.
    const COMMENT_EDITOR_SELECTOR =
      '[contenteditable="true"][aria-label="Text editor for creating comment"]'

    const commentBoxes = Array.from(
      container.querySelectorAll(COMMENT_EDITOR_SELECTOR)
    )

    // DM pages still use stable class names, so no changes needed there.
    const dmBoxes = container.querySelectorAll(
      ".msg-form__contenteditable[contenteditable='true']"
    )
    if (dmBoxes.length > 0) {
      this.attachPilotToDmBoxes(dmBoxes[0] as HTMLElement, "dm")
    }

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
    dropdown.style.display = "none"

    // The form wrapper and the comments section are siblings inside the post card.
    // Inserting our bar before the comments section puts it cleanly below the
    // entire form without touching any of LinkedIn's internal input structure.
    const postCard = inputElement.closest('[role="listitem"]')
    const commentsSection = postCard?.querySelector(
      '[componentkey^="commentsSectionContainer"]'
    )

    if (commentsSection) {
      commentsSection.insertAdjacentElement("beforebegin", dropdown)
    } else if (postCard) {
      // Comments not loaded yet — append to the post card as a fallback.
      // Not pixel-perfect, but it won't break the input.
      postCard.appendChild(dropdown)
    }

    inputElement.addEventListener("focus", () => {
      this.showDropdown(dropdown)
    })

    // Show immediately if the element is already focused when we attach
    if (document.activeElement === inputElement) {
      this.showDropdown(dropdown)
    }
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
    // role="listitem" is a semantic HTML attribute on each feed post card —
    // safe to use as a stable ancestor anchor.
    const postCard = inputElement.closest('[role="listitem"]')
    if (!postCard) return ""

    // First [data-testid="expandable-text-box"] inside the card is the post body.
    const postTextEl = postCard.querySelector(
      '[data-testid="expandable-text-box"]'
    )
    return postTextEl?.textContent?.trim() || ""
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
      // Don't nuke the @mention tag if the user just clicked Reply and the
      // box only has a name in it — only clear if there's actual previous content.
      const possibleReplyToNameInInput =
        inputElement.textContent.trim().length <= 30
      if (!possibleReplyToNameInInput) {
        this.setInputValue("", inputElement)
      }
      const loaderContainer = (inputElement.closest(
        '[data-testid="ui-core-tiptap-text-editor-wrapper"]'
      ) ?? inputElement) as HTMLElement
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

    const postCard = inputElement.closest('[role="listitem"]')
    if (!postCard) return {}

    // Profile links always point to /in/ — first one with a name inside
    // is the post author. <strong> is preferred; span is the fallback.
    const actorNameEl =
      postCard.querySelector('a[href*="/in/"] strong') ??
      postCard.querySelector('a[href*="/in/"] span:not([aria-hidden])')
    if (actorNameEl?.textContent) {
      info.name = actorNameEl.textContent.trim()
    }

    // Headline lives a couple of levels above the name element.
    // Second <p> in that block is usually the job title.
    const actorLink = actorNameEl?.closest('a[href*="/in/"]')
    const actorBlock = actorLink?.parentElement?.parentElement
    if (actorBlock) {
      const descParagraphs = actorBlock.querySelectorAll("p")
      if (descParagraphs.length > 1) {
        info.desc = descParagraphs[1].textContent?.trim() || ""
      }
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
      inputElement.dispatchEvent(new Event("input", { bubbles: true }))
      inputElement.dispatchEvent(new Event("change", { bubbles: true }))
      return
    }

    // LinkedIn switched to TipTap/ProseMirror, so the old innerHTML trick
    // stopped working. execCommand is technically deprecated but still the
    // only cross-browser way to push text into a ProseMirror editor without
    // reaching into its internals. Works until it doesn't, fingers crossed.
    if (!append) {
      document.execCommand("selectAll", false, null)
      document.execCommand("delete", false, null)
    }
    if (message) {
      document.execCommand("insertText", false, message)
    }

    inputElement.dispatchEvent(
      new InputEvent("input", { bubbles: true, cancelable: true })
    )
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
