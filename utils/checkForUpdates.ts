const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000 * 7 // 7 days

const shouldCheckForUpdates = async () => {
  const { lastUpdateCheck } = await chrome.storage.local.get("lastUpdateCheck")
  const now = Date.now()
  return !lastUpdateCheck || now - lastUpdateCheck > UPDATE_CHECK_INTERVAL
}

export const checkForUpdatesAndCacheResponse = async () => {
  if (await shouldCheckForUpdates()) {
    const updateInfo = await checkForUpdates()
    if (updateInfo) {
      await chrome.storage.local.set({
        updateInfo,
        lastUpdateCheck: Date.now(),
        dismissedUpdate: false
      })
    }
    return { ...updateInfo, dismissedUpdate: false }
  }

  const { updateInfo, dismissedUpdate } = await chrome.storage.local.get([
    "updateInfo",
    "dismissedUpdate"
  ])

  return { ...updateInfo, dismissedUpdate }
}

const checkForUpdates = async () => {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/emmaccen/linkedin-copilot/main/package.json"
    )
    const packageData = await response.json()
    const latestVersion = packageData.version
    const currentVersion = chrome.runtime.getManifest().version

    return {
      hasUpdate: latestVersion !== currentVersion,
      latestVersion,
      currentVersion
    }
  } catch (error) {
    console.error("Update check failed:", error)
    return null
  }
}
