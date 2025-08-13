import React, { createContext, useContext, useEffect, useState } from "react"

import type { GlobalState, Notification, NotificationType, Theme } from "~types"

const GlobalContext = createContext<GlobalState | undefined>(undefined)

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("light")
  const [notifications, setNotifications] = useState<Notification[]>([])

  // On first load, honor stored preference (or system preference)
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme")
    if (storedTheme) {
      applyTheme(storedTheme as Theme)
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
      applyTheme(prefersDark ? "dark" : "light")
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
    localStorage.setItem("theme", newTheme)
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
        removeNotification
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
