import { Button } from "@headlessui/react"
import { Download, Upload } from "lucide-react"
import React, { useState } from "react"
import { z } from "zod"

import { useGlobalState } from "~store/GlobalContext"
import type { Template, TemplateCategory } from "~types"
import { saveToLocalStorage } from "~utils"

const contextTypeSchema = z.enum(["feed", "dm", "connection", "post"])

const templateSchema: z.ZodType<Template> = z.object({
  id: z.string().min(1, "Template id is required"),
  message: z.string().min(1, "Message cannot be empty"),
  aiGenerated: z.boolean(),
  active: z.boolean(),
  placeholders: z.array(z.string())
})

const templateCategorySchema: z.ZodType<TemplateCategory> = z.object({
  active: z.boolean(),
  context: z.array(contextTypeSchema).min(1, "Context array cannot be empty"),
  icon: z.string().min(1, "Icon is required"),
  templates: z.array(templateSchema).min(1, "At least one template is required")
})

export const templatesFileSchema: z.ZodType<Record<string, TemplateCategory>> =
  z.record(z.string(), templateCategorySchema)

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
        const validated = templatesFileSchema.safeParse(uploadedTemplates)

        if (!validated.success && !validated.data) {
          throw new Error(
            "Invalid template structure: " + validated.error.message
          )
        }
        // Merge with existing templates
        const mergedTemplates = { ...templates, ...validated.data }
        setTemplates(mergedTemplates)
        saveToLocalStorage<Record<string, TemplateCategory>>(
          "templates",
          mergedTemplates
        )
        pushNotification("Templates imported successfully!", "success")
      } catch (error) {
        pushNotification(
          "Error importing templates: Invalid template structure",
          "error"
        )
        console.error("Error importing templates:", error)
      }
    }
    reader.readAsText(file)
  }

  const exportTemplates = () => {
    const templatesFromStorage = localStorage.getItem("templates")
    if (!templatesFromStorage) {
      pushNotification("No templates to export", "info")
      return
    }
    const dataStr = JSON.stringify(JSON.parse(templatesFromStorage), null, 2)
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = "linkedin-copilot-templates.json"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
    linkElement.remove()
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
          onClick={exportTemplates}
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
