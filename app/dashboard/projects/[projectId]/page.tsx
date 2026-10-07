"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { API_URL, getApiCollection, getApiEntity, getAuthHeaders, getPersistedId, normalizeProject } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  members?: { id: string; name: string; role?: string; avatar?: string }[];
  memberCount?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
}

function normalizeMembers(payload: unknown): Project["members"] {
  return getApiCollection<Record<string, unknown>>(payload, "members")
    .map((member) => {
      const user = member.user && typeof member.user === "object"
        ? member.user as Record<string, unknown>
        : member;
      const id = getPersistedId(user);
      if (!id) return null;
      return {
        id,
        name: typeof user.fullName === "string"
          ? user.fullName
          : typeof user.name === "string"
            ? user.name
            : typeof user.username === "string"
              ? user.username
              : typeof user.email === "string" ? user.email : "Unnamed member",
        role: typeof member.role === "string" ? member.role : "member",
        avatar: typeof user.avatar === "string" ? user.avatar : undefined,
      };
    })
    .filter(Boolean) as Project["members"];
}

export default function ProjectPage() {
  const params = useParams<{ projectId?: string | string[] }>();
  const router = useRouter();
  const projectParam = params.projectId;
  const projectId = Array.isArray(projectParam) ? projectParam[0] : projectParam;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "project_admin" | "member">("member");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");
  const [projectError, setProjectError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskError, setTaskError] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [projectSaveError, setProjectSaveError] = useState("");
  const [projectSaveSuccess, setProjectSaveSuccess] = useState("");

  const deleteProject = async () => {
    if (!projectId) return;
    setProjectError("");
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Project deletion failed");
      router.push("/dashboard");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Project deletion failed");
    }
  };

  const updateProject = async (changes: Partial<Project>) => {
    if (!project || !projectId) return;
    setProjectSaveError("");
    setProjectSaveSuccess("");
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(changes),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Project update failed");
      const updatedProject = normalizeProject(getApiEntity<Record<string, unknown>>(data, "project"));
      if (!updatedProject) throw new Error("Project update response did not include the updated project");
      setProject(updatedProject as unknown as Project);
      setProjectSaveSuccess("Project changes saved.");
    } catch (error) {
      console.error("Failed to update project:", error);
      setProjectSaveError(error instanceof Error ? error.message : "Project update failed");
    }
  };

  const saveProjectDetails = () => {
    if (!project) return;
    void updateProject({
      name: project.name,
      description: project.description,
      status: project.status ?? "Planning",
      startDate: project.startDate || undefined,
      endDate: project.endDate || undefined,
    });
  };

  const addMember = async () => {
    setMemberError("");
    setMemberSuccess("");
    if (!projectId) {
      setMemberError("Select a project before adding a member.");
      return;
    }
    if (!memberEmail.trim()) {
      setMemberError("Enter the member's email address.");
      return;
    }
    setIsSubmittingMember(true);
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/members`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail.trim().toLowerCase(), role: memberRole }),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validationDetails = Array.isArray(data?.errors)
          ? data.errors
            .flatMap((error: unknown) => (
              error && typeof error === "object"
                ? Object.entries(error).map(([field, message]) => `${field}: ${String(message)}`)
                : [String(error)]
            ))
            .join(", ")
          : "";
        throw new Error(
          [data?.message || data?.error, validationDetails].filter(Boolean).join(" - ")
            || "Unable to add project member",
        );
      }

      const membersResponse = await fetch(`${API_URL}/projects/${projectId}/members`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const membersData = await membersResponse.json().catch(() => ({}));
      if (!membersResponse.ok) throw new Error(membersData?.message || "Member was added, but the member list could not be refreshed");
      const members = normalizeMembers(membersData);
      setProject((currentProject) => currentProject ? { ...currentProject, members } : currentProject);
      setMemberEmail("");
      setMemberRole("member");
      setIsAddingMember(false);
      setMemberSuccess("Member added successfully.");
    } catch (error) {
      console.error("Failed to add member:", error);
      setMemberError(error instanceof Error ? error.message : "Unable to add project member");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const fetchMembers = async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/members`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Unable to load project members");
      const members = normalizeMembers(data);
      setProject((currentProject) => currentProject ? { ...currentProject, members } : currentProject);
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Unable to load project members");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!projectId || !memberId) return;
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/members/${memberId}`, { method: "DELETE", headers: getAuthHeaders(), credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Member deletion failed");
      setProject((currentProject) =>
        currentProject
          ? { ...currentProject, members: currentProject.members?.filter((member) => member.id !== memberId) }
          : currentProject,
      );
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

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
        const loadedProject = getApiEntity<Project & { _id?: string; project?: { _id?: string } }>(data, "project");
        const normalizedProject = normalizeProject(loadedProject as unknown as Record<string, unknown>);
        if (normalizedProject) setProject(normalizedProject as unknown as Project);
      }
    } catch (err) {
      console.error("Failed to fetch project:", err);
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
        const loadedTasks = getApiCollection<Record<string, unknown>>(data, "tasks")
          .map((task) => {
            const id = getPersistedId(task);
            if (!id) return null;
            return {
              id,
              title: String(task.title ?? "Untitled task"),
              description: String(task.description ?? ""),
              status: task.status === "in_progress" || task.status === "done" ? task.status : "todo",
              assignee: typeof task.assignedTo === "object" && task.assignedTo
                ? String((task.assignedTo as Record<string, unknown>).username ?? "Unassigned")
                : "Unassigned",
            } as Task;
          })
          .filter(Boolean) as Task[];
        setTasks(loadedTasks);
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

  const createProjectTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTaskError("");
    if (!projectId) {
      setTaskError("Select a project before creating a task.");
      return;
    }
    if (!taskTitle.trim()) return;
    setIsCreatingTask(true);
    try {
      const response = await fetch(`${API_URL}/tasks/${projectId}`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          status: "todo",
          ...(taskAssignedTo ? { assignedTo: taskAssignedTo } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Task creation failed");
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignedTo("");
      setActiveTab("tasks");
      await fetchTasks();
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Task creation failed");
    } finally {
      setIsCreatingTask(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    void fetchProject();
    void fetchTasks();
    void fetchMembers();
  }, [projectId]);

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
              onChange={(event) => setProject({ ...project, status: event.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground"
            >
              <option value="Unknown">Unknown</option>
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
            <Button onClick={() => setActiveTab("settings")}>Edit Project</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" aria-label="Delete project">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the project and its associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {projectError && <p role="alert" className="text-sm text-destructive">{projectError}</p>}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={(event) => { event.preventDefault(); void deleteProject(); }}>Delete project</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                {project.members?.length ?? project.memberCount ?? 0}
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
                  <form className="mb-4 space-y-2" onSubmit={(event) => { event.preventDefault(); void addMember(); }}>
                    <div className="flex gap-2">
                      <Input value={memberEmail} onChange={(event) => { setMemberEmail(event.target.value); setMemberError(""); setMemberSuccess(""); }} placeholder="Member email" type="email" required disabled={isSubmittingMember} />
                      <select value={memberRole} onChange={(event) => setMemberRole(event.target.value as typeof memberRole)} className="h-9 rounded-md border bg-background px-3 text-sm">
                        <option value="member">Member</option>
                        <option value="project_admin">Project Admin</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button type="submit" disabled={isSubmittingMember}>{isSubmittingMember ? "Adding..." : "Add"}</Button>
                    </div>
                    {memberError && <p role="alert" className="text-sm text-destructive">{memberError}</p>}
                  </form>
                )}
                {memberSuccess && <p role="status" className="mb-4 text-sm text-emerald-600">{memberSuccess}</p>}
                {memberError && !isAddingMember && <p role="alert" className="mb-4 text-sm text-destructive">{memberError}</p>}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project Tasks</CardTitle>
                    <CardDescription>View and manage project tasks</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setTaskError(""); setActiveTab("tasks"); }}>
                    New Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={createProjectTask} className="mb-5 space-y-3 rounded-lg border p-4">
                  <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task title" required />
                  <Input value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Description (optional)" />
                  <select
                    value={taskAssignedTo}
                    onChange={(event) => setTaskAssignedTo(event.target.value)}
                    aria-label="Assign task to"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {(project.members ?? []).map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                  {taskError && <p role="alert" className="text-sm text-destructive">{taskError}</p>}
                  <Button type="submit" disabled={isCreatingTask}>{isCreatingTask ? "Creating..." : "Create task"}</Button>
                </form>
                <TaskList tasks={tasks} loading={loading} projectId={projectId} />
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    Start date
                    <Input type="date" value={project.startDate ?? ""} onChange={(event) => setProject({ ...project, startDate: event.target.value })} />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    End date
                    <Input type="date" value={project.endDate ?? ""} onChange={(event) => setProject({ ...project, endDate: event.target.value })} />
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-medium">
                  Status
                  <select value={project.status ?? "Planning"} onChange={(event) => setProject({ ...project, status: event.target.value })} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                    <option>Planning</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>On Hold</option>
                  </select>
                </label>
                <Button onClick={saveProjectDetails}>
                  Save Changes
                </Button>
                {projectSaveError && <p role="alert" className="text-sm text-destructive">{projectSaveError}</p>}
                {projectSaveSuccess && <p role="status" className="text-sm text-emerald-600">{projectSaveSuccess}</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
