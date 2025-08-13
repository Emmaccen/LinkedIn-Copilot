export type Theme = "light" | "dark"
export type NotificationType = "success" | "error" | "info"

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
}

export interface Templates {
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
  templates: Templates[]
}

export type ContextType = "feed" | "dm" | "connection" | "post"
