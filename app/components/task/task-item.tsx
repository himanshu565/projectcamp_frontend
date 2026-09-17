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

const statusColor: Record<string, string> = {
  "To Do": "bg-muted text-muted-foreground",
  "In Progress": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
}

const priorityColor: Record<string, string> = {
  High: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
}

export function TaskItem({ task }: TaskItemProps) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{task.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge className={priorityColor[task.priority] ?? "bg-muted text-muted-foreground"}>
                {task.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">Due {task.dueDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor[task.status] ?? "bg-muted text-muted-foreground"}>
              {task.status}
            </Badge>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
