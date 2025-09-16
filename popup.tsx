import { useEffect, useState } from "react"

import "./styles.css"

import { Stats } from "~components/Stats"
import { GlobalProvider } from "~store/GlobalContext"
import { ENCRYPTION_KEY_NAME, loadFromLocalStorage } from "~utils"

const Popup = () => {
  const [isAiConfigured, setIsAiConfigured] = useState(false)

  useEffect(() => {
    loadFromLocalStorage<string>(ENCRYPTION_KEY_NAME).then((storedApiKey) => {
      if (storedApiKey) setIsAiConfigured(true)
      else setIsAiConfigured(false)
    })
  }, [])

  return (
    <div className="w-[600px] mx-auto p-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">LinkedIn Copilot</h1>
        </div>
        <p className="text-muted-foreground text-sm flex items-center gap-1">
          <span>
            Manage your templates, user profile and AI configuration from the
          </span>
          <a
            href={chrome.runtime.getURL("options.html")}
            target="_blank"
            rel="noopener noreferrer"
            className=" text-brand-blue hover:underline">
            Options page
          </a>
        </p>
      </header>
      <div className="mt-6">
        <div
          className={`rounded-lg border border-border p-2 mb-6 ${isAiConfigured ? "bg-green-100" : "bg-orange-100"}`}>
          {isAiConfigured ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Your AI is configured and ready to use! You can now close this
              popup and start using LinkedIn Copilot.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Your AI is not yet configured. Please visit the options page to
              set up your API key and user details.
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <a
              href={chrome.runtime.getURL("options.html")}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2">
              Go to Options
            </a>
          </div>
        </div>
        <Stats />
      </div>
    </div>
  )
}

const ExtensionPopup = () => {
  return <GlobalProvider>{<Popup />}</GlobalProvider>
}

export default ExtensionPopup
