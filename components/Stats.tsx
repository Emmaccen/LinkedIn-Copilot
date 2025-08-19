import { MessageSquare, Target, TrendingUp, Zap } from "lucide-react"
import React, { useCallback, useEffect, useState } from "react"

import { useGlobalState } from "~store/GlobalContext"
import type { TemplateCategory } from "~types"

type StatCardProps = {
  label: string
  value: number
  icon: React.ReactNode
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border p-4 flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div className="ml-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
type Stats = {
  totalTemplates: number
  activeTemplates: number
  categories: number
  activeCategories: number
}
export const Stats = () => {
  const { templates } = useGlobalState()
  const provideStats = useCallback(
    (templates: Record<string, TemplateCategory>) => {
      let stats: Stats = {
        totalTemplates: 0,
        activeTemplates: 0,
        categories: 0,
        activeCategories: 0
      }
      stats["totalTemplates"] = Object.values(templates).reduce(
        (acc, category) => acc + category.templates.length,
        0
      )
      stats["activeTemplates"] = Object.values(templates).reduce(
        (acc, category) =>
          acc + category.templates.filter((t) => t.active).length,
        0
      )
      stats["categories"] = Object.keys(templates).length
      stats["activeCategories"] = Object.values(templates).filter(
        (category) => category.active
      ).length

      return stats
    },
    [templates]
  )

  const statsData = provideStats(templates)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Templates"
        value={statsData?.totalTemplates || 0}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500">
            <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
          </svg>
        }
      />
      <StatCard
        label="Active Templates"
        value={statsData?.activeTemplates || 0}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-500">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
          </svg>
        }
      />
      <StatCard
        label="Categories"
        value={statsData?.categories || 0}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-purple-500">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        }
      />
      <StatCard
        label="Active Categories"
        value={statsData?.activeCategories || 0}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-orange-500">
            <path d="M16 7h6v6" />
            <path d="m22 7-8.5 8.5-5-5L2 17" />
          </svg>
        }
      />
    </div>
  )
}
