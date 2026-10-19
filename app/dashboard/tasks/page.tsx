"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Input } from "@/app/components/ui/input"
import { API_URL, getApiCollection, getApiEntity, normalizeProject } from "@/lib/api"
import { taskSchema } from "@/lib/validations"
import { AlertCircle, CheckSquare, Loader2, Plus, RotateCw, Search, Trash2, X } from "lucide-react"

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
  const [isLoading, setIsLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [taskError, setTaskError] = useState("")

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    setTasksError(null)
    setActionError(null)
    try {
      const projectsResponse = await fetch(`${API_URL}/projects`, { credentials: "include" })
      if (!projectsResponse.ok) {
        const errData = await projectsResponse.json().catch(() => null)
        setTasksError(errData?.message || `Failed to load projects (${projectsResponse.status})`)
        return
      }
      const projectsData = await projectsResponse.json()
      const projects = getApiCollection<Record<string, unknown>>(projectsData, "projects")
      const projectIds = projects
        .map((project) => normalizeProject(project)?.id ?? null)
        .filter((projectId): projectId is string => Boolean(projectId))

      if (!projectIds.length) {
        setTasks([])
        setTasksError(null)
        return
      }

      setDefaultProjectId((currentProjectId) => currentProjectId ?? projectIds[0])
      const taskResponses = await Promise.all(
        projectIds.map((projectId: string) =>
          fetch(`${API_URL}/tasks/${projectId}`, { credentials: "include" })
        )
      )

      let failedGroupCount = 0
      const taskGroups = await Promise.all(
        taskResponses.map(async (response, index) => {
          if (!response.ok) {
            failedGroupCount++
            return []
          }
          const data = await response.json()
          const loadedTasks = getApiCollection<Record<string, unknown>>(data, "tasks")
          return (loadedTasks ?? [])
            .map((task: Record<string, unknown>) => {
              const taskId = task._id
              if (!taskId) return null
              return {
                ...task,
                id: String(taskId),
                title: String(task.title ?? "Untitled task"),
                description: String(task.description ?? ""),
                priority: String(task.priority ?? "Medium"),
                assignee:
                  typeof task.assignedTo === "object" && task.assignedTo !== null
                    ? String(
                        (task.assignedTo as Record<string, unknown>).name ??
                          (task.assignedTo as Record<string, unknown>).email ??
                          "Unassigned"
                      )
                    : String(task.assignedTo ?? "Unassigned"),
                dueDate: String(task.dueDate ?? "Not set"),
                projectId: projectIds[index],
                status: statusToUi(task.status),
              }
            })
            .filter((task): task is NonNullable<typeof task> => task !== null)
        })
      )

      if (failedGroupCount === projectIds.length && projectIds.length > 0) {
        setTasksError("Unable to load tasks from project service.")
        return
      }

      const loadedTasks = taskGroups.flat()
      setTasks(loadedTasks)
      setTasksError(null)
    } catch {
      setTasksError("Unable to connect to the task service. Please check your network connection.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await loadTasks()
    }
    void init()
  }, [loadTasks])

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTaskError("")

    const validation = taskSchema.safeParse({
      title,
      description,
      status: "todo",
    })

    if (!validation.success) {
      setTaskError(validation.error.errors[0]?.message ?? "Please enter a valid task title.")
      return
    }

    if (!defaultProjectId) {
      setTaskError("No project is available. Load or create a project before adding a task.")
      return
    }

    setIsSubmitting(true)
    const taskPayload = {
      title: title.trim(),
      description: description.trim(),
      status: "todo",
    }

    try {
      const response = await fetch(`${API_URL}/tasks/${defaultProjectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload),
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setTaskError(data.message ?? "Task creation failed. Please check the task details.")
        return
      }
      const createdTask = getApiEntity<Record<string, unknown>>(data, "task")
      const taskId = createdTask._id
      if (!taskId) throw new Error("Created task did not include an ID")
      setTasks((currentTasks) => [
        {
          ...createdTask,
          id: String(taskId),
          title: String(createdTask.title ?? taskPayload.title),
          description: String(createdTask.description ?? taskPayload.description),
          priority: String(createdTask.priority ?? "Medium"),
          assignee: String(createdTask.assignedTo ?? "Unassigned"),
          dueDate: String(createdTask.dueDate ?? "Not set"),
          projectId: defaultProjectId,
          status: statusToUi(createdTask.status),
        },
        ...currentTasks,
      ])
      setTitle("")
      setDescription("")
      setIsCreating(false)
    } catch {
      setTaskError("Could not reach the task service. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
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
    const matchesFilter = filter === "all" || task.status.toLowerCase().replace(" ", "-") === filter
    const matchesPriority = priorityFilter === "all" || task.priority?.toLowerCase() === priorityFilter.toLowerCase()
    const matchesSearch =
      !searchQuery.trim() ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesPriority && matchesSearch
  })

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage and track all project tasks</p>
          </div>
          <Button
            className="gap-2 shrink-0 self-start sm:self-auto"
            onClick={() => {
              setTaskError("")
              setIsCreating(true)
            }}
          >
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>

        {actionError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {isCreating && (
          <form
            onSubmit={handleCreateTask}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsCreating(false)
            }}
            className="rounded-xl border bg-card p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Create task</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsCreating(false)}
                aria-label="Close task form"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {taskError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {taskError}
              </p>
            )}
            <div className="space-y-1">
              <label htmlFor="create-task-title" className="text-sm font-medium text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task title"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="create-task-desc" className="text-sm font-medium text-foreground">
                Description (optional)
              </label>
              <Input
                id="create-task-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Brief description of the task"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create task"
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {isLoading ? "..." : tasks.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {isLoading ? "..." : tasks.filter((t) => t.status === "In Progress").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {isLoading ? "..." : tasks.filter((t) => t.status === "Completed").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">To Do</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {isLoading ? "..." : tasks.filter((t) => t.status === "To Do").length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>View and manage all tasks across projects</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-44 pl-8 text-xs bg-background"
                    aria-label="Search tasks"
                  />
                </div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  aria-label="Filter tasks by priority"
                  className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 rounded-xl bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : tasksError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground">Failed to load tasks</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tasksError}</p>
                </div>
                <Button onClick={() => void loadTasks()} variant="default" size="sm" className="gap-2">
                  <RotateCw className="w-3.5 h-3.5" />
                  Try again
                </Button>
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
                <CheckSquare className="w-10 h-10 text-muted-foreground/60 mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground">No tasks yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                    Tasks help you break down project work and assign responsibility.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setTaskError("")
                    setIsCreating(true)
                  }}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create your first task
                </Button>
              </div>
            ) : (
              <Tabs value={filter} onValueChange={setFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="to-do">To Do</TabsTrigger>
                  <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="mt-6">
                  {filteredTasks.length === 0 ? (
                    <div className="rounded-xl border p-8 text-center text-muted-foreground space-y-2">
                      <p className="text-sm">No tasks match your current filters.</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setFilter("all")
                          setPriorityFilter("all")
                          setSearchQuery("")
                        }}
                      >
                        Reset filters
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-4 rounded-xl border hover:border-primary/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <h3 className="font-medium text-foreground truncate">
                              <Link
                                href={`/dashboard/tasks/${task.id}?projectId=${task.projectId}`}
                                className="hover:text-primary transition-colors"
                              >
                                {task.title}
                              </Link>
                            </h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-3">
                              <Badge variant="secondary">{task.priority}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Due {task.dueDate ?? "Not set"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Assigned to {task.assignee ?? "Unassigned"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={task.status}
                              onChange={(event) =>
                                void updateTaskStatus(task.id, task.projectId, event.target.value)
                              }
                              aria-label={`Update status for ${task.title}`}
                              className={`rounded-md border px-2 py-1 text-sm font-medium ${
                                statusBadgeClass[task.status] ?? "bg-muted text-muted-foreground"
                              }`}
                            >
                              <option value="To Do">To Do</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void deleteTask(task.id, task.projectId)}
                              aria-label={`Delete ${task.title}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
