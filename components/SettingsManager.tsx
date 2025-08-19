import React, { useEffect, useRef, useState } from "react"

import { SaveIcon } from "~node_modules/lucide-react/dist/lucide-react"
import { useGlobalState } from "~store/GlobalContext"
import type { TemplateCategory, Theme, UserDetails, UserSettings } from "~types"
import { encryptApiKey, loadFromLocalStorage, saveToLocalStorage } from "~utils"

const hiddenKey = "***************************************"

// Custom Toggle Switch Component
function Toggle({
  checked,
  onChange,
  size = "default"
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: "default" | "small"
}) {
  const sizeClasses = size === "small" ? "h-5 w-9" : "h-6 w-11"
  const thumbClasses =
    size === "small" ? "h-3 w-3 translate-x-5" : "h-4 w-4 translate-x-6"
  const thumbOffClasses = size === "small" ? "translate-x-1" : "translate-x-1"

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`${
        checked ? "bg-brand-blue" : "bg-muted"
      } relative inline-flex ${sizeClasses} items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2`}>
      <span
        className={`${
          checked ? thumbClasses : thumbOffClasses
        } inline-block ${size === "small" ? "h-3 w-3" : "h-4 w-4"} transform rounded-full bg-white transition-transform`}
      />
    </button>
  )
}

// Custom Modal Component
// function Modal({
//   isOpen,
//   onClose,
//   title,
//   children
// }: {
//   isOpen: boolean
//   onClose: () => void
//   title: string
//   children: React.ReactNode
// }) {
//   useEffect(() => {
//     if (isOpen) {
//       document.body.style.overflow = "hidden"
//     } else {
//       document.body.style.overflow = "unset"
//     }

//     return () => {
//       document.body.style.overflow = "unset"
//     }
//   }, [isOpen])

//   if (!isOpen) return null

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="flex min-h-full items-center justify-center p-4">
//         <div
//           className="fixed inset-0 bg-black bg-opacity-25"
//           onClick={onClose}
//         />
//         <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-card border border-border p-6 text-left align-middle shadow-xl transition-all">
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="text-lg font-medium leading-6 text-foreground">
//               {title}
//             </h3>
//             <button
//               onClick={onClose}
//               className="text-muted-foreground hover:text-foreground transition-colors p-1">
//               <svg
//                 className="h-5 w-5"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor">
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M6 18L18 6M6 6l12 12"
//                 />
//               </svg>
//             </button>
//           </div>
//           {children}
//         </div>
//       </div>
//     </div>
//   )
// }

export function SettingsManager() {
  const { userDetails, userSettings, pushNotification, theme, setTheme } =
    useGlobalState()

  const [apiKey, setApiKey] = useState("")

  useEffect(() => {
    const storedApiKey = loadFromLocalStorage<string>("ENCRYPTION_KEY")
    if (storedApiKey) {
      setApiKey(hiddenKey)
    }
  }, [])

  return (
    <div>
      <div className="space-y-10">
        {/* General Settings */}
        <h3 className="text-lg font-semibold text-foreground mb-4">
          General Settings
        </h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Typing Delay (ms)
              </label>
              <input
                type="number"
                value={userSettings.typingDelay}
                onChange={(e) => {
                  const newSettings = {
                    ...userSettings,
                    typingDelay: parseInt(e.target.value)
                  }
                  saveToLocalStorage<UserSettings>("userSettings", newSettings)
                }}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Controls how fast the typing simulation appears (lower = faster)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Toggle
                checked={userSettings.enableTypingSimulation}
                onChange={(checked) => {
                  const newSettings = {
                    ...userSettings,
                    enableTypingSimulation: checked
                  }
                  saveToLocalStorage<UserSettings>("userSettings", newSettings)
                }}
              />
              <label className="text-sm text-foreground">
                Enable typing simulation
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Toggle
                checked={theme === "dark"}
                onChange={(checked) => {
                  const newTheme = checked ? "dark" : "light"
                  setTheme(newTheme as Theme)
                }}
              />
              <label className="text-sm text-foreground">
                Theme ({theme === "dark" ? "Dark" : "Light"})
              </label>
            </div>
          </div>
        </div>

        {/* User Details */}
        <h3 className="text-lg font-semibold text-foreground mb-4">
          User Details
        </h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-muted-foreground mb-4">
            This will be used to personalize your replies to posts. Make it
            detailed and include only important points
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={userDetails.fullName}
                onChange={(e) => {
                  const updatedData = {
                    ...userDetails,
                    fullName: e.target.value
                  }
                  saveToLocalStorage<UserDetails>("userDetails", updatedData)
                }}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Professional Title
              </label>
              <input
                type="text"
                value={userDetails.professionalTitle}
                onChange={(e) => {
                  const updatedData = {
                    ...userDetails,
                    professionalTitle: e.target.value
                  }
                  saveToLocalStorage<UserDetails>("userDetails", updatedData)
                }}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Professional Summary
              </label>
              <textarea
                value={userDetails.professionalSummary}
                onChange={(e) => {
                  const updatedData = {
                    ...userDetails,
                    professionalSummary: e.target.value
                  }
                  saveToLocalStorage<UserDetails>("userDetails", updatedData)
                }}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent font-mono"
                placeholder="A brief summary about you..."
              />
            </div>
          </div>
          {/* <div className="flex justify-end mt-5">
            <button
              //   onClick={() => saveToStorage("userDetails", userDetails)}
              className="flex gap-2 items-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l3-3m-3 3h12"
                />
              </svg>
              Save Settings
            </button>
          </div> */}
        </div>

        {/* API Key */}
        <h3 className="text-lg font-semibold text-foreground mb-4">API Key</h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Groq API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              placeholder="Enter your Groq API key..."
            />
          </div>
          <div className="flex justify-end mt-5">
            <button
              onClick={async () => {
                if (!apiKey || apiKey === hiddenKey) return
                const encryptedKey = await encryptApiKey(apiKey)
                saveToLocalStorage("ENCRYPTION_KEY", encryptedKey)
                setApiKey(hiddenKey)
                pushNotification("API Key saved successfully", "success")
              }}
              className="flex gap-2 items-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4">
                <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                <path d="M7 3v4a1 1 0 0 0 1 1h7" />
              </svg>
              Save API Key
            </button>
          </div>
        </div>

        {/* About Placeholders */}
        <h3 className="text-lg font-semibold text-foreground mb-4">
          About Placeholders
        </h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4">
            <p className="text-foreground mb-2">
              Currently supported placeholder:
            </p>
            <div className="font-mono text-sm bg-background border border-border p-2 rounded">
              {"{{name}}"} - Replaced with the user's first name
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              More placeholders will be added in future updates based on
              available LinkedIn data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
