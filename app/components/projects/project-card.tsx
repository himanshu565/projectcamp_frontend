"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { ArrowRight, Users } from "lucide-react"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    memberCount: number
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 cursor-pointer group">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </div>
          <CardTitle className="group-hover:text-primary transition-colors pt-2">{project.name}</CardTitle>
          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Users className="w-4 h-4" />
            <span>{project.memberCount} members</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
