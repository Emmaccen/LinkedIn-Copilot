import { useState } from "react"

import "./styles.css"

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react"
import { AlertCircle, CheckCircle, InfoIcon } from "lucide-react"

import { ImportExportTemplate } from "~components/Header"
import { Stats } from "~components/Stats"
import { TemplateCategory } from "~components/TemplateCategory"
import { ThemeToggle } from "~components/ThemeToggle"
import { GlobalProvider, useGlobalState } from "~store/GlobalContext"

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}

const Options = () => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { notifications, pushNotification } = useGlobalState()

  return (
    <div className="min-h-screen max-w-7xl mx-auto p-8">
      {/* <ThemeToggle /> */}
      {!!notifications.length && (
        <div className="fixed top-4 right-4 z-50">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 mb-2 rounded-lg shadow-lg transition-all ${
                notification.type === "success"
                  ? "bg-green-500 text-white"
                  : notification.type === "error"
                    ? "bg-red-500 text-white"
                    : "bg-blue-500 text-white"
              }`}>
              <div className="flex items-center gap-2">
                {notification.type === "success" && <CheckCircle size={16} />}
                {notification.type === "error" && <AlertCircle size={16} />}
                {notification.type === "info" && <InfoIcon size={16} />}
                {notification.message}
              </div>
            </div>
          ))}
        </div>
      )}
      <h1 className="text-3xl font-bold mb-2">LinkedIn Copilot Options</h1>
      <p className="text-muted-foreground">
        Manage your templates and configure extension settings
      </p>

      <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <TabList className="flex border-b border-border mt-6 space-x-6">
          {["Templates", "Settings"].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                classNames(
                  "py-2 border-b-2 -mb-px outline-none text-base",
                  selected
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )
              }>
              {tab}
            </Tab>
          ))}
        </TabList>

        <TabPanels>
          <TabPanel className="pt-6 space-y-6">
            <ImportExportTemplate />
            <Stats />
            <TemplateCategory />
          </TabPanel>

          <TabPanel className="pt-6">
            <p className="text-muted-foreground">Settings</p>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  )
}
const OptionsPage = () => {
  return <GlobalProvider>{<Options />}</GlobalProvider>
}
export default OptionsPage
