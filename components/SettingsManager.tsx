import { useEffect, useState } from "react"

import FeedbackModal from "~components/FeedbackModal"
import { useGlobalState } from "~store/GlobalContext"
import type { Theme, UserDetails, UserSettings } from "~types"
import {
  ENCRYPTION_KEY_NAME,
  loadFromLocalStorage,
  saveEncryptedApiKey,
  saveToLocalStorage
} from "~utils"

const hiddenKey = "***************************************"

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

export function SettingsManager() {
  const { userDetails, userSettings, pushNotification, theme, setTheme } =
    useGlobalState()
  const [userDetailsLocal, setUserDetailsLocal] =
    useState<UserDetails>(userDetails)

  const [apiKey, setApiKey] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    loadFromLocalStorage<string>(ENCRYPTION_KEY_NAME).then((storedApiKey) => {
      if (storedApiKey) {
        setApiKey(hiddenKey)
      }
    })
  }, [])

  return (
    <div>
      <div className="space-y-10">
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

        <h3 className="text-lg font-semibold text-foreground mb-4">
          User Details
        </h3>
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-muted-foreground mb-4">
            This personalizes all AI actions. Make it detailed and include only
            important points
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={userDetailsLocal.fullName}
                placeholder="It is important that this matches what you have on your LinkedIn profile"
                onChange={(e) => {
                  const updatedData = {
                    ...userDetailsLocal,
                    fullName: e.target.value
                  }
                  setUserDetailsLocal(updatedData)
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
                value={userDetailsLocal.professionalTitle}
                placeholder="e.g Senior Director of sales | Google"
                onChange={(e) => {
                  const updatedData = {
                    ...userDetailsLocal,
                    professionalTitle: e.target.value
                  }
                  setUserDetailsLocal(updatedData)
                }}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Professional Summary
              </label>
              <textarea
                value={userDetailsLocal.professionalSummary}
                onChange={(e) => {
                  const updatedData = {
                    ...userDetailsLocal,
                    professionalSummary: e.target.value
                  }
                  setUserDetailsLocal(updatedData)
                }}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent font-mono"
                placeholder="A brief summary about you..."
              />
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={async () => {
                  if (!userDetailsLocal) return
                  await saveToLocalStorage<UserDetails>(
                    "userDetails",
                    userDetailsLocal
                  )

                  pushNotification("user details updated", "success")
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
                Save Details
              </button>
            </div>
          </div>
        </div>

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
                await saveEncryptedApiKey(apiKey)
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
        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Help & Feedback
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <h4 className="font-medium text-foreground">
                  Share Your Experience
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Help us improve LinkedIn Copilot with your feedback and
                  suggestions
                </p>
              </div>
              <button
                onClick={() => setShowFeedback(true)}
                className="px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-ring">
                Send Feedback
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <h4 className="font-medium text-foreground">Report Issues</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Found a bug or technical issue? Report it directly on GitHub
                </p>
              </div>
              <a
                href="https://github.com/emmaccen/linkedin-copilot/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
                View Issues
              </a>
            </div>
          </div>
        </div>
        <FeedbackModal
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
        />
      </div>
    </div>
  )
}
