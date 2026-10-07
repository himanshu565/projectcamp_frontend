"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Input } from "@/app/components/ui/input"
import { API_URL, getApiCollection, getApiEntity, normalizeProject } from "@/lib/api"
import { Plus, Filter, X, Trash2 } from "lucide-react"

type Task = {
  id: string
  title: string
  description: string
  status: string
  priority?: string
  assignee?: string
  dueDate?: string
  projectId: string
}

const statusBadgeClass: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "In Progress": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "To Do": "bg-muted text-muted-foreground",
}

const statusToApi: Record<string, string> = {
  "To Do": "todo",
  "In Progress": "in_progress",
  Completed: "done",
}

const statusToUi = (status: unknown) => {
  if (status === "todo" || status === "To Do") return "To Do"
  if (status === "in_progress" || status === "in-progress" || status === "In Progress") return "In Progress"
  if (status === "done" || status === "Completed") return "Completed"
  return "To Do"
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [taskError, setTaskError] = useState("")

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const projectsResponse = await fetch(`${API_URL}/projects`, { credentials: "include" })
        if (!projectsResponse.ok) return
        const projectsData = await projectsResponse.json()
        const projects = getApiCollection<Record<string, unknown>>(projectsData, "projects")
        const projectIds = projects
          .map((project) => normalizeProject(project)?.id ?? null)
          .filter((projectId): projectId is string => Boolean(projectId))
        if (!projectIds.length) return
        setDefaultProjectId((currentProjectId) => currentProjectId ?? projectIds[0])
        const taskResponses = await Promise.all(projectIds.map((projectId: string) => fetch(`${API_URL}/tasks/${projectId}`, { credentials: "include" })))
        const taskGroups = await Promise.all(taskResponses.map(async (response, index) => {
          if (!response.ok) return []
          const data = await response.json()
          const loadedTasks = getApiCollection<Record<string, unknown>>(data, "tasks")
          return (loadedTasks ?? []).map((task: Record<string, unknown>) => {
            const taskId = task._id
            if (!taskId) return null
            return {
              ...task,
              id: String(taskId),
              title: String(task.title ?? "Untitled task"),
              description: String(task.description ?? ""),
              priority: String(task.priority ?? "Medium"),
              assignee: typeof task.assignedTo === "object" && task.assignedTo !== null
                ? String((task.assignedTo as Record<string, unknown>).name ?? (task.assignedTo as Record<string, unknown>).email ?? "Unassigned")
                : String(task.assignedTo ?? "Unassigned"),
              dueDate: String(task.dueDate ?? "Not set"),
              projectId: projectIds[index],
              status: statusToUi(task.status),
            }
          }).filter((task): task is NonNullable<typeof task> => task !== null)
        }))
        const loadedTasks = taskGroups.flat()
        setTasks(loadedTasks)
      } catch {
        setTasks([])
      }
    }

    loadTasks()
  }, [])

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    setTaskError("")

    const taskPayload = {
      title: title.trim(),
      description: description.trim(),
      status: "todo",
    }
    try {
      if (!defaultProjectId) {
        setTaskError("No project is available. Load or create a project before adding a task.")
        return
      }
      const response = await fetch(`${API_URL}/tasks/${defaultProjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload),
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) {
        setTaskError(data.message ?? "Task creation failed. Please check the task details.")
        return
      }
      const createdTask = getApiEntity<Record<string, unknown>>(data, "task")
      const taskId = createdTask._id
      if (!taskId) throw new Error("Created task did not include an ID")
      setTasks((currentTasks) => [...currentTasks, {
        ...createdTask,
        id: String(taskId),
        title: String(createdTask.title ?? taskPayload.title),
        description: String(createdTask.description ?? taskPayload.description),
        priority: String(createdTask.priority ?? "Medium"),
        assignee: String(createdTask.assignedTo ?? "Unassigned"),
        dueDate: String(createdTask.dueDate ?? "Not set"),
        projectId: defaultProjectId,
        status: statusToUi(createdTask.status),
      }])
    } catch {
      setTaskError("Could not reach the task service. Please try again.")
      return
    }
    setTitle("")
    setDescription("")
    setIsCreating(false)
  }

  const updateTaskStatus = async (taskId: string, projectId: string, status: string) => {
    if (!taskId || !projectId) return
    const previousStatus = tasks.find((task) => task.id === taskId)?.status
    if (!previousStatus) return
    try {
      const response = await fetch(`${API_URL}/tasks/${projectId}/t/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusToApi[status] ?? status }),
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || "Task status update failed")
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? { ...task, status } : task)))
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  const deleteTask = async (taskId: string, projectId: string) => {
    if (!taskId || !projectId) return
    try {
      const response = await fetch(`${API_URL}/tasks/${projectId}/t/${taskId}`, { method: "DELETE", credentials: "include" })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || "Task deletion failed")
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
    } catch (error) {
      console.error("Failed to delete task:", error)
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
          <Button className="gap-2" onClick={() => { setTaskError(""); setIsCreating(true) }}>
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
            {taskError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{taskError}</p>}
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
                          <span className="text-xs text-muted-foreground">Due {task.dueDate ?? "Not set"}</span>
                          <span className="text-xs text-muted-foreground">Assigned to {task.assignee ?? "Unassigned"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                      <Button variant="ghost" size="icon-sm" onClick={() => deleteTask(task.id, task.projectId)} aria-label={`Delete ${task.title}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
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
