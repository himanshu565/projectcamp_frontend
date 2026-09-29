"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { ProjectCard } from "@/app/components/projects/project-card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { API_URL } from "@/lib/api"
import { Plus, X } from "lucide-react"

// Mock data - will be replaced with API calls
const mockProjects = [
  {
    id: "1",
    name: "Website Redesign",
    description: "Complete redesign of the company website with modern UI/UX",
    memberCount: 5,
  },
  {
    id: "2",
    name: "Mobile App Development",
    description: "Building a cross-platform mobile application",
    memberCount: 8,
  },
  {
    id: "3",
    name: "API Integration",
    description: "Integrating third-party APIs into our platform",
    memberCount: 3,
  },
  {
    id: "4",
    name: "Database Migration",
    description: "Migrating from legacy database to modern cloud solution",
    memberCount: 4,
  },
]

export default function DashboardPage() {
  const [projects, setProjects] = useState(mockProjects)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState("Planning")
  const [members, setMembers] = useState<string[]>([])
  const [memberName, setMemberName] = useState("")

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/projects`, { credentials: "include" })
        if (!response.ok) return
        const data = await response.json()
        const loadedProjects = Array.isArray(data) ? data : data.projects
        if (!Array.isArray(loadedProjects)) return
        setProjects(loadedProjects.map((project) => ({
          ...project,
          id: project._id ?? project.id,
          memberCount: project.members?.length ?? project.memberCount ?? 0,
        })))
      } catch {
        // Keep the local fallback when the API is unavailable.
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

    const projectPayload = {
      name: name.trim(),
      description: description.trim() || "No description yet",
      startDate,
      endDate,
      status,
      members,
    }
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload),
        credentials: "include",
      })
      if (!response.ok) throw new Error("Project creation failed")
      const data = await response.json()
      const createdProject = data.project ?? data
      setProjects((currentProjects) => [...currentProjects, {
        ...createdProject,
        id: createdProject._id ?? createdProject.id,
        name: createdProject.name ?? projectPayload.name,
        description: createdProject.description ?? projectPayload.description,
        memberCount: createdProject.members?.length ?? members.length,
      }])
    } catch {
      setProjects((currentProjects) => [...currentProjects, {
        ...projectPayload,
        id: `local-${Date.now()}`,
        memberCount: members.length,
      }])
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
          <Button className="gap-2" onClick={() => setIsCreating(true)}>
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
