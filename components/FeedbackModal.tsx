import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { useState } from "react"

interface FeedbackProps {
  isOpen: boolean
  onClose: () => void
}

type FeedbackType = "bug" | "feature" | "general"

const FeedbackModal: React.FC<FeedbackProps> = ({ isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submitFeedback = async (feedbackData: {
    type: string
    message: string
    email?: string
  }) => {
    const timestamp = new Date().toISOString()
    setIsSubmitting(true)
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${process.env.PLASMO_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/${feedbackData.type}?documentId=${encodeURIComponent(timestamp)}&key=${process.env.PLASMO_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            type: { stringValue: feedbackData.type },
            message: { stringValue: feedbackData.message },
            email: { stringValue: feedbackData.email || "" },
            timestamp: { timestampValue: new Date().toISOString() },
            version: { stringValue: chrome.runtime.getManifest().version }
          }
        })
      }
    )
    setIsSubmitting(false)
    return response.json()
  }

  if (submitted) {
    return (
      <Dialog
        open={isOpen}
        onClose={() => {
          setSubmitted(false)
          onClose()
        }}
        className="relative z-50">
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-sm rounded-lg bg-card border p-6 shadow-lg">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-green/10 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-brand-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Thank you!
              </h3>
              <p className="text-muted-foreground text-sm">
                Your feedback has been sent. We appreciate you helping us
                improve LinkedIn Copilot.
              </p>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full rounded-lg bg-card border p-6 shadow-lg">
          <DialogTitle className="text-lg font-semibold text-foreground mb-4">
            Send Feedback
          </DialogTitle>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitFeedback({
                type: feedbackType,
                message: message,
                email: email
              }).then(() => {
                setSubmitted(true)
              })
            }}
            className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Feedback Type
              </label>
              <select
                value={feedbackType}
                onChange={async (e) =>
                  setFeedbackType(e.target.value as FeedbackType)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="general">General Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Message <span className="text-destructive">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Tell us about your experience, report a bug, or suggest a feature..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional. We'll only use this to follow up on your feedback.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-md">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              You can also{" "}
              <a
                href="https://github.com/emmaccen/linkedin-copilot/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue hover:underline">
                report issues directly on GitHub
              </a>
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default FeedbackModal
