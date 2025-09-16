interface UpdateBannerProps {
  currentVersion: string
  latestVersion: string
  onDismiss: () => void
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({
  currentVersion,
  latestVersion,
  onDismiss
}) => {
  const handleDownload = () => {
    window.open(
      "https://github.com/emmaccen/linkedin-copilot/releases/latest",
      "_blank"
    )
  }

  return (
    <div className="relative rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-brand-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground">
              New version available
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              LinkedIn Copilot v{latestVersion} is now available. You're
              currently using v{currentVersion}.
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Dismiss update notification">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center space-x-3">
        <button
          onClick={handleDownload}
          className="inline-flex items-center rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          Download Update
        </button>
        <a
          href="https://github.com/emmaccen/linkedin-copilot/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-blue hover:underline">
          View release notes
        </a>
      </div>
    </div>
  )
}

export default UpdateBanner
