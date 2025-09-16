import { Moon, Sun } from "lucide-react"

import { useGlobalState } from "~store/GlobalContext"

export const ThemeToggle = () => {
  const { theme, setTheme } = useGlobalState()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center p-2 hover:scale-105 transition-all"
      aria-label="Toggle theme">
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-gray-500" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600" />
      )}
    </button>
  )
}
