"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
}

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
}

export function TaskList({ tasks, loading }: TaskListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-transparent">
            Done
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-transparent">
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Todo
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted/60 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No tasks yet. Create one to get started!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className="transition-colors hover:border-primary/40 cursor-pointer"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {getStatusIcon(task.status)}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{task.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {task.description}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusBadge(task.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
