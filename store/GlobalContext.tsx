import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

type GlobalState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const GlobalContext = createContext<GlobalState | undefined>(undefined)

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("light")

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

  const setTheme = (newTheme: Theme) => applyTheme(newTheme)

  return (
    <GlobalContext.Provider value={{ theme, setTheme }}>
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
