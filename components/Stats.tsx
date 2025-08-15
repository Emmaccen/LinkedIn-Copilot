import { MessageSquare, Target, TrendingUp, Zap } from "lucide-react"
import React, { useEffect, useState } from "react"

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
  const [statsData, setStatsData] = useState<Stats>()
  const { templates } = useGlobalState()
  const provideStats = (templates: Record<string, TemplateCategory>) => {
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
  }

  useEffect(() => {
    if (templates) setStatsData(provideStats(templates))
  }, [templates])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Templates"
        value={statsData?.totalTemplates || 0}
        icon={<MessageSquare className="text-blue-500" />}
      />
      <StatCard
        label="Active Templates"
        value={statsData?.activeTemplates || 0}
        icon={<Zap className="text-green-500" />}
      />
      <StatCard
        label="Categories"
        value={statsData?.categories || 0}
        icon={<Target className="text-purple-500" />}
      />
      <StatCard
        label="Active Categories"
        value={statsData?.activeCategories || 0}
        icon={<TrendingUp className="text-orange-500" />}
      />
    </div>
  )
}
