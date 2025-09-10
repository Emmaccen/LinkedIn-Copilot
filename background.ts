import Analytics from "~lib/analytics"
import { AnalyticsEventTypes } from "~types"

chrome.runtime.onInstalled.addListener(() => {
  Analytics.fireEvent("install")
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === AnalyticsEventTypes.GA_EVENT) {
    Analytics.fireEvent(message.eventName, message.eventParams).then((res) => {
      sendResponse(res)
    })
  } else if (message.type === AnalyticsEventTypes.GA_ERROR_EVENT) {
    Analytics.fireErrorEvent(message.error, message.eventParams).then((res) => {
      sendResponse(res)
    })
  }
})
