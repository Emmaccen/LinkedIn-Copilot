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

export enum AnalyticsEventTypes {
  "AI_POST_CREATED" = "AI_POST_CREATED",
  "AI_DM_SINGLE_REPLY_CREATED" = "AI_DM_SINGLE_REPLY_CREATED",
  "AI_DM_CHAT_HISTORY_REPLY_CREATED" = "AI_DM_CHAT_HISTORY_REPLY_CREATED",
  "TEMPLATE_USED" = "TEMPLATE_USED",
  "POST_COMMENT_CREATED" = "POST_COMMENT_CREATED",
  "GA_EVENT" = "GA_EVENT",
  "GA_ERROR_EVENT" = "GA_ERROR_EVENT"
}

export interface GAUserInfo {
  user_agent: string
  language: string
  timezone: string
  country: string
  country_code: string
  region: string
  city: string
  timestamp: number
  region_code: string
}

export interface LocationInfo {
  ip: string
  network: string
  version: string
  city: string
  region: string
  region_code: string
  country: string
  country_name: string
  country_code: string
  country_code_iso3: string
  country_capital: string
  country_tld: string
  continent_code: string
  in_eu: boolean
  postal: any
  latitude: number
  longitude: number
  timezone: string
  utc_offset: string
  country_calling_code: string
  currency: string
  currency_name: string
  languages: string
  country_area: number
  country_population: number
  asn: string
  org: string
}
