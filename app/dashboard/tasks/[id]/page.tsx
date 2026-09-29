"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

const mockTask = {
  id: "1",
  title: "Design new landing page",
  description: "Create a modern, responsive landing page for the new product launch",
  status: "in-progress",
  priority: "high",
  assignee: { name: "Sarah Chen", avatar: "/diverse-avatars.png" },
  dueDate: "2024-12-15",
  createdAt: "2024-11-01",
  subtasks: [
    { id: "s1", title: "Create wireframes", completed: true, assignee: "Sarah Chen" },
    { id: "s2", title: "Design mockups in Figma", completed: true, assignee: "Sarah Chen" },
    { id: "s3", title: "Get stakeholder feedback", completed: false, assignee: "John Doe" },
    { id: "s4", title: "Finalize design system", completed: false, assignee: "Sarah Chen" },
  ],
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

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const projectId = "1";
  const { id: taskId } = use(params);
  const [task, setTask] = useState(mockTask);
  const [subtasks, setSubtasks] = useState(mockTask.subtasks);
  const [newSubtask, setNewSubtask] = useState("");
  const [status, setStatus] = useState(mockTask.status);

  useEffect(() => {
    const loadTask = async () => {
      try {
        const response = await fetch(`/api/v1/tasks/${projectId}/t/${taskId}`);
        if (!response.ok) return;
        const data = await response.json();
        const loadedTask = data.task || data;
        if (!loadedTask?.id) return;
        setTask(loadedTask);
        setStatus(loadedTask.status || mockTask.status);
        setSubtasks(loadedTask.subtasks || []);
      } catch {
        // Keep the local fallback when the API is unavailable.
      }
    };

    loadTask();
  }, [taskId]);

  const updateTaskStatus = async (nextStatus: string) => {
    setStatus(nextStatus);
    try {
      await fetch(`/api/v1/tasks/${projectId}/t/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      // Keep the optimistic update when the API is unavailable.
    }
  };

  const toggleSubtask = (id: string) => {
    setSubtasks((currentSubtasks) =>
      currentSubtasks.map((subtask) =>
        subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask,
      ),
    );
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((currentSubtasks) => [
      ...currentSubtasks,
      { id: `s${Date.now()}`, title: newSubtask.trim(), completed: false, assignee: "Unassigned" },
    ]);
    setNewSubtask("");
  };

  const deleteSubtask = (id: string) => {
    setSubtasks((currentSubtasks) => currentSubtasks.filter((subtask) => subtask.id !== id));
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
                <div><p className="text-sm text-muted-foreground">Due Date</p><p className="text-foreground font-medium mt-1">{task.dueDate}</p></div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-semibold text-foreground">Subtasks</h2><span className="text-sm text-muted-foreground">{completedCount} of {subtasks.length} completed</span></div>
              <div className="mb-6"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-foreground">Progress</span><span className="text-sm text-muted-foreground">{Math.round(completionPercentage)}%</span></div><div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%` }} /></div></div>
              <div className="space-y-2 mb-6">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors">
                    <button onClick={() => toggleSubtask(subtask.id)} aria-label={`Mark ${subtask.title} ${subtask.completed ? "incomplete" : "complete"}`} className="shrink-0 text-primary hover:text-primary/80 transition-colors">{subtask.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}</button>
                    <div className="flex-1 min-w-0"><p className={`text-sm font-medium ${subtask.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{subtask.title}</p><p className="text-xs text-muted-foreground">{subtask.assignee}</p></div>
                    <button onClick={() => deleteSubtask(subtask.id)} aria-label={`Delete ${subtask.title}`} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2"><Input placeholder="Add a new subtask..." value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSubtask()} className="flex-1" /><Button onClick={addSubtask} size="sm" className="gap-2"><Plus className="w-4 h-4" />Add</Button></div>
            </Card>
          </div>
          <Card className="p-6 h-fit"><h3 className="text-sm font-semibold text-foreground mb-4">Activity</h3><div className="space-y-3 text-sm"><div className="text-muted-foreground"><p className="font-medium text-foreground">Created</p><p>{task.createdAt}</p></div><div className="text-muted-foreground"><p className="font-medium text-foreground">Last Updated</p><p>2 hours ago</p></div></div></Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
