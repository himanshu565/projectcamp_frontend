"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { ProjectCard } from "@/app/components/projects/project-card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { API_URL, getApiCollection, getApiEntity, normalizeProject } from "@/lib/api"
import { FolderKanban, Loader2, Plus, Search, X } from "lucide-react"

interface ProjectItem {
  id: string
  name: string
  description?: string
  status?: string
  startDate?: string
  endDate?: string
  role?: string
  memberCount: number
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Project creation form state
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState("Planning")
  const [memberEmails, setMemberEmails] = useState<string[]>([])
  const [currentMemberEmail, setCurrentMemberEmail] = useState("")
  const [memberEmailError, setMemberEmailError] = useState("")
  const [projectError, setProjectError] = useState("")
  const [creationNotice, setCreationNotice] = useState("")

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/projects`, { credentials: "include" })
      if (!response.ok) {
        setProjects([])
        return
      }
      const data = await response.json()
      const loadedProjects = getApiCollection<Record<string, unknown>>(data, "projects")
      if (!Array.isArray(loadedProjects)) {
        setProjects([])
        return
      }
      const normalizedProjects = loadedProjects
        .map(normalizeProject)
        .filter((project): project is NonNullable<typeof project> => project !== null)
        .map((project) => ({
          id: project.id,
          name: typeof project.name === "string" ? project.name : "Untitled project",
          description: typeof project.description === "string" ? project.description : "",
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          role: project.role,
          memberCount: project.memberCount ?? 0,
        }))
      setProjects(normalizedProjects)
    } catch {
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const addMemberEmail = () => {
    setMemberEmailError("")
    const email = currentMemberEmail.trim().toLowerCase()
    if (!email) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMemberEmailError("Please enter a valid email address.")
      return
    }
    if (memberEmails.includes(email)) {
      setMemberEmailError("This email is already in the list.")
      return
    }
    setMemberEmails((current) => [...current, email])
    setCurrentMemberEmail("")
  }

  const removeMemberEmail = (emailToRemove: string) => {
    setMemberEmails((current) => current.filter((email) => email !== emailToRemove))
  }

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return
    setProjectError("")
    setCreationNotice("")

    const normalizedName = name.trim().toLowerCase()
    if (projects.some((project) => project.name.trim().toLowerCase() === normalizedName)) {
      setProjectError("A project with this name already exists. Choose a different name.")
      return
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setProjectError("End date cannot be earlier than start date.")
      return
    }

    setIsSubmitting(true)

    const projectPayload: Record<string, string> = {
      name: name.trim(),
      description: description.trim(),
      status,
    }
    if (startDate) projectPayload.startDate = startDate
    if (endDate) projectPayload.endDate = endDate

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload),
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) {
        setProjectError(
          data.message ??
            (response.status === 409
              ? "A project with this name already exists."
              : "Project creation failed. Please try again."),
        )
        return
      }

      const createdProject = getApiEntity<Record<string, unknown>>(data, "project")
      const normalizedProject = normalizeProject(createdProject)
      const projectId = normalizedProject?.id
      if (!projectId) throw new Error("Created project did not include an ID")

      let addedMembersCount = 1 // Creator is admin
      const memberFailures: string[] = []

      // Add specified initial members via backend endpoint
      for (const email of memberEmails) {
        try {
          const memberRes = await fetch(`${API_URL}/projects/${projectId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role: "member" }),
            credentials: "include",
          })
          if (memberRes.ok) {
            addedMembersCount++
          } else {
            const memberData = await memberRes.json().catch(() => ({}))
            memberFailures.push(`${email} (${memberData.message || "user not found"})`)
          }
        } catch {
          memberFailures.push(`${email} (network error)`)
        }
      }

      const newProjectItem: ProjectItem = {
        id: projectId,
        name: typeof createdProject.name === "string" ? createdProject.name : projectPayload.name,
        description: typeof createdProject.description === "string" ? createdProject.description : projectPayload.description,
        status: typeof createdProject.status === "string" ? createdProject.status : projectPayload.status,
        startDate: typeof createdProject.startDate === "string" ? createdProject.startDate : projectPayload.startDate,
        endDate: typeof createdProject.endDate === "string" ? createdProject.endDate : projectPayload.endDate,
        role: "admin",
        memberCount: addedMembersCount,
      }

      setProjects((currentProjects) => [newProjectItem, ...currentProjects])

      if (memberFailures.length > 0) {
        setCreationNotice(`Project created, but these members could not be added: ${memberFailures.join(", ")}`)
      }

      // Reset form
      setName("")
      setDescription("")
      setStartDate("")
      setEndDate("")
      setStatus("Planning")
      setMemberEmails([])
      setCurrentMemberEmail("")
      setIsCreating(false)
    } catch {
      setProjectError("Could not reach the project service. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredProjects = projects.filter((project) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      project.name.toLowerCase().includes(q) ||
      (project.description && project.description.toLowerCase().includes(q))
    )
  })

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage and organize your projects</p>
          </div>
          <Button
            className="gap-2 shrink-0 self-start sm:self-auto"
            onClick={() => {
              setProjectError("")
              setCreationNotice("")
              setIsCreating(true)
            }}
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {creationNotice && (
          <div
            role="status"
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
          >
            {creationNotice}
          </div>
        )}

        {isCreating && (
          <form onSubmit={handleCreateProject} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Create project</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsCreating(false)}
                aria-label="Close form"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {projectError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {projectError}
              </p>
            )}
            <div className="space-y-1">
              <label htmlFor="create-project-name" className="text-sm font-medium text-foreground">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Website Redesign"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="create-project-description" className="text-sm font-medium text-foreground">
                Description (optional)
              </label>
              <textarea
                id="create-project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Brief summary of goals and objectives"
                rows={3}
                className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="create-project-start-date" className="text-sm font-medium text-foreground">
                  Start date
                </label>
                <Input
                  id="create-project-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="create-project-end-date" className="text-sm font-medium text-foreground">
                  End date
                </label>
                <Input
                  id="create-project-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate || undefined}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="create-project-status" className="text-sm font-medium text-foreground">
                Status
              </label>
              <select
                id="create-project-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="new-project-member-email" className="text-sm font-medium text-foreground">
                Initial Team Members (by registered email)
              </label>
              <div className="flex gap-2">
                <Input
                  id="new-project-member-email"
                  type="email"
                  value={currentMemberEmail}
                  onChange={(event) => {
                    setCurrentMemberEmail(event.target.value)
                    setMemberEmailError("")
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addMemberEmail()
                    }
                  }}
                  placeholder="colleague@example.com"
                />
                <Button type="button" variant="outline" onClick={addMemberEmail}>
                  Add
                </Button>
              </div>
              {memberEmailError && (
                <p role="alert" className="text-xs text-destructive">
                  {memberEmailError}
                </p>
              )}
              {memberEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {memberEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/50 px-3 py-1 text-xs text-foreground"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeMemberEmail(email)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${email}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  "Create project"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Project grid or states */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 rounded-xl border bg-card/50 p-6 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-muted" />
                  <div className="h-5 w-1/2 rounded bg-muted" />
                  <div className="h-4 w-4/5 rounded bg-muted" />
                </div>
                <div className="h-4 w-1/3 rounded bg-muted pt-2 border-t" />
              </div>
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No projects yet</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1 mb-6">
              Create your first project to start organizing tasks, managing team members, and tracking progress.
            </p>
            <Button
              onClick={() => {
                setProjectError("")
                setIsCreating(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            <p className="text-sm">No projects match &ldquo;{searchQuery}&rdquo;</p>
            <Button variant="link" size="sm" onClick={() => setSearchQuery("")} className="mt-2">
              Clear search filter
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
