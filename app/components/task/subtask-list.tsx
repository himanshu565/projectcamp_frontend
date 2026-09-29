"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Trash2, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
}

interface SubtaskListProps {
  subtasks: Subtask[];
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
  onDelete: (id: string) => void;
}

export function SubtaskList({
  subtasks,
  onToggle,
  onAdd,
  onDelete,
}: SubtaskListProps) {
  const [newSubtask, setNewSubtask] = useState("");

  const handleAdd = () => {
    if (newSubtask.trim()) {
      onAdd(newSubtask);
      setNewSubtask("");
    }
  };

  const completedCount = subtasks.filter((st) => st.completed).length;
  const completionPercentage =
    subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {subtasks.length}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Subtasks */}
      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <button
              onClick={() => onToggle(subtask.id)}
              className="flex-shrink-0 text-primary hover:text-primary/80"
            >
              {subtask.completed ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  subtask.completed
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {subtask.title}
              </p>
            </div>
            <button
              onClick={() => onDelete(subtask.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Subtask */}
      <div className="flex gap-2 pt-2">
        <Input
          placeholder="Add subtask..."
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 text-sm"
        />
        <Button onClick={handleAdd} size="sm" variant="outline">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
