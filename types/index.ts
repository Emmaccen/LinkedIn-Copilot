export type Theme = "light" | "dark"
export type NotificationType = "success" | "error" | "info" | "warning"

export interface UserSettings {
  typingDelay: number
  enableTypingSimulation: boolean
}
export interface UserDetails {
  fullName: string
  professionalTitle: string
  professionalSummary: string
}
export interface Notification {
  id: string
  message: string
  type: NotificationType
}

export type GlobalState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  notifications?: Notification[]
  pushNotification?: (message: string, type?: NotificationType) => void
  removeNotification?: (id: string) => void
  templates?: Record<string, TemplateCategory>
  userDetails: UserDetails
  userSettings: UserSettings
}

export interface Template {
  id: string
  message: string
  aiGenerated: boolean
  active: boolean
  placeholders: string[]
}
export interface TemplateCategory {
  active: boolean
  context: ContextType[]
  icon: string
  templates: Template[]
}
export interface DropdownAction {
  id: string
  label: string
  icon: string
  category: string
}

export interface UserInfo {
  name?: string
  desc?: string
  [key: string]: string | undefined
}

export interface UsageStats {
  [date: string]: {
    [category: string]: number
    total?: number
  }
}

export interface AiDMChatMessage {
  sender: string
  text: string
  timestamp: string
  isOtherPerson: boolean
  element: Element
}

export interface AiDMChatContext {
  messages: AiDMChatMessage[]
  totalCharacters: number
  truncated: boolean
}

export type ContextType = "feed" | "dm" | "connection" | "post"
