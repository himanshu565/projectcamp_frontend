"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Edit2, Trash2 } from "lucide-react"

interface NoteCardProps {
  note: {
    id: string
    title: string
    content: string
    category: string
    updatedAt: string
  }
}

const categoryColors: Record<string, string> = {
  Design: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  Development: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Meeting: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Feedback: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
}

export function NoteCard({ note }: NoteCardProps) {
  const getCategoryColor = (category: string) =>
    categoryColors[category] || "bg-muted text-muted-foreground"

  return (
    <Card className="transition-all hover:shadow-md hover:border-primary/40 cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">{note.title}</CardTitle>
            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryColor(note.category)}`}>
              {note.category}
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          <span>Updated {note.updatedAt}</span>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
