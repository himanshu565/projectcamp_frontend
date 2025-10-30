"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreVertical } from "lucide-react"

interface TaskItemProps {
  task: {
    id: string
    title: string
    description: string
    status: string
    priority: string
    assignee: string
    dueDate: string
  }
}

export function TaskItem({ task }: TaskItemProps) {
  const statusColor = {
    "To Do": "bg-gray-500/20 text-gray-400",
    "In Progress": "bg-blue-500/20 text-blue-400",
    Completed: "bg-green-500/20 text-green-400",
  }

  const priorityColor = {
    High: "bg-red-500/20 text-red-400",
    Medium: "bg-yellow-500/20 text-yellow-400",
    Low: "bg-green-500/20 text-green-400",
  }

  return (
    <Card className="border-border/50 hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{task.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className={priorityColor[task.priority as keyof typeof priorityColor]}>{task.priority}</Badge>
              <span className="text-xs text-muted-foreground">Due: {task.dueDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor[task.status as keyof typeof statusColor]}>{task.status}</Badge>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
