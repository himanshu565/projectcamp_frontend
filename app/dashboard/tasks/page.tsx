"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Input } from "@/app/components/ui/input"
import { API_URL } from "@/lib/api"
import { Plus, Filter, X } from "lucide-react"

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
  const [tasks, setTasks] = useState<typeof mockTasks>([])
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const projectsResponse = await fetch(`${API_URL}/projects`, { credentials: "include" })
        if (!projectsResponse.ok) return
        const projectsData = await projectsResponse.json()
        const projects = Array.isArray(projectsData) ? projectsData : projectsData.projects
        const projectIds = projects?.map((project: { _id?: string }) => project._id).filter((projectId: string | undefined): projectId is string => Boolean(projectId)) ?? []
        if (!projectIds.length) return
        setDefaultProjectId(projectIds[0])
        const taskResponses = await Promise.all(projectIds.map((projectId: string) => fetch(`${API_URL}/tasks/${projectId}`, { credentials: "include" })))
        const taskGroups = await Promise.all(taskResponses.map(async (response, index) => {
          if (!response.ok) return []
          const data = await response.json()
          const loadedTasks = Array.isArray(data) ? data : data.tasks
          return (loadedTasks ?? []).map((task: Record<string, unknown>) => {
            const taskId = task._id
            if (!taskId) return null
            return { ...task, id: String(taskId), projectId: projectIds[index] }
          }).filter(Boolean)
        }))
        const loadedTasks = taskGroups.flat()
        if (loadedTasks.length) setTasks(loadedTasks)
      } catch {
        // Keep the local fallback when the API is unavailable.
      }
    }

    loadTasks()
  }, [])

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return

    const taskPayload = {
      title: title.trim(),
      description: description.trim() || "No description yet",
      status: "To Do",
      priority: "Medium",
      assignee: "You",
      dueDate: "Not set",
    }
    try {
      if (!defaultProjectId) throw new Error("No project selected")
      const response = await fetch(`${API_URL}/tasks/${defaultProjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload),
        credentials: "include",
      })
      if (!response.ok) throw new Error("Task creation failed")
      const data = await response.json()
      const createdTask = data.task ?? data
      const taskId = createdTask._id
      if (!taskId) throw new Error("Created task did not include an ID")
      setTasks((currentTasks) => [...currentTasks, {
        ...createdTask,
        id: String(taskId),
        projectId: defaultProjectId,
      }])
    } catch {
      return
    }
    setTitle("")
    setDescription("")
    setIsCreating(false)
  }

  const updateTaskStatus = async (taskId: string, projectId: string, status: string) => {
    if (!taskId || !projectId || taskId.startsWith("local-") || projectId.startsWith("local-")) return
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    )
    try {
      await fetch(`${API_URL}/tasks/${projectId}/t/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      })
    } catch {
      // Keep the optimistic update when the API is unavailable.
    }
  }

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
          <Button className="gap-2" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateTask} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Create task</h2>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsCreating(false)} aria-label="Close form">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" required autoFocus />
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" />
            <Button type="submit">Create task</Button>
          </form>
        )}

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
                        <h3 className="font-medium text-foreground">
                          <Link href={`/dashboard/tasks/${task.id}?projectId=${task.projectId}`} className="hover:text-primary">
                            {task.title}
                          </Link>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <Badge variant="secondary">{task.priority}</Badge>
                          <span className="text-xs text-muted-foreground">Due {task.dueDate}</span>
                          <span className="text-xs text-muted-foreground">Assigned to {task.assignee}</span>
                        </div>
                      </div>
                      <select
                        value={task.status}
                        onChange={(event) => updateTaskStatus(task.id, task.projectId, event.target.value)}
                        aria-label={`Update status for ${task.title}`}
                        className={`rounded-md border px-2 py-1 text-sm font-medium ${statusBadgeClass[task.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
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
