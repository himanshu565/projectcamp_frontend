"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { ArrowRight, Calendar, Users } from "lucide-react"

interface ProjectCardProps {
  project: {
    id: string
    name?: string
    description?: string
    status?: string
    startDate?: string
    endDate?: string
    role?: string
    memberCount?: number
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  if (!project.id) return null

  const projectName = project.name || "Untitled project"
  const projectDescription = project.description || "No description available"

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 cursor-pointer group flex flex-col justify-between">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {projectName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {project.status && (
                <Badge variant="outline" className="text-xs">
                  {project.status}
                </Badge>
              )}
              {project.role && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {project.role.replace("_", " ")}
                </Badge>
              )}
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-1 shrink-0" />
            </div>
          </div>
          <CardTitle className="group-hover:text-primary transition-colors pt-2">{projectName}</CardTitle>
          <CardDescription className="line-clamp-2">{projectDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {project.startDate || "TBD"} &rarr; {project.endDate || "TBD"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Users className="w-4 h-4" />
            <span>
              {project.memberCount ?? 0} {project.memberCount === 1 ? "member" : "members"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
