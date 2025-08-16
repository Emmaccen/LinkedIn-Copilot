import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
  Transition,
  TransitionChild
} from "@headlessui/react"
import {
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon
} from "lucide-react"
import { Fragment, useEffect, useState } from "react"

import { useGlobalState } from "~store/GlobalContext"
import type { ContextType, Template, TemplateCategory } from "~types"
import { saveToLocalStorage } from "~utils"

const contextLabels: Record<ContextType, string> = {
  feed: "Feed",
  dm: "DM",
  connection: "Connection",
  post: "Post"
}

const contextColors: Record<ContextType, string> = {
  feed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  dm: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  connection:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  post: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
}

function TemplateManager() {
  const { templates } = useGlobalState()
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMessage, setModalMessage] = useState("")

  const [currentTemplateCategory, setCurrentTemplateCategory] =
    useState<TemplateCategory | null>(null)

  useEffect(() => {
    const categories = Object.keys(templates)
    if (categories.length > 0) {
      console.log("Available categories:", categories)
      setCategories(categories)
      setSelectedCategory(
        categories[categories.indexOf(selectedCategory)] ?? categories[0]
      )
      setCurrentTemplateCategory(
        templates[categories[categories.indexOf(selectedCategory)]] ??
          templates[categories[0]]
      )
    }
  }, [templates])

  useEffect(() => {
    if (selectedCategory && templates[selectedCategory])
      setCurrentTemplateCategory(templates[selectedCategory])
  }, [selectedCategory])

  const truncateMessage = (message: string, maxLength: number = 60) => {
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message
  }

  const handleCategoryToggle = (enabled: boolean) => {
    saveToLocalStorage<Record<string, TemplateCategory>>("templates", {
      ...templates,
      [selectedCategory]: {
        ...templates[selectedCategory],
        active: enabled
      }
    })
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setModalMessage(template.message)
    setIsModalOpen(true)
  }

  const handleSaveTemplate = (newEntry?: Template) => {
    if (!editingTemplate) return

    const placeholders = extractPlaceholders(modalMessage)
    saveToLocalStorage<Record<string, TemplateCategory>>("templates", {
      ...templates,
      [selectedCategory]: {
        ...templates[selectedCategory],
        templates: newEntry
          ? [...templates[selectedCategory].templates, newEntry]
          : templates[selectedCategory].templates.map((t) =>
              t.id === editingTemplate.id
                ? {
                    ...t,
                    message: modalMessage,
                    placeholders,
                    aiGenerated: false
                  }
                : t
            )
      }
    })

    setIsModalOpen(false)
    setEditingTemplate(null)
    setModalMessage("")
  }

  const extractPlaceholders = (message: string): string[] => {
    const matches = message.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map((match) => match.slice(2, -2)) : []
  }

  const handleToggleTemplateActive = (templateId: string) => {
    saveToLocalStorage<Record<string, TemplateCategory>>("templates", {
      ...templates,
      [selectedCategory]: {
        ...templates[selectedCategory],
        templates: templates[selectedCategory].templates.map((t) =>
          t.id === templateId ? { ...t, active: !t.active } : t
        )
      }
    })
  }

  const handleDeleteTemplate = (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return
    }
    saveToLocalStorage<Record<string, TemplateCategory>>("templates", {
      ...templates,
      [selectedCategory]: {
        ...templates[selectedCategory],
        templates: templates[selectedCategory].templates.filter(
          (t) => t.id !== templateId
        )
      }
    })
  }

  return (
    <div className="">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Template Manager</h2>
        <p className="text-muted-foreground">
          Manage your LinkedIn response templates efficiently.
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Listbox value={selectedCategory} onChange={setSelectedCategory}>
              <div className="relative">
                <ListboxButton className="relative w-64 cursor-pointer rounded-lg bg-card border border-border py-3 px-4 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">
                      {currentTemplateCategory?.icon}
                    </span>
                    <span className="block truncate font-medium">
                      {selectedCategory}
                    </span>
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDownIcon
                      className="h-5 w-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>
                </ListboxButton>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0">
                  <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-card border border-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {categories.map((category) => (
                      <ListboxOption
                        key={category}
                        className={({ focus }) =>
                          `relative cursor-pointer select-none py-3 px-4 ${
                            focus
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground"
                          }`
                        }
                        value={category}>
                        {({ selected }) => (
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {templates[category].icon}
                            </span>
                            <span
                              className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                              {category}
                            </span>
                            {selected && (
                              <CheckIcon
                                className="h-5 w-5 text-brand-blue ml-auto"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        )}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Transition>
              </div>
            </Listbox>
            <div className="flex flex-wrap gap-2 mt-2">
              {(Object.keys(contextLabels) as ContextType[]).map((ctx) => {
                let isContextInCategory =
                  currentTemplateCategory?.context.indexOf(ctx) !== -1

                return (
                  <button
                    title="toggle context"
                    onClick={() => {
                      if (
                        currentTemplateCategory &&
                        currentTemplateCategory.context
                      ) {
                        const newContext =
                          currentTemplateCategory.context.includes(ctx)
                            ? currentTemplateCategory.context.filter(
                                (c) => c !== ctx
                              )
                            : [...currentTemplateCategory.context, ctx]

                        saveToLocalStorage<Record<string, TemplateCategory>>(
                          "templates",
                          {
                            ...templates,
                            [selectedCategory]: {
                              ...currentTemplateCategory,
                              context: newContext
                            }
                          }
                        )
                      }
                    }}
                    key={ctx}
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${isContextInCategory ? contextColors[ctx] : "border opacity-30"}`}>
                    {contextLabels[ctx]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={currentTemplateCategory?.active}
              onChange={handleCategoryToggle}
              className={`${
                currentTemplateCategory?.active ? "bg-brand-blue" : "bg-muted"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2`}>
              <span
                className={`${
                  currentTemplateCategory?.active
                    ? "translate-x-6"
                    : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-sm font-medium text-foreground">
              {currentTemplateCategory?.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            handleEditTemplate({
              id: crypto.randomUUID(),
              message: "Hello, world!",
              placeholders: [],
              active: false,
              aiGenerated: false
            })
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 transition-colors">
          <PlusIcon className="h-4 w-4" />
          Add Template
        </button>
      </div>

      {/* Templates Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message
                </th>
                <th
                  title="Ai generated column"
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ai Gen
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Variables
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {currentTemplateCategory?.templates.map((template) => (
                <tr
                  key={template.id}
                  className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Switch
                      checked={template.active}
                      onChange={() => handleToggleTemplateActive(template.id)}
                      className={`${
                        template.active ? "bg-brand-green" : "bg-muted"
                      } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2`}>
                      <span
                        className={`${
                          template.active ? "translate-x-5" : "translate-x-1"
                        } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-sm text-foreground cursor-pointer hover:text-brand-blue transition-colors group"
                      onClick={() => handleEditTemplate(template)}>
                      <span className="group-hover:underline">
                        {truncateMessage(template.message)}
                      </span>
                      {/* {template.message.length > 60 && ( */}
                      <PencilIcon className="h-3 w-3 inline ml-5 opacity-0 group-hover:opacity-100" />
                      {/* )} */}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          template.aiGenerated
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                        {template.aiGenerated ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {template.placeholders.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {template.placeholders.map((placeholder) => (
                          <span
                            key={placeholder}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                            {placeholder}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">None</span>
                    )}
                  </td>
                  <td className="flex items-center gap-2 px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-brand-blue hover:text-brand-blue/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 rounded-md p-1">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 rounded-md p-1">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!currentTemplateCategory && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium mb-2">No templates yet</p>
              <p className="text-sm">Add your first template to get started.</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsModalOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95">
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-card border border-border p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-foreground mb-4">
                    Edit Template
                  </DialogTitle>

                  <div className="mb-4">
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-foreground mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={8}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none"
                      placeholder="Enter your template message..."
                      value={modalMessage}
                      onChange={(e) => setModalMessage(e.target.value)}
                    />
                    <div className="flex justify-between items-center gap-4">
                      <p className="mt-2 text-xs text-muted-foreground">
                        Use{" "}
                        <span className="font-mono bg-muted px-1 rounded">
                          {"{{placeholder}}"}
                        </span>{" "}
                        for dynamic content
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {modalMessage.length} characters
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition-colors"
                      onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition-colors"
                      onClick={() => {
                        const isExistingTemplate = templates[
                          selectedCategory
                        ]?.templates.some((t) => t.id === editingTemplate?.id)
                        if (isExistingTemplate) {
                          handleSaveTemplate()
                        } else {
                          handleSaveTemplate({
                            id: crypto.randomUUID(),
                            message: modalMessage,
                            placeholders: extractPlaceholders(modalMessage),
                            active: false,
                            aiGenerated: false
                          })
                        }
                      }}>
                      Save Changes
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default TemplateManager
