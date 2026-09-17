"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Filter } from "lucide-react"

const mockTasks = [
  {
    id: "1",
    title: "Design homepage mockup",
    description: "Create high-fidelity mockup for the new homepage",
    status: "In Progress",
    priority: "High",
    assignee: "Jane Smith",
    dueDate: "2024-02-15",
    projectId: "1",
  },
  {
    id: "2",
    title: "Setup development environment",
    description: "Configure dev environment with all necessary tools",
    status: "Completed",
    priority: "High",
    assignee: "Mike Johnson",
    dueDate: "2024-02-10",
    projectId: "1",
  },
  {
    id: "3",
    title: "Create API documentation",
    description: "Document all API endpoints and parameters",
    status: "To Do",
    priority: "Medium",
    assignee: "Tom Brown",
    dueDate: "2024-02-20",
    projectId: "1",
  },
  {
    id: "4",
    title: "Implement user authentication",
    description: "Add login and registration functionality",
    status: "In Progress",
    priority: "High",
    assignee: "Mike Johnson",
    dueDate: "2024-02-18",
    projectId: "1",
  },
  {
    id: "5",
    title: "Write unit tests",
    description: "Create comprehensive unit tests for core modules",
    status: "To Do",
    priority: "Medium",
    assignee: "Sarah Williams",
    dueDate: "2024-02-25",
    projectId: "1",
  },
]

const statusBadgeClass: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "In Progress": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "To Do": "bg-muted text-muted-foreground",
}

export default function TasksPage() {
  const [tasks] = useState(mockTasks)
  const [filter, setFilter] = useState("all")

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true
    return task.status.toLowerCase().replace(" ", "-") === filter
  })

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage and track all project tasks</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{tasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {tasks.filter((t) => t.status === "In Progress").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {tasks.filter((t) => t.status === "Completed").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">To Do</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {tasks.filter((t) => t.status === "To Do").length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>View and manage all tasks across projects</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="to-do">To Do</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-6">
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 rounded-xl border hover:border-primary/40 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{task.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <Badge variant="secondary">{task.priority}</Badge>
                          <span className="text-xs text-muted-foreground">Due {task.dueDate}</span>
                          <span className="text-xs text-muted-foreground">Assigned to {task.assignee}</span>
                        </div>
                      </div>
                      <Badge className={statusBadgeClass[task.status] ?? "bg-muted text-muted-foreground"}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
