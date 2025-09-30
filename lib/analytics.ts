import type { GAUserInfo, LocationInfoType } from "~types"

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect"
const GA_DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect"

const analyticsConfig = {
  apiSecrete: process.env.PLASMO_PUBLIC_ANALYTICS_API_SECRETE,
  measurementId: process.env.PLASMO_PUBLIC_ANALYTICS_MEASUREMENT_ID
}

// Get via https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#recommended_parameters_for_reports
const MEASUREMENT_ID = analyticsConfig.measurementId
const API_SECRET = analyticsConfig.apiSecrete
const DEFAULT_ENGAGEMENT_TIME_MSEC = 1200

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
  // --- getOrCreateSessionId (store numeric session_id & timestamp) ---
  async getOrCreateSessionId() {
    let { sessionData } = await chrome.storage.local.get("sessionData")
    const now = Date.now()

    if (sessionData && sessionData.timestamp) {
      const durationInMin = (now - sessionData.timestamp) / 60000
      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        sessionData = null
      } else {
        // keep session alive (use numbers)
        sessionData.timestamp = now
        await chrome.storage.local.set({ sessionData })
      }
    }

    if (!sessionData) {
      sessionData = {
        // use number (not string). GA expects digits for session_id.
        session_id: now,
        timestamp: now
      }
      await chrome.storage.local.set({ sessionData })
    }

    return sessionData.session_id
  }

  // Get location info (cached for performance and rate limiting)
  async getLocationInfo(): Promise<Record<string, any>> {
    try {
      const cached = await chrome.storage.local.get(["location_cache"])
      if (
        cached.location_cache &&
        Date.now() - cached.location_cache.timestamp < 86400000
      ) {
        // 24 hours
        return cached.location_cache.data
      }

      const response = await fetch("https://ipwho.is/")
      const locationData: LocationInfoType = await response.json()

      const locationInfo = {
        country: locationData.country,
        country_code: locationData.country_code,
        region: locationData.region,
        city: locationData.city,
        timezone: locationData.timezone.id,
        ...locationData
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
    const locationInfo: Partial<LocationInfoType> = await this.getLocationInfo()
    return {
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: locationInfo.timezone.id,
      country: locationInfo.country,
      country_code: locationInfo.country_code,
      region: locationInfo.region,
      city: locationInfo.city,
      timestamp: Date.now(),
      region_code: locationInfo.region_code
    }
  }

  // Fires an event with optional params. Event names must only include letters and underscores.
  async fireEvent(name: string, params: Record<string, any> = {}) {
    try {
      const sessionId = await this.getOrCreateSessionId()
      const clientId = await this.getOrCreateClientId()
      const userInfo = await this.getUserInfo()

      const eventParams: {
        session_id: number
        engagement_time_msec: number
        debug_mode?: number
      } = {
        ...params,
        session_id: Number(params.session_id ?? sessionId), // numeric
        engagement_time_msec: Number(
          params.engagement_time_msec ?? DEFAULT_ENGAGEMENT_TIME_MSEC
        )
      }

      const user_properties = {
        country: { value: userInfo.country ?? "Unknown" },
        country_code: { value: userInfo.country_code ?? "XX" },
        region: { value: userInfo.region ?? "Unknown" },
        city: { value: userInfo.city ?? "Unknown" },
        timezone: {
          value:
            userInfo.timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        language: { value: userInfo.language ?? navigator.language }
      }

      const user_location = {
        country_id: userInfo.country_code ?? undefined, // ISO 3166-1 alpha-2
        city: userInfo.city ?? undefined,
        // region_id expects ISO-3166-2 (e.g. "US-CA")
        region_id: `${userInfo.country_code}-${userInfo.region_code}`
      }

      // If you want DebugView visibility, add debug_mode to event params (value can be 1/true)
      if (this.debug) {
        eventParams.debug_mode = 1
      }

      const payload = {
        client_id: clientId,
        user_properties,
        // optional geo override:
        user_location,
        events: [
          {
            name,
            params: eventParams
          }
        ]
      }

      const url = `${this.debug ? GA_DEBUG_ENDPOINT : GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(payload)
      })

      // Debug endpoint returns JSON with validationMessages
      if (this.debug) {
        const text = await response.text()
        try {
          console.log("Validation response:", JSON.parse(text))
        } catch {
          console.log("Validation response (raw):", text)
        }
      } else {
        // mp/collect normally returns 204 on success
        console.log("MP response status:", response.status)
      }

      return response
    } catch (error) {
      console.error("Error in fireEvent:", error)
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
