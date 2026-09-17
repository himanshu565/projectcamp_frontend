"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, Edit2 } from "lucide-react"

const mockNotes = [
  {
    id: "1",
    title: "Design System Guidelines",
    content: "Document the design system including colors, typography, and component patterns",
    category: "Design",
    createdAt: "2024-02-10",
    updatedAt: "2024-02-12",
  },
  {
    id: "2",
    title: "API Endpoints List",
    content: "Complete list of all API endpoints with their parameters and response formats",
    category: "Development",
    createdAt: "2024-02-08",
    updatedAt: "2024-02-11",
  },
  {
    id: "3",
    title: "Meeting Notes - Feb 10",
    content: "Discussion about project timeline, deliverables, and team responsibilities",
    category: "Meeting",
    createdAt: "2024-02-10",
    updatedAt: "2024-02-10",
  },
  {
    id: "4",
    title: "Database Schema",
    content: "Database structure including tables, relationships, and indexes",
    category: "Development",
    createdAt: "2024-02-05",
    updatedAt: "2024-02-09",
  },
  {
    id: "5",
    title: "User Feedback Summary",
    content: "Compiled feedback from user testing sessions and feature requests",
    category: "Feedback",
    createdAt: "2024-02-07",
    updatedAt: "2024-02-12",
  },
]

const categories = ["All", "Design", "Development", "Meeting", "Feedback"]

export default function NotesPage() {
  const [notes] = useState(mockNotes)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || note.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categoryColors: Record<string, string> = {
    Design: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    Development: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    Meeting: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Feedback: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  }
  const getCategoryColor = (category: string) => categoryColors[category] || "bg-muted text-muted-foreground"

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notes</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create and organize project notes</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                      {note.title}
                    </CardTitle>
                    <span
                      className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryColor(note.category)}`}
                    >
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
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No notes found. Create a new note to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
