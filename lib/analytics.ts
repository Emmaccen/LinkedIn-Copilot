import type { GAUserInfo } from "~types"

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect"
const GA_DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect"

const analyticsConfig = {
  apiSecrete: process.env.PLASMO_PUBLIC_ANALYTICS_API_SECRETE,
  measurementId: process.env.PLASMO_PUBLIC_ANALYTICS_MEASUREMENT_ID
}

// Get via https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#recommended_parameters_for_reports
const MEASUREMENT_ID = analyticsConfig.measurementId
const API_SECRET = analyticsConfig.apiSecrete
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100

// Duration of inactivity after which a new session is created
const SESSION_EXPIRATION_IN_MIN = 30

export class Analytics {
  debug: boolean
  constructor(debug = false) {
    this.debug = debug
  }

  // Returns the client id, or creates a new one if one doesn't exist.
  // Stores client id in local storage to keep the same client id as long as
  // the extension is installed.
  async getOrCreateClientId() {
    let { clientId } = await chrome.storage.local.get("clientId")
    if (!clientId) {
      // Generate a unique client ID, the actual value is not relevant
      clientId = self.crypto.randomUUID()
      await chrome.storage.local.set({ clientId })
    }
    return clientId
  }

  // Returns the current session id, or creates a new one if one doesn't exist or
  // the previous one has expired.
  async getOrCreateSessionId() {
    // Use storage.session because it is only in memory
    let { sessionData } = await chrome.storage.local.get("sessionData")
    const currentTimeInMs = Date.now()
    // Check if session exists and is still valid
    if (sessionData && sessionData.timestamp) {
      // Calculate how long ago the session was last updated
      const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000
      // Check if last update lays past the session expiration threshold
      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        // Clear old session id to start a new session
        sessionData = null
      } else {
        // Update timestamp to keep session alive
        sessionData.timestamp = currentTimeInMs
        await chrome.storage.local.set({ sessionData })
      }
    }
    if (!sessionData) {
      // Create and store a new session
      sessionData = {
        session_id: currentTimeInMs.toString(),
        timestamp: currentTimeInMs.toString()
      }
      await chrome.storage.local.set({ sessionData })
    }
    return sessionData.session_id
  }

  // Get location info (cached for performance)
  async getLocationInfo(): Promise<{
    country: string
    country_code: string
    region: string
    city: string
    timezone: string
  }> {
    try {
      const cached = await chrome.storage.local.get(["location_cache"])
      if (
        cached.location_cache &&
        Date.now() - cached.location_cache.timestamp < 86400000
      ) {
        // 24 hours
        return cached.location_cache.data
      }

      const response = await fetch("https://ipapi.co/json/")
      const locationData: Record<string, string> = await response.json()
      console.log("Fetched location data:", locationData)

      const locationInfo = {
        country: locationData.country_name,
        country_code: locationData.country_code,
        region: locationData.region,
        city: locationData.city,
        timezone: locationData.timezone
      }

      await chrome.storage.local.set({
        location_cache: {
          data: locationInfo,
          timestamp: Date.now()
        }
      })

      return locationInfo
    } catch (error) {
      console.error("Failed to get location:", error)
      return {
        country: "Unknown",
        country_code: "XX",
        region: "Unknown",
        city: "Unknown",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  }

  // Get basic user info that Firebase would normally collect
  async getUserInfo(): Promise<GAUserInfo> {
    const locationInfo = await this.getLocationInfo()

    return {
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: locationInfo.timezone,
      country: locationInfo.country,
      country_code: locationInfo.country_code,
      region: locationInfo.region,
      city: locationInfo.city,
      timestamp: Date.now()
    }
  }

  // Fires an event with optional params. Event names must only include letters and underscores.
  async fireEvent(name: string, params: Record<string, any> = {}) {
    // Configure session id and engagement time if not present, for more details see:
    // https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#recommended_parameters_for_reports
    let userInfo: GAUserInfo
    try {
      if (!params.session_id) {
        params.session_id = await this.getOrCreateSessionId()
      }
      if (!params.engagement_time_msec) {
        params.engagement_time_msec = DEFAULT_ENGAGEMENT_TIME_MSEC
      }
      userInfo = await this.getUserInfo()
    } catch (error) {
      console.error("Error in fireEvent:", error)
    }

    try {
      console.log("user info", userInfo)
      const response = await fetch(
        `${
          this.debug ? GA_DEBUG_ENDPOINT : GA_ENDPOINT
        }?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
        {
          method: "POST",
          body: JSON.stringify({
            client_id: await this.getOrCreateClientId(),
            events: [
              {
                name,
                ...params,
                ...userInfo
              }
            ]
          })
        }
      )
      if (!this.debug) {
        return
      }
      //   console.log(await response.text())
    } catch (e) {
      console.error("Google Analytics request failed with an exception", e)
    }
  }

  // Fire a page view event.
  async firePageViewEvent(pageTitle, pageLocation, additionalParams = {}) {
    return this.fireEvent("page_view", {
      page_title: pageTitle,
      page_location: pageLocation,
      ...additionalParams
    })
  }

  // Fire an error event.
  async fireErrorEvent(error, additionalParams = {}) {
    // Note: 'error' is a reserved event name and cannot be used
    // see https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference?client_type=gtag#reserved_names
    return this.fireEvent("extension_error", {
      ...error,
      ...additionalParams
    })
  }
}

export default new Analytics()
