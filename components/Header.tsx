import { Button } from "@headlessui/react"
import { Download, Upload } from "lucide-react"

export const ImportExportTemplate = () => {
  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="font-medium text-lg">Import / Export Templates</h2>
      <div className="mt-4 flex gap-4">
        <Button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          <Upload size={16} /> Import Templates
        </Button>
        <Button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
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
