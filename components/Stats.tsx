import { MessageSquare, Target, TrendingUp, Zap } from "lucide-react"
import React from "react"

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

export const Stats = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Templates"
        value={10}
        icon={<MessageSquare className="text-blue-500" />}
      />
      <StatCard
        label="Active Templates"
        value={77}
        icon={<Zap className="text-green-500" />}
      />
      <StatCard
        label="Categories"
        value={2}
        icon={<Target className="text-purple-500" />}
      />
      <StatCard
        label="Active Categories"
        value={8}
        icon={<TrendingUp className="text-orange-500" />}
      />
    </div>
  )
}
