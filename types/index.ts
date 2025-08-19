export type Theme = "light" | "dark"
export type NotificationType = "success" | "error" | "info"

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

export type ContextType = "feed" | "dm" | "connection" | "post"
