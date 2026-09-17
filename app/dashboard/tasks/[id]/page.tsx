"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Mock data for task details
const mockTask = {
  id: "1",
  title: "Design new landing page",
  description:
    "Create a modern, responsive landing page for the new product launch",
  status: "in-progress",
  priority: "high",
  assignee: {
    name: "Sarah Chen",
    avatar: "/diverse-avatars.png",
  },
  dueDate: "2024-12-15",
  createdAt: "2024-11-01",
  subtasks: [
    {
      id: "s1",
      title: "Create wireframes",
      completed: true,
      assignee: "Sarah Chen",
    },
    {
      id: "s2",
      title: "Design mockups in Figma",
      completed: true,
      assignee: "Sarah Chen",
    },
    {
      id: "s3",
      title: "Get stakeholder feedback",
      completed: false,
      assignee: "John Doe",
    },
    {
      id: "s4",
      title: "Finalize design system",
      completed: false,
      assignee: "Sarah Chen",
    },
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

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const [subtasks, setSubtasks] = useState(mockTask.subtasks);
  const [newSubtask, setNewSubtask] = useState("");

  const toggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([
        ...subtasks,
        {
          id: `s${Date.now()}`,
          title: newSubtask,
          completed: false,
          assignee: "Unassigned",
        },
      ]);
      setNewSubtask("");
    }
  };

  const deleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const completedCount = subtasks.filter((st) => st.completed).length;
  const completionPercentage =
    subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {mockTask.title}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{mockTask.description}</p>
          </div>
          <Badge className={statusBadgeClass[mockTask.status]}>
            {mockTask.status.replace("-", " ")}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details Card */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Task Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-foreground font-medium capitalize mt-1">
                    {mockTask.status.replace("-", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <Badge className={`mt-1 ${priorityBadgeClass[mockTask.priority]}`}>
                    {mockTask.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="text-foreground font-medium mt-1">
                    {mockTask.assignee.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="text-foreground font-medium mt-1">
                    {mockTask.dueDate}
                  </p>
                </div>
              </div>
            </Card>

            {/* Subtasks Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  Subtasks
                </h2>
                <span className="text-sm text-muted-foreground">
                  {completedCount} of {subtasks.length} completed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Progress
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(completionPercentage)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Subtasks List */}
              <div className="space-y-2 mb-6">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors"
                  >
                    <button
                      onClick={() => toggleSubtask(subtask.id)}
                      className="shrink-0 text-primary hover:text-primary/80 transition-colors"
                    >
                      {subtask.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          subtask.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {subtask.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subtask.assignee}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSubtask(subtask.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Subtask */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a new subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSubtask()}
                  className="flex-1"
                />
                <Button onClick={addSubtask} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Activity Card */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Activity
              </h3>
              <div className="space-y-3 text-sm">
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">Created</p>
                  <p>{mockTask.createdAt}</p>
                </div>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">Last Updated</p>
                  <p>2 hours ago</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
