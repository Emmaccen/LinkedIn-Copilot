import { Input } from "@headlessui/react"
import { Plus, Save, X } from "lucide-react"
import { useState } from "react"

import type { TemplateCategory } from "~types"
import { loadFromLocalStorage, saveToLocalStorage } from "~utils"

export const TemplateCategoryManager = () => {
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: ""
  })

  const addNewCategory = () => {
    if (!newCategory.icon.trim() && !newCategory.name.trim()) {
      return
    }
    const previousTemplates =
      loadFromLocalStorage<Record<string, TemplateCategory>>("templates")
    if (previousTemplates) {
      const updatedTemplates = {
        ...previousTemplates
      }
      updatedTemplates[newCategory.name] = {
        active: false,
        context: ["feed"],
        icon: newCategory.icon,
        templates: []
      }
      saveToLocalStorage<Record<string, TemplateCategory>>(
        "templates",
        updatedTemplates
      )
    }
    setNewCategory({
      name: "",
      icon: ""
    })
    setShowCategoryForm(false)
  }
  return (
    <div>
      <div className="rounded-lg border border-border p-6 flex justify-between items-center">
        <span className="font-medium">Add New Category</span>

        {!showCategoryForm ? (
          <button
            onClick={() => setShowCategoryForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Plus size={16} />
            Add Category
          </button>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={newCategory.icon}
                title="Press Cmd+Ctrl+Space (Mac) or Win+. (Windows) to open the emoji picker."
                onChange={(e) =>
                  setNewCategory({ ...newCategory, icon: e.target.value })
                }
                placeholder="Icon"
                className="border border-border bg-background rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-16 mr-2"
              />
              <Input
                type="text"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="Category name"
                className="border border-border bg-background rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
              <button
                onClick={addNewCategory}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 transition-colors ">
                <Save size={16} />
              </button>
              <button
                onClick={() => setShowCategoryForm(false)}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Cmd+Ctrl+Space (Mac) or Win+. (Windows) to open the emoji
              picker.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
