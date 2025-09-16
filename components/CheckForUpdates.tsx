import React, { useEffect, useState } from "react"

import UpdateBanner from "~components/UpdateBanner"
import { checkForUpdatesAndCacheResponse } from "~utils/checkForUpdates"

const CheckForUpdates = () => {
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string
  } | null>(null)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  useEffect(() => {
    checkForUpdatesAndCacheResponse().then((info) => {
      if (info && info.hasUpdate && !info.dismissedUpdate) {
        setUpdateInfo(info)
        setShowUpdateBanner(true)
      }
    })
  }, [])

  const handleDismissUpdate = () => {
    setShowUpdateBanner(false)
    chrome.storage.local.set({
      dismissedUpdate: true
    })
  }
  return (
    <div>
      {showUpdateBanner && updateInfo && (
        <div className="max-w-2xl mx-auto p-6">
          <UpdateBanner
            currentVersion={updateInfo.currentVersion}
            latestVersion={updateInfo.latestVersion}
            onDismiss={handleDismissUpdate}
          />
        </div>
      )}
    </div>
  )
}

export default CheckForUpdates
