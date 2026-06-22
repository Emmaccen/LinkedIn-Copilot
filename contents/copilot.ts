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
  type PostCommentThreadItem,
  type TemplateCategory,
  type UsageStats,
  type UserDetails,
  type UserInfo,
  type UserSettings
} from "~types"
import {
  extractAuthorName,
  extractSingleComment,
  findAllInShadows,
  findClosestIncludingShadows,
  findClosestPrecedingComment,
  findCommentByUrn,
  findInShadows,
  formatPostCommentThreadItems,
  getCommentIndentation
} from "~utils"

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/*"],
  all_frames: false
}

const POST_CARD_SELECTOR =
  '[role="listitem"], [aria-label="Primary content"], [role="article"], .feed-shared-update-v2, article, .feed-shared-update-detail-viewer__overflow-content, .feed-shared-update-detail-viewer__right-panel'

class LinkedinCopilot {
  private templates: Record<string, TemplateCategory>
  private userSettings: UserSettings
  private activeDropdowns: Set<HTMLElement> = new Set()
  private observer: MutationObserver
  private observedShadowRoots: WeakSet<ShadowRoot> = new WeakSet()
  private shadowObservers: MutationObserver[] = []
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
    this.attachWritePostWithAiUI(document.body)
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
    const selector =
      "[contenteditable='true'][aria-label='Text editor for creating content'], [contenteditable='true'].ql-editor, [contenteditable='true'][data-placeholder*='thoughts']"
    const postInputBox = (
      element.matches?.(selector) ? element : findInShadows(selector, element)
    ) as HTMLElement

    if (postInputBox && !postInputBox.hasAttribute("data-copilot-attached")) {
      postInputBox.setAttribute("data-copilot-attached", "true")

      const container = findClosestIncludingShadows(
        postInputBox,
        ".share-box, dialog, [role='dialog']"
      )
      let attached = false

      if (container) {
        // Try inserting into the detour button carousel slider
        const slider = findInShadows(".artdeco-carousel__slider", container)
        if (slider) {
          if (!findInShadows(".copilot-detour-item", slider)) {
            const li = document.createElement("li")
            li.className =
              "artdeco-carousel__item share-creation-state__promoted-detour-button-item copilot-detour-item"
            li.setAttribute("tabindex", "-1")
            li.style.width = "auto"
            li.style.marginRight = "8px"
            li.style.display = "inline-flex"
            li.style.alignItems = "center"

            li.innerHTML = `
              <div class="artdeco-carousel__item-container">
                <div class="display-flex align-items-center">
                  <button class="artdeco-button artdeco-button--muted artdeco-button--1 artdeco-button--secondary copilot-post-ai-btn" type="button" style="border: 1px dashed var(--color-brand, #0a66c2) !important; background: rgba(10, 102, 194, 0.05) !important;">
                    <span class="artdeco-button__text">
                      <span class="display-flex align-items-center text-body-medium-bold" style="gap: 4px; color: var(--color-brand, #0a66c2) !important;">
                        <span>✨</span>
                        Write with AI
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            `
            const btn = li.querySelector(
              ".copilot-post-ai-btn"
            ) as HTMLButtonElement
            btn.addEventListener("click", async (e) => {
              e.preventDefault()
              await this.writeFeedPostWithAi(postInputBox)
            })
            slider.insertBefore(li, slider.firstChild)
            attached = true
          } else {
            attached = true
          }
        }

        // Fallback 1: Try inserting into the footer next to schedule/post buttons
        if (!attached) {
          const footer = findInShadows(
            ".share-creation-state__schedule-and-post-container, .share-box_actions, .share-box__actions",
            container
          )
          if (footer) {
            if (!findInShadows(".copilot-post-ai-btn", footer)) {
              const btn = document.createElement("button")
              btn.className =
                "artdeco-button artdeco-button--muted artdeco-button--1 artdeco-button--secondary copilot-post-ai-btn"
              btn.type = "button"
              btn.style.marginRight = "8px"
              btn.style.border =
                "1px dashed var(--color-brand, #0a66c2) !important"
              btn.style.background = "rgba(10, 102, 194, 0.05) !important"
              btn.innerHTML = `
                <span class="artdeco-button__text">
                  <span class="display-flex align-items-center text-body-medium-bold" style="gap: 4px; color: var(--color-brand, #0a66c2) !important;">
                    <span>✨</span>
                    Write with AI
                  </span>
                </span>
              `
              btn.addEventListener("click", async (e) => {
                e.preventDefault()
                await this.writeFeedPostWithAi(postInputBox)
              })
              footer.insertBefore(btn, footer.firstChild)
              attached = true
            } else {
              attached = true
            }
          }
        }
      }

      // Fallback 2: Insert tip container cleanly before the editor container (original behavior)
      if (!attached) {
        const writeWithAiTip = document.createElement("div")
        writeWithAiTip.className = "writeWithAiTip"
        writeWithAiTip.innerHTML = `
          <span class="writeWithAiTipText">Linkedin Copilot is enabled. Describe your post and click the button to generate/edit content.</span>
          <button class="writeWithAiButton">Pilot ✨</button>
        `
        const writeWithAiButtonAction = writeWithAiTip.querySelector(
          ".writeWithAiButton"
        ) as HTMLButtonElement
        writeWithAiButtonAction.addEventListener("click", async (e) => {
          e.preventDefault()
          await this.writeFeedPostWithAi(postInputBox)
        })

        const insertionPoint =
          findClosestIncludingShadows(postInputBox, ".editor-content") ||
          postInputBox.parentElement
        if (insertionPoint) {
          insertionPoint.insertAdjacentElement("beforebegin", writeWithAiTip)
        } else if (postInputBox.parentNode) {
          postInputBox.parentNode.insertBefore(writeWithAiTip, postInputBox)
        }
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

  private async writeFeedPostWithAi(inputElement: HTMLElement): Promise<void> {
    if (!inputElement) return
    const container =
      findClosestIncludingShadows(inputElement, ".share-box") ||
      inputElement.parentElement ||
      inputElement
    this.startAiProcessing(container as HTMLElement)

    const textContent = inputElement.textContent?.trim() || ""
    if (!textContent) {
      this.stopAiProcessing(container as HTMLElement)
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
      this.setInputValue(htmlMessage, inputElement, false, true)

      this.stopAiProcessing(container as HTMLElement)
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
      this.stopAiProcessing(container as HTMLElement)
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
          !!findInShadows(
            ".msg-form__contenteditable[contenteditable='true']",
            element
          )
      )
      if (!dmContainer) return

      const dmInput = findInShadows(
        ".msg-form__contenteditable[contenteditable='true']",
        dmContainer
      ) as HTMLElement
      if (!dmInput) return
      const loaderContainer = findClosestIncludingShadows(
        dmInput,
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
    const callback = () => {
      this.scanForInputs(document.body)
      this.attachWritePostWithAiUI(document.body)
      this.observeNewShadowRoots()
    }

    this.observer = new MutationObserver(callback)

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    this.observeNewShadowRoots()
  }

  private observeNewShadowRoots(): void {
    const shadowHosts = this.findAllShadowHosts(document.body)
    shadowHosts.forEach((host) => {
      if (host.shadowRoot && !this.observedShadowRoots.has(host.shadowRoot)) {
        this.observedShadowRoots.add(host.shadowRoot)

        const shadowObserver = new MutationObserver(() => {
          this.scanForInputs(document.body)
          this.attachWritePostWithAiUI(document.body)
          this.observeNewShadowRoots()
        })

        shadowObserver.observe(host.shadowRoot, {
          childList: true,
          subtree: true
        })

        this.shadowObservers.push(shadowObserver)
      }
    })
  }

  private findAllShadowHosts(startNode: Node = document.body): Element[] {
    const hosts: Element[] = []

    function walk(node: Node) {
      if (node instanceof Element) {
        if (node.shadowRoot) {
          hosts.push(node)
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
    return hosts
  }

  private scanForInputs(container: Element = document as any as Element): void {
    const COMMENT_EDITOR_SELECTOR =
      '[contenteditable="true"][aria-label="Text editor for creating comment"]'

    const commentBoxes = findAllInShadows(COMMENT_EDITOR_SELECTOR, container)

    const dmBoxes = findAllInShadows(
      ".msg-form__contenteditable[contenteditable='true']",
      container
    )
    if (dmBoxes.length > 0) {
      this.attachPilotToDmBoxes(dmBoxes[0] as HTMLElement, "dm")
    }

    commentBoxes.forEach((box) => {
      const commentItem = findClosestIncludingShadows(
        box,
        'div[componentkey^="replaceableComment_"]'
      )

      let isSubReply = !!commentItem
      let commenterName = commentItem ? extractAuthorName(commentItem).name : ""
      let threadUrn = commentItem?.getAttribute("componentkey") ?? ""

      // Flat-DOM case: reply box is a sibling of replaceableComment_ divs (not nested inside)
      // Detect it by the @mention span or placeholder containing "reply"
      if (!isSubReply) {
        const mentionEl = box.querySelector('span[data-type="mention"]')
        const placeholder =
          box
            .querySelector("[data-placeholder]")
            ?.getAttribute("data-placeholder") ||
          box.getAttribute("data-placeholder") ||
          ""

        if (mentionEl || /reply/i.test(placeholder)) {
          isSubReply = true
          if (!commenterName && mentionEl) {
            commenterName = mentionEl.textContent?.trim() || ""
          }
          // For flat-DOM, locate the LazyColumn and find the nearest preceding replaceableComment_
          threadUrn = this.findNearestCommentUrn(box as HTMLElement)
          if (threadUrn && !commenterName) {
            const searchRoot =
              findClosestIncludingShadows(
                box,
                'dialog, [role="dialog"], section, main'
              ) ?? document.body
            const targetCommentEl = findCommentByUrn(threadUrn, searchRoot)
            if (targetCommentEl) {
              commenterName = extractAuthorName(targetCommentEl).name
            }
          }
        }
      }

      if (isSubReply) {
        box.setAttribute("is-sub-reply", "true")
        if (commenterName) {
          box.setAttribute("replying-to", commenterName)
        }
        if (threadUrn) {
          box.setAttribute("thread-comment-urn", threadUrn)
        }
      }

      this.attachDropdown(box as HTMLElement, "feed")
    })
  }

  /**
   * For a flat-DOM reply input (sibling of replaceableComment_ divs),
   * find the URN of the nearest preceding comment within the same LazyColumn.
   */
  private findNearestCommentUrn(inputEl: HTMLElement): string {
    // Walk up to find the LazyColumn or its wrapping container
    const lazyColumn = findClosestIncludingShadows(
      inputEl,
      '[data-component-type="LazyColumn"]'
    ) as HTMLElement | null

    const searchRoot =
      lazyColumn ?? (this.getPostCard(inputEl) as HTMLElement | null)
    if (!searchRoot) return ""

    // Collect all top-level replaceableComment_ elements in this container
    // "Top-level" means not nested inside another replaceableComment_
    const allCommentEls = findAllInShadows(
      'div[componentkey^="replaceableComment_"]',
      searchRoot
    )

    const topLevel = allCommentEls.filter((el) => {
      const key = el.getAttribute("componentkey")
      const parent = el.parentElement
      return (
        key &&
        !(
          parent &&
          findClosestIncludingShadows(parent, `div[componentkey="${key}"]`)
        )
      )
    })

    if (!topLevel.length) return ""

    // Find the last one that comes before the inputEl in DOM order
    let best: Element | null = null
    for (const commentEl of topLevel) {
      const pos = commentEl.compareDocumentPosition(inputEl)
      // DOCUMENT_POSITION_FOLLOWING means inputEl comes AFTER commentEl
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = commentEl
      }
    }

    return best?.getAttribute("componentkey") ?? ""
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

    const composeForm = findClosestIncludingShadows(
      inputElement,
      '[componentkey^="commentBox-"]'
    )
    if (composeForm) {
      composeForm.appendChild(dropdown)
    } else {
      inputElement.insertAdjacentElement("afterend", dropdown)
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

    const inputContainer = findClosestIncludingShadows(
      inputElement,
      ".msg-form__msg-content-container"
    ) as HTMLElement

    if (inputContainer) {
      inputContainer.insertAdjacentElement("afterend", dropdown)
    }
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
            const replyingTo = inputElement.getAttribute("replying-to")
            const threadUrn = inputElement.getAttribute("thread-comment-urn")

            // Find the target comment we are replying to (the closest preceding comment in DOM order,
            // or the closest ancestor comment in nested layout)
            const innermostComment = findClosestIncludingShadows(
              inputElement,
              'div[componentkey^="replaceableComment_"]'
            ) as HTMLElement | null

            let targetCommentEl = innermostComment
            if (innermostComment) {
              const key = innermostComment.getAttribute("componentkey")
              if (key) {
                targetCommentEl =
                  findCommentByUrn(key, document.body) ?? innermostComment
              }
            } else {
              const searchRoot =
                findClosestIncludingShadows(
                  inputElement,
                  'dialog, [role="dialog"], section, main'
                ) ?? document.body
              targetCommentEl = findClosestPrecedingComment(
                inputElement,
                searchRoot
              )
            }

            // Collect all unique thread comments in chronological order starting from the
            // top-level comment (resolved by walking backward to the first non-indented comment)
            // up to the target comment we are replying to.
            let threadComments: HTMLElement[] = []
            const searchRoot =
              findClosestIncludingShadows(
                inputElement,
                'dialog, [role="dialog"], section, main'
              ) ?? document.body

            if (targetCommentEl) {
              const allComments = findAllInShadows(
                'div[componentkey^="replaceableComment_"]',
                searchRoot
              ) as HTMLElement[]

              const uniqueComments: HTMLElement[] = []
              const seenKeys = new Set<string>()
              allComments.forEach((el) => {
                const key = el.getAttribute("componentkey")
                if (key && !seenKeys.has(key)) {
                  const parent = el.parentElement
                  const isOutermost =
                    !parent ||
                    !findClosestIncludingShadows(
                      parent,
                      `div[componentkey="${key}"]`
                    )
                  if (isOutermost) {
                    uniqueComments.push(el)
                    seenKeys.add(key)
                  }
                }
              })

              const targetIndex = uniqueComments.indexOf(targetCommentEl)
              if (targetIndex !== -1) {
                // Walk backward from the target to find the top-level comment (first non-indented comment)
                let startIndex = targetIndex
                for (let i = targetIndex; i >= 0; i--) {
                  if (getCommentIndentation(uniqueComments[i]) === 0) {
                    startIndex = i
                    break
                  }
                }
                threadComments = uniqueComments.slice(
                  startIndex,
                  targetIndex + 1
                )
              } else {
                threadComments = [targetCommentEl]
              }
            } else if (threadUrn) {
              const topLevelEl = findCommentByUrn(threadUrn, searchRoot)
              if (topLevelEl) {
                threadComments = [topLevelEl]
              }
            }

            // Extract the text/name of each comment element in the thread
            const comments: PostCommentThreadItem[] = []
            threadComments.forEach((el) => {
              const single = extractSingleComment(el)
              if (single) {
                comments.push(single)
              }
            })

            let formattedCommentForAi: string | undefined
            if (comments.length) {
              formattedCommentForAi = formatPostCommentThreadItems(comments)
              if (replyingTo) {
                formattedCommentForAi += `\nYou are replying to: ${replyingTo}`
              }
            }

            if (replyingTo) {
              this.showNotification(`Replying to ${replyingTo}`, "info")
            }

            await this.ReplyPostCommentWithAI(
              inputElement,
              context,
              formattedCommentForAi
            )
          } else await this.ReplyPostCommentWithAI(inputElement, context)
        }
      }
    } else {
      await this.handleTemplateReply(action.category, inputElement, context)
    }
  }

  private getPostCard(inputElement: HTMLElement): HTMLElement | null {
    // 1. Direct parent/ancestor
    let postCard = findClosestIncludingShadows(
      inputElement,
      POST_CARD_SELECTOR
    ) as HTMLElement
    if (postCard) return postCard

    // 2. Inside an active dialog/modal
    const dialog =
      findClosestIncludingShadows(inputElement, 'dialog, [role="dialog"]') ||
      findInShadows('dialog, [role="dialog"]')
    if (dialog) {
      postCard = findInShadows(POST_CARD_SELECTOR, dialog) as HTMLElement
      return postCard || (dialog as HTMLElement)
    }

    // 3. Fallback: if we are inside a sub-reply or comment sibling (flat DOM),
    // find the top-level comment editor on the page/dialog and resolve its post card.
    // Since the top-level comment box is always inside the post card, this is 100% reliable.
    const searchRoot = dialog || document.body
    const allInputs = findAllInShadows(
      '[contenteditable="true"][aria-label="Text editor for creating comment"]',
      searchRoot
    ) as HTMLElement[]
    const topLevelInput = allInputs[0]

    if (topLevelInput && topLevelInput !== inputElement) {
      const card = findClosestIncludingShadows(
        topLevelInput,
        POST_CARD_SELECTOR
      ) as HTMLElement | null
      if (card) return card
    }

    // 4. Check if we are in a main content container (like section or main or scaffold-layout)
    // and look for the post card inside that.
    const mainContainer = findClosestIncludingShadows(
      inputElement,
      "main, section, .scaffold-layout__main"
    )
    if (mainContainer) {
      postCard = findInShadows(POST_CARD_SELECTOR, mainContainer) as HTMLElement
      if (postCard) return postCard
    }

    // 5. Ultimate fallback: find the first post card in the entire document (useful for single post detail views)
    postCard = findInShadows(POST_CARD_SELECTOR) as HTMLElement
    if (postCard) return postCard

    return null
  }

  private extractPostContent(inputElement: HTMLElement): string {
    const postCard = this.getPostCard(inputElement)
    if (!postCard) return ""

    // First [data-testid="expandable-text-box"] inside the card is the post body.
    const postTextEl = findInShadows(
      '[data-testid="expandable-text-box"]',
      postCard
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
      const loaderContainer = findClosestIncludingShadows(
        inputElement,
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
      const loaderContainer = (findClosestIncludingShadows(
        inputElement,
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

    const postCard = this.getPostCard(inputElement)
    if (!postCard) return {}

    const { name, link: actorLink } = extractAuthorName(postCard)
    if (name) {
      info.name = name
    } else {
      const nameElement = postCard.querySelector(
        ".update-components-actor__title, .feed-shared-actor__title"
      )
      if (nameElement?.textContent) {
        info.name = nameElement.textContent.trim()
      }
    }

    if (actorLink) {
      let ancestor: Node | null = actorLink.parentNode
      let descEl: HTMLElement | null = null
      while (ancestor && ancestor !== postCard) {
        if (ancestor instanceof ShadowRoot) {
          ancestor = ancestor.host
          continue
        }
        if (ancestor instanceof HTMLElement) {
          const paragraphs = findAllInShadows(
            "p",
            ancestor
          ) as HTMLParagraphElement[]
          const found = paragraphs.find((p) => {
            const text = p.textContent?.trim() || ""
            if (!text) return false

            // Filter out name
            if (info.name && (text === info.name || text.includes(info.name)))
              return false

            // Filter out connection states (e.g. "1st", "2nd", "3rd", "• 2nd")
            if (/^(?:•\s*)?\d+(?:st|nd|rd|th)\b/i.test(text)) return false

            // Filter out suggested/promoted
            const lowerText = text.toLowerCase()
            if (
              lowerText === "suggested" ||
              lowerText === "promoted" ||
              lowerText === "sponsored"
            )
              return false

            // Filter out timestamps (e.g. "3d", "8h", "3d • Edited")
            const isTimestamp =
              /^\d+[smhdwy]\b/i.test(text) ||
              (text.includes("•") && text.length < 30) ||
              (text.toLowerCase().includes("edited") && text.length < 30)
            if (isTimestamp) return false

            return true
          })

          if (found) {
            descEl = found
            break
          }
        }
        ancestor = ancestor.parentNode
      }

      if (descEl) {
        info.desc = descEl.textContent?.trim() || ""
      }
    }

    if (!info.desc) {
      const userDesc = postCard.querySelector(
        ".update-components-actor__description, .feed-shared-actor__description"
      )
      if (userDesc?.textContent) {
        info.desc = userDesc.textContent.trim()
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
      console.log(userInfo)
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
    dropdown.style.display = "grid"
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
    append = false,
    isHtml = false
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
      if (isHtml) {
        document.execCommand("insertHTML", false, message)
      } else {
        document.execCommand("insertText", false, message)
      }
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
    this.shadowObservers.forEach((obs) => obs.disconnect())
    this.shadowObservers = []
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
