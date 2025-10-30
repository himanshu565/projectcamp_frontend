"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

export function NoteCard({ note }: NoteCardProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Design: "bg-purple-500/20 text-purple-400",
      Development: "bg-blue-500/20 text-blue-400",
      Meeting: "bg-green-500/20 text-green-400",
      Feedback: "bg-orange-500/20 text-orange-400",
    }
    return colors[category] || "bg-gray-500/20 text-gray-400"
  }

  return (
    <Card className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">{note.title}</CardTitle>
            <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${getCategoryColor(note.category)}`}>
              {note.category}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updated: {note.updatedAt}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
