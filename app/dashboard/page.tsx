"use client"

import { useState } from "react"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { ProjectCard } from "@/app/components/projects/project-card"
import { Button } from "@/app/components/ui/button"
import { Plus } from "lucide-react"

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
  const [projects] = useState(mockProjects)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage and organize your projects</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
