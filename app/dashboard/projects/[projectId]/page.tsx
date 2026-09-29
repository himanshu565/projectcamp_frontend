"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout";
import { TaskList } from "@/app/components/task/task-list";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { API_URL } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

interface Project {
  id: string;
  name: string;
  description: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  members?: { id: string; name: string; role?: string; avatar?: string }[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
}

export default function ProjectPage() {
  const params = useParams();
  const projectId = (params as any).projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [memberName, setMemberName] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const updateProject = async (changes: Partial<Project>) => {
    if (!project || !projectId) return;
    setProject((currentProject) =>
      currentProject ? { ...currentProject, ...changes } : currentProject,
    );
    try {
      await fetch(`${API_URL}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
        credentials: "include",
      });
    } catch {
      // Keep the optimistic update when the API is unavailable.
    }
  };

  const updateProjectStatus = (status: string) => {
    updateProject({ status });
  };

  const saveProjectDetails = () => {
    updateProject({ name: project?.name, description: project?.description });
  };

  const addMember = async () => {
    if (!projectId || !memberName.trim()) return;
    const member = { id: crypto.randomUUID(), name: memberName.trim(), role: "Member" };
    try {
      await fetch(`${API_URL}/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: member.name }),
        credentials: "include",
      });
    } catch {
      // Keep the optimistic update when the API is unavailable.
    }
    setProject((currentProject) =>
      currentProject
        ? { ...currentProject, members: [...(currentProject.members ?? []), member] }
        : currentProject,
    );
    setMemberName("");
    setIsAddingMember(false);
  };

  const removeMember = async (memberId: string) => {
    if (!projectId || !memberId) return;
    try {
      await fetch(`${API_URL}/projects/${projectId}/members/${memberId}`, { method: "DELETE", credentials: "include" });
    } finally {
      setProject((currentProject) =>
        currentProject
          ? { ...currentProject, members: currentProject.members?.filter((member) => member.id !== memberId) }
          : currentProject,
      );
    }
  };

  useEffect(() => {
    if (!projectId) return;
    fetchProject();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const loadedProject = data.project ?? data;
        const loadedProjectId = loadedProject.project?._id ?? loadedProject._id;
        if (!loadedProjectId) return;
        setProject({ ...loadedProject, id: loadedProjectId });
      } else {
        // fallback: set a mock project so UI remains usable in dev
        setProject({
          id: projectId,
          name: `Project ${projectId}`,
          description: "Description not available",
          status: "Unknown",
          startDate: "-",
          endDate: "-",
          members: [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch project:", err);
      setProject({
        id: projectId,
        name: `Project ${projectId}`,
        description: "Description not available",
        status: "Unknown",
        startDate: "-",
        endDate: "-",
        members: [],
      });
    }
  };

  const fetchTasks = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_URL}/tasks/${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {project.name}
            </h1>
            <p className="text-muted-foreground mt-2">{project.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="project-status" className="sr-only">
              Update project status
            </label>
            <select
              id="project-status"
              value={project.status ?? "Planning"}
              onChange={(event) => updateProjectStatus(event.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground"
            >
              <option value="Unknown">Unknown</option>
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
            <Button onClick={() => setActiveTab("settings")}>Edit Project</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {project.status ?? "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Start Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {project.startDate ?? "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                End Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {project.endDate ?? "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {project.members?.length ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
                <CardDescription>
                  Key information about this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-muted-foreground">{project.description}</p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Timeline</h3>
                  <p className="text-muted-foreground">
                    {project.startDate ?? "-"} to {project.endDate ?? "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage project team members
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setIsAddingMember((visible) => !visible)}>
                    {isAddingMember ? "Cancel" : "Add Member"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isAddingMember && (
                  <div className="mb-4 flex gap-2">
                    <Input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Member name" />
                    <Button onClick={addMember}>Add</Button>
                  </div>
                )}
                <div className="space-y-4">
                  {project.members && project.members.length > 0 ? (
                    project.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            {member.avatar ??
                              member.name?.split(" ")[0]?.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.role ?? "Member"}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)}>
                          Remove
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No members found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Tasks</CardTitle>
                <CardDescription>View and manage project tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskList tasks={tasks} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
                <CardDescription>Configure project settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={project.name}
                    onChange={(event) => setProject({ ...project, name: event.target.value })}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-input border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Description
                  </label>
                  <textarea
                    value={project.description}
                    onChange={(event) => setProject({ ...project, description: event.target.value })}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-input border text-foreground"
                    rows={4}
                  />
                </div>
                <Button onClick={saveProjectDetails}>
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
