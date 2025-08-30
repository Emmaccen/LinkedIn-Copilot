import Groq from "groq-sdk"

import { ENCRYPTED_API_KEY_NAME, getDecryptedApiKey } from "~utils"

interface PromptType {
  message: string
  systemMessage: string
}

export const groqInstance = (() => {
  let instance: Groq | null = null

  const createInstance = async (): Promise<Groq | null> => {
    try {
      const apiKey = await getDecryptedApiKey()

      if (apiKey) {
        instance = new Groq({
          apiKey: apiKey,
          dangerouslyAllowBrowser: true
        })
        return instance
      } else {
        console.warn("No API key found in storage")
        return null
      }
    } catch (error) {
      console.error("Failed to create Groq instance:", error)
      return null
    }
  }

  return {
    // This method creates a new instance of Groq
    // It can be called to reset the instance if needed
    createInstance,
    // This method ensures that we only create the instance once
    getInstance: async (): Promise<Groq | null> => {
      if (!instance) {
        instance = await createInstance()
      }
      return instance
    },
    // Method to reset instance (useful for key changes)
    resetInstance: () => {
      instance = null
    }
  }
})()

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === "local" && changes[ENCRYPTED_API_KEY_NAME]) {
    console.log("Encrypted API key changed, resetting Groq instance")
    groqInstance.resetInstance()
    await groqInstance.createInstance()
    console.log("Groq instance reset and recreated")
  }
})

export async function generateReply({ message, systemMessage }: PromptType) {
  return await getGroqChatStream({ message, systemMessage })
}

export async function getGroqChatStream({
  message,
  systemMessage
}: PromptType) {
  const groq = await groqInstance.getInstance()

  // Add null check before using groq
  if (!groq) {
    throw new Error(
      "Groq instance not available - API key may not be configured"
    )
  }

  console.log("Groq instance ready:", !!groq)
  return groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemMessage
      },
      {
        role: "user",
        content: message
      }
    ],
    model: "llama-3.3-70b-versatile",

    // The maximum number of tokens to generate. Requests can use up to
    // 2048 tokens shared between prompt and completion.
    max_completion_tokens: 1024,

    stop: null,

    stream: true
  })
}

/**
 * NOTES FROM LUCIUS EMMANUEL
 * If you ever wonder how long you can use your free-tier API key, you can check the limits at https://console.groq.com/docs/rate-limits
 * But basically, the model used above can generate ~400,000 characters per day. And that's pretty sick!
 */
