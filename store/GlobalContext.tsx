import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

import type {
  GlobalState,
  Notification,
  NotificationType,
  TemplateCategory,
  Theme
} from "~types"
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  STORAGE_CHANGE_EVENT
} from "~utils"

const GlobalContext = createContext<GlobalState | undefined>(undefined)

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("light")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [templates, setTemplates] = useState<Record<string, TemplateCategory>>(
    {}
  )

  useEffect(() => {
    const storedTheme = loadFromLocalStorage<Theme>("theme")
    if (storedTheme) {
      applyTheme(storedTheme as Theme)
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
      applyTheme(prefersDark ? "dark" : "light")
    }
  }, [])

  useEffect(() => {
    const storedTemplates =
      loadFromLocalStorage<Record<string, TemplateCategory>>("templates")
    if (storedTemplates) {
      setTemplates(storedTemplates)
    }

    // Handle both cross-tab storage events and same-tab custom events
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "templates") {
        const updatedTemplates = JSON.parse(event.newValue || "{}")
        setTemplates(updatedTemplates)
      }
    }

    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail.key === "templates") {
        const updatedTemplates = JSON.parse(event.detail.newValue || "{}")
        setTemplates(updatedTemplates)
      }
    }

    // Listen for both types of events
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener(
      STORAGE_CHANGE_EVENT,
      handleCustomStorageChange as EventListener
    )

    return () => {
      window.removeEventListener("storage", handleStorageChange)
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
        templates
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
