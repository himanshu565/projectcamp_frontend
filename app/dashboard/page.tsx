"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { ProjectCard } from "@/app/components/projects/project-card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { API_URL, getApiCollection, getApiEntity, normalizeProject } from "@/lib/api"
import { Plus, X } from "lucide-react"

type Project = Record<string, unknown> & { id: string; name: string; description: string; memberCount: number; members?: unknown[] }

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState("Planning")
  const [members, setMembers] = useState<string[]>([])
  const [memberName, setMemberName] = useState("")
  const [projectError, setProjectError] = useState("")

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/projects`, { credentials: "include" })
        if (!response.ok) return
        const data = await response.json()
        const loadedProjects = getApiCollection<Record<string, unknown>>(data, "projects")
        if (!Array.isArray(loadedProjects)) return
        const normalizedProjects = loadedProjects.map(normalizeProject).filter((project): project is NonNullable<typeof project> => project !== null)
        setProjects(normalizedProjects.map((project) => ({
          ...project,
          memberCount: Array.isArray(project.members)
            ? project.members.length
            : typeof project.members === "number" ? project.members : project.memberCount ?? 0,
        })) as Project[])
      } catch {
        setProjects([])
      }
    }

    loadProjects()
  }, [])

  const addMember = () => {
    const trimmedName = memberName.trim()
    if (!trimmedName || members.includes(trimmedName)) return
    setMembers((currentMembers) => [...currentMembers, trimmedName])
    setMemberName("")
  }

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return
    setProjectError("")

    const normalizedName = name.trim().toLowerCase()
    if (projects.some((project) => project.name.trim().toLowerCase() === normalizedName)) {
      setProjectError("A project with this name already exists. Choose a different name.")
      return
    }

    const projectPayload = {
      name: name.trim(),
      description: description.trim(),
    }
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
      setProjects((currentProjects) => [...currentProjects, {
        ...normalizedProject,
        id: projectId,
        name: typeof createdProject.name === "string" ? createdProject.name : projectPayload.name,
        description: typeof createdProject.description === "string" ? createdProject.description : projectPayload.description,
        memberCount: Array.isArray(createdProject.members) ? createdProject.members.length : 0,
      }])
    } catch {
      setProjectError("Could not reach the project service. Please try again.")
      return
    }
    setName("")
    setDescription("")
    setStartDate("")
    setEndDate("")
    setStatus("Planning")
    setMembers([])
    setMemberName("")
    setIsCreating(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage and organize your projects</p>
          </div>
          <Button className="gap-2" onClick={() => { setProjectError(""); setIsCreating(true) }}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateProject} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Create project</h2>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsCreating(false)} aria-label="Close form">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {projectError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{projectError}</p>}
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" required autoFocus />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" rows={4} className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Start date
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                End date
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate || undefined} />
              </label>
            </div>
            <label className="space-y-2 text-sm font-medium">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option>Planning</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
            </label>
            <div className="space-y-2">
              <label htmlFor="new-project-member" className="text-sm font-medium">Members</label>
              <div className="flex gap-2">
                <Input id="new-project-member" value={memberName} onChange={(event) => setMemberName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addMember())} placeholder="Member name" />
                <Button type="button" variant="outline" onClick={addMember}>Add</Button>
              </div>
              {members.length > 0 && <div className="flex flex-wrap gap-2">{members.map((member) => <button key={member} type="button" onClick={() => setMembers((currentMembers) => currentMembers.filter((currentMember) => currentMember !== member))} className="rounded-full border px-3 py-1 text-xs hover:border-destructive hover:text-destructive" aria-label={`Remove ${member}`}>{member} x</button>)}</div>}
            </div>
            <Button type="submit">Create project</Button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
