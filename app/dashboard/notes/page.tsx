"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Textarea } from "@/app/components/ui/textarea"
import { API_URL, getApiCollection, getPersistedId } from "@/lib/api"
import { Plus, Search, Trash2, Edit2 } from "lucide-react"

type Note = {
  id: string
  title: string
  content: string
  category: string
  createdAt?: string
  updatedAt?: string
}

const categories = ["All", "Design", "Development", "Meeting", "Feedback"]

export default function NotesPage() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isCreating, setIsCreating] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [noteCategory, setNoteCategory] = useState("Design")

  useEffect(() => {
    const loadProjectAndNotes = async () => {
      try {
        const requestedProjectId = new URLSearchParams(window.location.search).get("projectId")
        let resolvedProjectId = requestedProjectId
        if (!resolvedProjectId) {
          const projectsResponse = await fetch(`${API_URL}/projects`, { credentials: "include" })
          if (!projectsResponse.ok) return
          const projectsData = await projectsResponse.json()
          const projects = getApiCollection<{ _id?: string }>(projectsData, "projects")
          resolvedProjectId = projects?.[0]?._id ?? null
        }
        if (!resolvedProjectId) return
        setProjectId(resolvedProjectId)

        const response = await fetch(`${API_URL}/notes/${resolvedProjectId}`, { credentials: "include" })
        if (!response.ok) return
        const data = await response.json()
        const loadedNotes = getApiCollection<Record<string, unknown>>(data, "notes")
        setNotes(loadedNotes.map((note) => {
          const id = getPersistedId(note)
          if (!id) return null
          return {
            ...note,
            id,
            title: String(note.title ?? "Untitled note"),
            content: String(note.content ?? ""),
            category: String(note.category ?? "General"),
          }
        }).filter(Boolean) as Note[])
      } catch {
        setNotes([])
      }
    }

    loadProjectAndNotes()
  }, [])

  const resetNoteForm = () => {
    setIsCreating(false)
    setEditingNoteId(null)
    setNoteTitle("")
    setNoteContent("")
    setNoteCategory("Design")
  }

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteCategory(note.category)
    setIsCreating(true)
  }

  const saveNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!noteTitle.trim() || !noteContent.trim()) return

    if (editingNoteId && !projectId) return
    if (editingNoteId && editingNoteId.startsWith("local-")) return
    const notePayload = { content: noteContent.trim() }
    const endpoint = editingNoteId && projectId
      ? `${API_URL}/notes/${projectId}/n/${editingNoteId}`
      : projectId
        ? `${API_URL}/notes/${projectId}`
        : null

    try {
      if (!endpoint) throw new Error("No project selected")
      const response = await fetch(endpoint, {
        method: editingNoteId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notePayload),
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || "Note request failed")
      const returnedNote = (data?.note ?? data?.data?.note ?? data?.data ?? data) as Record<string, unknown>
      const noteId = getPersistedId(returnedNote)
      if (!noteId) throw new Error("Saved note did not include an ID")
      const savedNote: Note = {
        ...returnedNote,
        id: noteId,
        title: String(returnedNote.title ?? noteTitle.trim()),
        content: String(returnedNote.content ?? notePayload.content),
        category: String(returnedNote.category ?? noteCategory),
      }
      setNotes((currentNotes) => editingNoteId
        ? currentNotes.map((currentNote) => currentNote.id === editingNoteId ? savedNote : currentNote)
        : [...currentNotes, savedNote])
      resetNoteForm()
    } catch (error) {
      console.error("Failed to save note:", error)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!projectId || !noteId || noteId.startsWith("local-")) return
    try {
      const response = await fetch(`${API_URL}/notes/${projectId}/n/${noteId}`, { method: "DELETE", credentials: "include" })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || "Note deletion failed")
      setNotes((currentNotes) => currentNotes.filter((note) => note.id !== noteId))
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

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
          <Button className="gap-2" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>

        {isCreating && (
          <form onSubmit={saveNote} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editingNoteId ? "Edit note" : "Create note"}</h2>
              <Button type="button" variant="outline" onClick={resetNoteForm}>Cancel</Button>
            </div>
            <Input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Note title" required autoFocus />
            <Textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Write your note..." rows={8} required />
            <select value={noteCategory} onChange={(event) => setNoteCategory(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
              {categories.slice(1).map((category) => <option key={category}>{category}</option>)}
            </select>
            <Button type="submit">{editingNoteId ? "Save note" : "Create note"}</Button>
          </form>
        )}

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
                  <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEditing(note)} aria-label={`Edit ${note.title}`}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                  <span>Updated {note.updatedAt ?? "-"}</span>
                  <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:text-destructive" onClick={() => deleteNote(note.id)} aria-label={`Delete ${note.title}`}>
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
