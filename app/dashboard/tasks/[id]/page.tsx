"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, Pencil } from "lucide-react";
import Link from "next/link";
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { API_URL, getApiCollection, getApiEntity, getAuthHeaders, normalizeProject } from "@/lib/api";

const emptyTask = {
  id: "",
  title: "",
  description: "",
  status: "todo",
  priority: "",
  assignee: { name: "Unassigned", avatar: "" },
  dueDate: "",
  createdAt: "",
  project: { name: "" },
  subtasks: [] as { id: string; title: string; completed: boolean; assignee: string }[],
};

const priorityBadgeClass: Record<string, string> = {
  high: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

const statusBadgeClass: Record<string, string> = {
  "in-progress": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  todo: "bg-muted text-muted-foreground",
};

const statusToApi: Record<string, string> = {
  todo: "todo",
  "in-progress": "in_progress",
  done: "done",
};

const statusToUi = (status: unknown) => {
  if (status === "todo") return "todo";
  if (status === "in_progress" || status === "in-progress") return "in-progress";
  return "done";
};

type TaskMember = { id: string; name: string };
type Subtask = { id: string; title: string; completed: boolean; assignee: string };

const normalizeSubtask = (value: unknown): Subtask | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = record._id ?? record.id;
  if (!id || !record.title) return null;
  return {
    id: String(id),
    title: String(record.title),
    completed: Boolean(record.isCompleted ?? record.completed),
    assignee: "Unassigned",
  };
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = use(params);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [task, setTask] = useState(emptyTask);
  const [subtasks, setSubtasks] = useState<Subtask[]>(emptyTask.subtasks);
  const [newSubtask, setNewSubtask] = useState("");
  const [status, setStatus] = useState(emptyTask.status);
  const [subtaskError, setSubtaskError] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [members, setMembers] = useState<TaskMember[]>([]);
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    const loadTask = async () => {
      try {
        let resolvedProjectId = new URLSearchParams(window.location.search).get("projectId");
        if (!resolvedProjectId) {
          const projectsResponse = await fetch(`${API_URL}/projects`, { credentials: "include" });
          if (!projectsResponse.ok) return;
          const projectsData = await projectsResponse.json();
          const projects = getApiCollection<Record<string, unknown>>(projectsData, "projects");
          resolvedProjectId = normalizeProject(projects?.[0] ?? {})?.id ?? null;
        }
        if (!resolvedProjectId) return;
        setProjectId(resolvedProjectId);
        const response = await fetch(`${API_URL}/tasks/${resolvedProjectId}/t/${taskId}`, { credentials: "include" });
        if (!response.ok) return;
        const data = await response.json();
        const taskRecord = getApiEntity<Record<string, unknown>>(data, "task");
        if (!taskRecord?._id) return;
        const assignedUser = taskRecord.assignedTo && typeof taskRecord.assignedTo === "object"
          ? taskRecord.assignedTo as Record<string, unknown>
          : null;
        const loadedTask = {
          ...emptyTask,
          ...taskRecord,
          id: String(taskRecord._id),
          assignee: assignedUser
            ? { name: String(assignedUser.fullName ?? assignedUser.username ?? assignedUser.name ?? assignedUser.email ?? "Unassigned"), avatar: String(assignedUser.avatar ?? "") }
            : emptyTask.assignee,
          project: taskRecord.project && typeof taskRecord.project === "object"
            ? { name: String((taskRecord.project as Record<string, unknown>).name ?? "Project unavailable") }
            : emptyTask.project,
          subtasks: Array.isArray(taskRecord.subtasks)
            ? taskRecord.subtasks.map(normalizeSubtask).filter((subtask): subtask is Subtask => subtask !== null)
            : emptyTask.subtasks,
        };
        setTask(loadedTask);
        setStatus(statusToUi(taskRecord.status));
        setAssignedTo(assignedUser?._id ? String(assignedUser._id) : "");
        setSubtasks(loadedTask.subtasks);

        const membersResponse = await fetch(`${API_URL}/projects/${resolvedProjectId}/members`, {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          const projectMembers = getApiCollection<Record<string, unknown>>(membersData, "members")
            .map((member) => {
              const user = member.user && typeof member.user === "object"
                ? member.user as Record<string, unknown>
                : member;
              const id = user._id ?? user.id;
              if (!id) return null;
              return {
                id: String(id),
                name: String(user.fullName ?? user.username ?? user.name ?? user.email ?? "Unnamed member"),
              };
            })
            .filter((member): member is TaskMember => member !== null);
          setMembers(projectMembers);
        }
      } catch (error) {
        console.error("Failed to fetch task:", error);
      }
    };

    loadTask();
  }, [taskId]);

  const updateTaskStatus = async (nextStatus: string, nextAssignedTo = assignedTo) => {
    if (!projectId || !taskId) return;
    const previousStatus = status;
    try {
      const response = await fetch(`${API_URL}/tasks/${projectId}/t/${taskId}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusToApi[nextStatus] ?? nextStatus,
          ...(nextAssignedTo ? { assignedTo: nextAssignedTo } : {}),
        }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Task status update failed");
      const updatedTask = getApiEntity<Record<string, unknown>>(data, "task");
      const updatedAssignee = updatedTask.assignedTo && typeof updatedTask.assignedTo === "object"
        ? updatedTask.assignedTo as Record<string, unknown>
        : null;
      setTask((currentTask) => ({
        ...currentTask,
        ...updatedTask,
        title: String(updatedTask.title ?? currentTask.title),
        description: String(updatedTask.description ?? currentTask.description),
        assignee: updatedAssignee
          ? {
            name: String(updatedAssignee.fullName ?? updatedAssignee.username ?? updatedAssignee.name ?? updatedAssignee.email ?? "Unassigned"),
            avatar: String(updatedAssignee.avatar ?? ""),
          }
          : currentTask.assignee,
        project: updatedTask.project && typeof updatedTask.project === "object"
          ? { name: String((updatedTask.project as Record<string, unknown>).name ?? "Project unavailable") }
          : currentTask.project,
      }));
      setStatus(statusToUi(updatedTask.status ?? nextStatus));
    } catch (error) {
      setStatus(previousStatus);
      console.error("Failed to update task:", error);
    }
  };

  const updateSubtask = async (id: string, changes: { title?: string; isCompleted?: boolean }) => {
    if (!projectId) return false;
    const response = await fetch(`${API_URL}/tasks/${projectId}/st/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(changes),
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || "Subtask update failed");
    const updated = normalizeSubtask(getApiEntity<Record<string, unknown>>(data, "subtask"));
    if (updated) {
      setSubtasks((currentSubtasks) => currentSubtasks.map((subtask) => subtask.id === id ? updated : subtask));
    }
    return true;
  };

  const toggleSubtask = async (id: string) => {
    const current = subtasks.find((subtask) => subtask.id === id);
    if (!current) return;
    setSubtaskError("");
    try {
      await updateSubtask(id, { isCompleted: !current.completed });
    } catch (error) {
      setSubtaskError(error instanceof Error ? error.message : "Subtask update failed");
    }
  };

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    setSubtaskError("");
    try {
      if (!projectId) throw new Error("Project unavailable");
      const response = await fetch(`${API_URL}/tasks/${projectId}/t/${taskId}/subtasks`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtask.trim() }),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Subtask creation failed");
      const created = normalizeSubtask(getApiEntity<Record<string, unknown>>(data, "subtask"));
      if (!created) throw new Error("Subtask response did not include an ID");
      setSubtasks((currentSubtasks) => [...currentSubtasks, created]);
      setNewSubtask("");
    } catch (error) {
      setSubtaskError(error instanceof Error ? error.message : "Subtask creation failed");
    }
  };

  const deleteSubtask = async (id: string) => {
    setSubtaskError("");
    try {
      if (!projectId) throw new Error("Project unavailable");
      const response = await fetch(`${API_URL}/tasks/${projectId}/st/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Subtask deletion failed");
      setSubtasks((currentSubtasks) => currentSubtasks.filter((subtask) => subtask.id !== id));
    } catch (error) {
      setSubtaskError(error instanceof Error ? error.message : "Subtask deletion failed");
    }
  };

  const saveSubtaskTitle = async (id: string) => {
    const title = editingSubtaskTitle.trim();
    if (!title) return;
    setSubtaskError("");
    try {
      await updateSubtask(id, { title });
      setEditingSubtaskId(null);
      setEditingSubtaskTitle("");
    } catch (error) {
      setSubtaskError(error instanceof Error ? error.message : "Subtask update failed");
    }
  };

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  const completionPercentage = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="icon" aria-label="Back to tasks">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{task.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{task.project.name || "Project unavailable"}</p>
            <p className="text-muted-foreground mt-1 text-sm">{task.description}</p>
          </div>
          <select
            value={status}
            onChange={(event) => updateTaskStatus(event.target.value)}
            aria-label="Update task status"
            className={`rounded-md border px-3 py-2 text-sm font-medium capitalize ${statusBadgeClass[status] ?? "bg-muted text-muted-foreground"}`}
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Completed</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Task Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Status</p><p className="text-foreground font-medium capitalize mt-1">{status.replace("-", " ")}</p></div>
                <div><p className="text-sm text-muted-foreground">Priority</p><Badge className={`mt-1 ${priorityBadgeClass[task.priority] ?? "bg-muted text-muted-foreground"}`}>{task.priority}</Badge></div>
                <div><p className="text-sm text-muted-foreground">Assigned To</p><p className="text-foreground font-medium mt-1">{task.assignee.name}</p></div>
                <div>
                  <label htmlFor="task-assignee" className="text-sm text-muted-foreground">Assign To</label>
                  <select
                    id="task-assignee"
                    value={assignedTo}
                    onChange={(event) => {
                      const nextAssignedTo = event.target.value;
                      setAssignedTo(nextAssignedTo);
                      void updateTaskStatus(status, nextAssignedTo);
                    }}
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                </div>
                <div><p className="text-sm text-muted-foreground">Due Date</p><p className="text-foreground font-medium mt-1">{task.dueDate}</p></div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-semibold text-foreground">Subtasks</h2><span className="text-sm text-muted-foreground">{completedCount} of {subtasks.length} completed</span></div>
              {subtaskError && <p role="alert" className="mb-4 text-sm text-destructive">{subtaskError}</p>}
              <div className="mb-6"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-foreground">Progress</span><span className="text-sm text-muted-foreground">{Math.round(completionPercentage)}%</span></div><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%` }} /></div></div>
              <div className="space-y-2 mb-6">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors">
                    <button onClick={() => toggleSubtask(subtask.id)} aria-label={`Mark ${subtask.title} ${subtask.completed ? "incomplete" : "complete"}`} className="shrink-0 text-primary hover:text-primary/80 transition-colors">{subtask.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}</button>
                    <div className="flex-1 min-w-0">
                      {editingSubtaskId === subtask.id ? (
                        <Input
                          value={editingSubtaskTitle}
                          onChange={(event) => setEditingSubtaskTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") { event.preventDefault(); void saveSubtaskTitle(subtask.id); }
                            if (event.key === "Escape") setEditingSubtaskId(null);
                          }}
                          autoFocus
                          aria-label={`Edit ${subtask.title}`}
                          className="h-8"
                        />
                      ) : (
                        <p className={`text-sm font-medium ${subtask.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{subtask.title}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{subtask.assignee}</p>
                    </div>
                    {editingSubtaskId === subtask.id ? (
                      <Button variant="ghost" size="sm" onClick={() => void saveSubtaskTitle(subtask.id)}>Save</Button>
                    ) : (
                      <button
                        onClick={() => { setEditingSubtaskId(subtask.id); setEditingSubtaskTitle(subtask.title); }}
                        aria-label={`Edit ${subtask.title}`}
                        className="shrink-0 text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteSubtask(subtask.id)} aria-label={`Delete ${subtask.title}`} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2"><Input placeholder="Add a new subtask..." value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addSubtask(); } }} className="flex-1" /><Button onClick={() => void addSubtask()} size="sm" className="gap-2"><Plus className="w-4 h-4" />Add</Button></div>
            </Card>
          </div>
          <Card className="p-6 h-fit"><h3 className="text-sm font-semibold text-foreground mb-4">Activity</h3><div className="space-y-3 text-sm"><div className="text-muted-foreground"><p className="font-medium text-foreground">Created</p><p>{task.createdAt}</p></div><div className="text-muted-foreground"><p className="font-medium text-foreground">Last Updated</p><p>2 hours ago</p></div></div></Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
