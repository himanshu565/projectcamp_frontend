"use client"

import { useState } from "react"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { ProjectCard } from "@/app/components/projects/project-card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
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

  const handleCreateProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return

    setProjects((currentProjects) => [
      ...currentProjects,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim() || "No description yet",
        memberCount: 1,
      },
    ])
    setName("")
    setDescription("")
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
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" />
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
