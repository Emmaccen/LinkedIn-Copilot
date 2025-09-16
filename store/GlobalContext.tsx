import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

import type {
  GlobalState,
  Notification,
  NotificationType,
  TemplateCategory,
  Theme,
  UserDetails,
  UserSettings
} from "~types"
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  STORAGE_CHANGE_EVENT
} from "~utils"

const GlobalContext = createContext<GlobalState | undefined>(undefined)

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("light")
  const [userSettings, setUserSettings] = useState<UserSettings>({
    typingDelay: 40,
    enableTypingSimulation: true
  })
  const [userDetails, setUserDetails] = useState<UserDetails>({
    fullName: "",
    professionalTitle: "",
    professionalSummary: ""
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [templates, setTemplates] = useState<Record<string, TemplateCategory>>(
    {}
  )

  useEffect(() => {
    loadFromLocalStorage<UserSettings>("userSettings").then(
      (storedUserSettings) => {
        if (storedUserSettings) setUserSettings(storedUserSettings)
      }
    )
    loadFromLocalStorage<UserDetails>("userDetails").then(
      (storedUserDetails) => {
        if (storedUserDetails) setUserDetails(storedUserDetails)
      }
    )
    loadFromLocalStorage<Record<string, TemplateCategory>>("templates").then(
      (storedTemplates) => {
        if (storedTemplates) setTemplates(storedTemplates)
      }
    )
    loadFromLocalStorage<Theme>("theme").then((storedTheme) => {
      if (storedTheme) {
        applyTheme(storedTheme)
      } else {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches
        applyTheme(prefersDark ? "dark" : "light")
      }
    })
  }, [])

  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: "sync" | "local" | "managed" | "session"
    ) => {
      if (namespace === "local") {
        if (changes["templates"]) {
          const updatedTemplates = JSON.parse(
            changes["templates"].newValue || "{}"
          ) as Record<string, TemplateCategory>
          setTemplates(updatedTemplates)
        }
        if (changes["userSettings"]) {
          const newUserSettings = JSON.parse(
            changes["userSettings"].newValue || "{}"
          ) as UserSettings
          setUserSettings(newUserSettings)
        }
        if (changes["userDetails"]) {
          const newUserDetails = JSON.parse(
            changes["userDetails"].newValue || "{}"
          ) as UserDetails
          setUserDetails(newUserDetails)
        }
      }
    }

    // Handle custom events
    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail.key === "templates") {
        const updatedTemplates = JSON.parse(
          event.detail.newValue || "{}"
        ) as Record<string, TemplateCategory>
        setTemplates(updatedTemplates)
      }
      if (event.detail.key === "theme") {
        // const newTheme = event.detail.newValue as Theme
        // applyTheme(newTheme)
      }
      if (event.detail.key === "userSettings") {
        const newUserSettings = JSON.parse(
          event.detail.newValue || "{}"
        ) as UserSettings
        setUserSettings(newUserSettings)
      }
      if (event.detail.key === "userDetails") {
        const newUserDetails = JSON.parse(
          event.detail.newValue || "{}"
        ) as UserDetails
        setUserDetails(newUserDetails)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    window.addEventListener(
      STORAGE_CHANGE_EVENT,
      handleCustomStorageChange as EventListener
    )

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
      window.removeEventListener(
        STORAGE_CHANGE_EVENT,
        handleCustomStorageChange as EventListener
      )
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    saveToLocalStorage<string>("theme", newTheme)
  }

  const pushNotification = (
    message: string,
    type: NotificationType = "info"
  ) => {
    const id = crypto.randomUUID()
    setNotifications((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeNotification(id), 4000)
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const setTheme = (newTheme: Theme) => applyTheme(newTheme)

  return (
    <GlobalContext.Provider
      value={{
        theme,
        setTheme,
        notifications,
        pushNotification,
        removeNotification,
        templates,
        userSettings,
        userDetails
      }}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobalState = (): GlobalState => {
  const context = useContext(GlobalContext)
  if (!context) {
    throw new Error("useGlobalState must be used within a Provider")
  }
  return context
}
