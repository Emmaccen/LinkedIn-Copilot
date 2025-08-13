import { Button } from "@headlessui/react"
import { Download, Upload } from "lucide-react"
import { useState } from "react"

import { useGlobalState } from "~store/GlobalContext"
import type { TemplateCategory } from "~types"
import { loadFromStorage } from "~utils"

export const ImportExportTemplate = () => {
  const { pushNotification } = useGlobalState()
  const [templates, setTemplates] = useState<Record<string, TemplateCategory>>(
    {}
  )
  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const result = e.target.result
        const uploadedTemplates =
          typeof result === "string" ? JSON.parse(result) : {}

        // Validate structure
        if (typeof uploadedTemplates !== "object") {
          throw new Error("Invalid file format")
        }

        // Merge with existing templates
        const mergedTemplates = { ...templates, ...uploadedTemplates }
        setTemplates(mergedTemplates)
        localStorage.setItem("templates", JSON.stringify(mergedTemplates))
        pushNotification("Templates imported successfully!", "success")
      } catch (error) {
        pushNotification(
          "Error importing templates: Invalid JSON file",
          "error"
        )
        console.error("Error importing templates:", error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="font-medium text-lg">Import / Export Templates</h2>
      <div className="mt-4 flex gap-4">
        <div>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
            id="template-upload"
          />
          <label
            htmlFor="template-upload"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
            <Upload size={16} /> Import Templates
          </label>
        </div>
        <Button
          onClick={() => pushNotification("testing", "info")}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors cursor-pointer">
          <Download size={16} /> Export Templates
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Import templates from a JSON file or export your current templates for
        backup.
      </p>
    </div>
  )
}
