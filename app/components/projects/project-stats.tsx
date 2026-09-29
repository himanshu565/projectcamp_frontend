"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"

interface ProjectStatsProps {
  stats: {
    label: string
    value: string | number
  }[]
}

export function ProjectStats({ stats }: ProjectStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
