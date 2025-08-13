import { Button } from "@headlessui/react"
import { Plus } from "lucide-react"

export const TemplateCategory = () => {
  return (
    <div>
      <div className="rounded-lg border border-border p-6 flex justify-between items-center">
        <span className="font-medium">Add New Category</span>
        <Button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
          <Plus size={16} /> Add Category
        </Button>
      </div>
    </div>
  )
}
