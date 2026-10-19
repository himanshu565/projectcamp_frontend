"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/app/components/layouts/dashboard-layout";
import { TaskList } from "@/app/components/task/task-list";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  API_URL,
  getApiCollection,
  getApiEntity,
  getAuthHeaders,
  getPersistedId,
  normalizeProject,
} from "@/lib/api";
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
import { AlertCircle, CheckCircle2, Loader2, RotateCw, Shield, Trash2, Users } from "lucide-react";
import { memberInviteSchema, projectSchema, taskSchema } from "@/lib/validations";

interface MemberItem {
  id: string;
  name: string;
  email?: string;
  role: "admin" | "project_admin" | "member";
  avatar?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  role?: string;
  members?: MemberItem[];
  memberCount?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
}

function normalizeMembers(payload: unknown): MemberItem[] {
  const list: MemberItem[] = [];
  const rawMembers = getApiCollection<Record<string, unknown>>(payload, "members");
  for (const member of rawMembers) {
    const user =
      member.user && typeof member.user === "object"
        ? (member.user as Record<string, unknown>)
        : member;
    const id = getPersistedId(user);
    if (!id) continue;

    const rawRole = typeof member.role === "string" ? member.role.toLowerCase() : "member";
    const role: MemberItem["role"] =
      rawRole === "admin" ? "admin" : rawRole === "project_admin" ? "project_admin" : "member";

    const name =
      typeof user.fullName === "string" && user.fullName.trim()
        ? user.fullName
        : typeof user.name === "string" && user.name.trim()
          ? user.name
          : typeof user.username === "string" && user.username.trim()
            ? user.username
            : typeof user.email === "string"
              ? user.email
              : "Unnamed member";

    const item: MemberItem = {
      id,
      name,
      role,
    };
    if (typeof user.email === "string") {
      item.email = user.email;
    }
    if (typeof user.avatar === "string") {
      item.avatar = user.avatar;
    }
    list.push(item);
  }
  return list;
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

  // Member management states
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "project_admin" | "member">("member");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  // Project state & settings
  const [projectError, setProjectError] = useState("");
  const [projectSaveError, setProjectSaveError] = useState("");
  const [projectSaveSuccess, setProjectSaveSuccess] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Task creation states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskError, setTaskError] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const isAdmin = project?.role === "admin";
  const canManageMembers = isAdmin;
  const canEditProject = isAdmin;

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/members`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMembersError(data?.message || `Failed to load members (${response.status})`);
        return;
      }
      const members = normalizeMembers(data);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              members,
              memberCount: members.length,
            }
          : currentProject
      );
      setMembersError(null);
    } catch {
      setMembersError("Unable to load project members. Please check your network connection.");
    }
  }, [projectId]);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const loadedProject = getApiEntity<Record<string, unknown>>(data, "project");
        const normalized = normalizeProject(loadedProject);
        if (normalized) {
          setProject((prev) => ({
            ...normalized,
            description: typeof normalized.description === "string" ? normalized.description : "",
            name: typeof normalized.name === "string" ? normalized.name : "Untitled project",
            role: normalized.role ?? prev?.role,
            members: prev?.members,
            memberCount: normalized.memberCount ?? prev?.memberCount ?? 0,
          }));
          setProjectError("");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setProjectError(
          errData?.message ||
            (response.status === 404
              ? "Project not found or you do not have permission to view it."
              : `Failed to load project details (${response.status})`)
        );
      }
    } catch {
      setProjectError("Unable to reach the project service. Please check your network connection.");
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`${API_URL}/tasks/${projectId}`, {
        headers: getAuthHeaders(),
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
              status:
                task.status === "in_progress" || task.status === "done" ? task.status : "todo",
              assignee:
                typeof task.assignedTo === "object" && task.assignedTo
                  ? String((task.assignedTo as Record<string, unknown>).username ?? "Unassigned")
                  : "Unassigned",
            } as Task;
          })
          .filter((t): t is Task => t !== null);
        setTasks(loadedTasks);
        setTasksError(null);
      } else {
        const errData = await response.json().catch(() => ({}));
        setTasksError(errData?.message || `Failed to load tasks (${response.status})`);
      }
    } catch {
      setTasksError("Unable to reach the task service. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const loadAll = async () => {
      await Promise.all([fetchProject(), fetchTasks(), fetchMembers()]);
    };
    void loadAll();
  }, [projectId, fetchProject, fetchTasks, fetchMembers]);

  const deleteProject = async () => {
    if (!projectId) return;
    setProjectError("");
    setIsDeletingProject(true);
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
    } finally {
      setIsDeletingProject(false);
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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Project update failed");
      const updatedEntity = getApiEntity<Record<string, unknown>>(data, "project");
      const normalizedProject = normalizeProject(updatedEntity);
      if (!normalizedProject) throw new Error("Project update response did not include updated data");
      setProject((prev) =>
        prev
          ? {
              ...prev,
              name: typeof normalizedProject.name === "string" ? normalizedProject.name : prev.name,
              description: typeof normalizedProject.description === "string" ? normalizedProject.description : prev.description,
              status: normalizedProject.status ?? prev.status,
              startDate: normalizedProject.startDate ?? prev.startDate,
              endDate: normalizedProject.endDate ?? prev.endDate,
            }
          : prev
      );
      setProjectSaveSuccess("Project changes saved successfully.");
    } catch (error) {
      setProjectSaveError(error instanceof Error ? error.message : "Project update failed");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;
    setProject({ ...project, status: newStatus });
    if (canEditProject) {
      await updateProject({ status: newStatus });
    }
  };

  const saveProjectDetails = async () => {
    if (!project) return;
    setProjectSaveError("");
    setProjectSaveSuccess("");

    const validation = projectSchema.safeParse({
      name: project.name,
      description: project.description,
      status: project.status ?? "Planning",
      startDate: project.startDate,
      endDate: project.endDate,
    });

    if (!validation.success) {
      setProjectSaveError(
        validation.error.errors[0]?.message ?? "Please enter valid project details."
      );
      return;
    }

    setIsSavingDetails(true);
    try {
      await updateProject({
        name: project.name.trim(),
        description: project.description.trim(),
        status: project.status ?? "Planning",
        startDate: project.startDate || undefined,
        endDate: project.endDate || undefined,
      });
    } finally {
      setIsSavingDetails(false);
    }
  };

  const addMember = async () => {
    setMemberError("");
    setMemberSuccess("");
    if (!projectId) {
      setMemberError("Project ID is missing.");
      return;
    }
    const email = memberEmail.trim().toLowerCase();
    const emailValidation = memberInviteSchema.safeParse({ email });
    if (!emailValidation.success) {
      setMemberError(emailValidation.error.errors[0]?.message ?? "Enter a valid email address.");
      return;
    }

    if ((project?.members ?? []).some((m) => m.email?.toLowerCase() === email)) {
      setMemberError("This user is already a member of this project.");
      return;
    }

    setIsSubmittingMember(true);
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/members`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: memberRole }),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to add project member");
      }

      await fetchMembers();
      setMemberEmail("");
      setMemberRole("member");
      setIsAddingMember(false);
      setMemberSuccess(`Member (${email}) added successfully with role "${memberRole}".`);
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Unable to add project member");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const updateMemberRole = async (
    memberId: string,
    newRole: "admin" | "project_admin" | "member"
  ) => {
    if (!projectId || !memberId) return;
    setMemberError("");
    setMemberSuccess("");
    setUpdatingMemberId(memberId);
    try {
      const response = await fetch(
        `${API_URL}/projects/${projectId}/members/${memberId}`,
        {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ newRole }),
          credentials: "include",
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update member role");
      }

      setProject((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members?.map((m) =>
                m.id === memberId ? { ...m, role: newRole } : m
              ),
            }
          : prev
      );
      setMemberSuccess("Member role updated successfully.");
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Failed to update member role");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!projectId || !memberId) return;
    setMemberError("");
    setMemberSuccess("");
    setRemovingMemberId(memberId);
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Member deletion failed");
      setProject((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members?.filter((member) => member.id !== memberId),
              memberCount: Math.max(0, (prev.memberCount ?? 1) - 1),
            }
          : prev
      );
      setMemberSuccess("Member removed from project.");
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const createProjectTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTaskError("");
    if (!projectId) {
      setTaskError("Select a project before creating a task.");
      return;
    }

    const taskValidation = taskSchema.safeParse({
      title: taskTitle,
      description: taskDescription,
      status: "todo",
      assignedTo: taskAssignedTo || undefined,
    });

    if (!taskValidation.success) {
      setTaskError(taskValidation.error.errors[0]?.message ?? "Task title is required.");
      return;
    }

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

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          {projectError ? (
            <div className="text-center space-y-3 p-6 max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <p className="text-destructive font-medium">{projectError}</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="default" onClick={() => void fetchProject()} className="gap-2">
                  <RotateCw className="w-4 h-4" />
                  Try again
                </Button>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading project details...</span>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>
              {project.role && (
                <Badge variant="secondary" className="capitalize text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {project.role.replace("_", " ")}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2 max-w-2xl">{project.description || "No description provided."}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <label htmlFor="project-status" className="sr-only">
              Update project status
            </label>
            {canEditProject ? (
              <select
                id="project-status"
                value={project.status ?? "Planning"}
                onChange={(event) => void handleStatusChange(event.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            ) : (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {project.status ?? "Planning"}
              </Badge>
            )}

            {canEditProject && (
              <Button variant="outline" onClick={() => setActiveTab("settings")}>
                Edit Project
              </Button>
            )}

            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" aria-label="Delete project">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo; permanently?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2 text-sm">
                      <span className="block">
                        This action <strong>cannot be undone</strong>.
                      </span>
                      <span className="block text-destructive">
                        Deleting this project will permanently delete all associated tasks, subtasks,
                        notes, and team memberships.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {projectError && (
                    <p role="alert" className="text-sm text-destructive px-6">
                      {projectError}
                    </p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(event) => {
                        event.preventDefault();
                        void deleteProject();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeletingProject}
                    >
                      {isDeletingProject ? "Deleting..." : "Permanently Delete Project"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">
                {project.status ?? "Planning"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Start Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">
                {project.startDate || "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                End Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">
                {project.endDate || "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">
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

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
                <CardDescription>Key information about this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Description</h3>
                  <p className="text-muted-foreground text-sm">
                    {project.description || "No description provided."}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Timeline</h3>
                  <p className="text-muted-foreground text-sm">
                    {project.startDate || "Unspecified"} &rarr; {project.endDate || "Unspecified"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Your Access Level</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {project.role?.replace("_", " ") ?? "Member"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {isAdmin
                        ? "You have full administrator access to this project."
                        : "You can collaborate on tasks and view project details."}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage project members and authorization roles
                    </CardDescription>
                  </div>
                  {canManageMembers && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsAddingMember((visible) => !visible);
                        setMemberError("");
                        setMemberSuccess("");
                      }}
                    >
                      {isAddingMember ? "Cancel" : "Add Member"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAddingMember && canManageMembers && (
                  <form
                    className="p-4 rounded-xl border bg-secondary/30 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addMember();
                    }}
                  >
                    <h3 className="text-sm font-semibold text-foreground">Add Member by Email</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={memberEmail}
                        onChange={(event) => {
                          setMemberEmail(event.target.value);
                          setMemberError("");
                          setMemberSuccess("");
                        }}
                        placeholder="colleague@example.com"
                        type="email"
                        required
                        disabled={isSubmittingMember}
                        className="flex-1"
                      />
                      <select
                        value={memberRole}
                        onChange={(event) =>
                          setMemberRole(event.target.value as typeof memberRole)
                        }
                        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
                        disabled={isSubmittingMember}
                      >
                        <option value="member">Member</option>
                        <option value="project_admin">Project Admin</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button type="submit" disabled={isSubmittingMember}>
                        {isSubmittingMember ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Member"
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {memberSuccess && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{memberSuccess}</span>
                  </div>
                )}
                {memberError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{memberError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {project.members && project.members.length > 0 ? (
                    project.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-xl border bg-card/60 transition-colors hover:bg-secondary/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {member.avatar ??
                              member.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {canManageMembers ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(event) =>
                                  void updateMemberRole(
                                    member.id,
                                    event.target.value as MemberItem["role"]
                                  )
                                }
                                disabled={updatingMemberId === member.id}
                                className="h-8 rounded-md border bg-background px-2 text-xs font-medium text-foreground"
                                aria-label={`Change role for ${member.name}`}
                              >
                                <option value="member">Member</option>
                                <option value="project_admin">Project Admin</option>
                                <option value="admin">Admin</option>
                              </select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void removeMember(member.id)}
                                disabled={removingMemberId === member.id}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                              >
                                {removingMemberId === member.id ? "Removing..." : "Remove"}
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="capitalize text-xs">
                              {member.role.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : membersError ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
                      <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
                      <p className="text-sm font-medium text-destructive">{membersError}</p>
                      <Button variant="outline" size="sm" onClick={() => void fetchMembers()} className="gap-2">
                        <RotateCw className="w-3.5 h-3.5" />
                        Try again
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No members found in this project.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Project Tasks</CardTitle>
                    <CardDescription>View and manage project tasks</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setTaskError("");
                      setActiveTab("tasks");
                    }}
                  >
                    New Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={createProjectTask}
                  className="mb-5 space-y-3 rounded-lg border p-4 bg-secondary/10"
                >
                  <Input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="Task title"
                    required
                  />
                  <Input
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    placeholder="Description (optional)"
                  />
                  <select
                    value={taskAssignedTo}
                    onChange={(event) => setTaskAssignedTo(event.target.value)}
                    aria-label="Assign task to"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Unassigned</option>
                    {(project.members ?? []).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                  {taskError && (
                    <p role="alert" className="text-sm text-destructive">
                      {taskError}
                    </p>
                  )}
                  <Button type="submit" disabled={isCreatingTask}>
                    {isCreatingTask ? "Creating..." : "Create task"}
                  </Button>
                </form>
                <TaskList
                  tasks={tasks}
                  loading={loading}
                  projectId={projectId}
                  error={tasksError}
                  onRetry={() => void fetchTasks()}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
                <CardDescription>Configure project metadata and dates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canEditProject && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    Only project administrators can modify project settings or delete this project.
                  </div>
                )}
                <div>
                  <label htmlFor="settings-project-name" className="text-sm font-medium text-foreground">
                    Project Name
                  </label>
                  <Input
                    id="settings-project-name"
                    type="text"
                    value={project.name}
                    onChange={(event) => setProject({ ...project, name: event.target.value })}
                    disabled={!canEditProject}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="settings-project-desc" className="text-sm font-medium text-foreground">
                    Description
                  </label>
                  <textarea
                    id="settings-project-desc"
                    value={project.description}
                    onChange={(event) =>
                      setProject({ ...project, description: event.target.value })
                    }
                    disabled={!canEditProject}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="settings-start-date" className="text-sm font-medium text-foreground">
                      Start date
                    </label>
                    <Input
                      id="settings-start-date"
                      type="date"
                      value={project.startDate ?? ""}
                      onChange={(event) =>
                        setProject({ ...project, startDate: event.target.value })
                      }
                      disabled={!canEditProject}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="settings-end-date" className="text-sm font-medium text-foreground">
                      End date
                    </label>
                    <Input
                      id="settings-end-date"
                      type="date"
                      value={project.endDate ?? ""}
                      onChange={(event) =>
                        setProject({ ...project, endDate: event.target.value })
                      }
                      disabled={!canEditProject}
                      min={project.startDate || undefined}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="settings-status" className="text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    id="settings-status"
                    value={project.status ?? "Planning"}
                    onChange={(event) =>
                      setProject({ ...project, status: event.target.value })
                    }
                    disabled={!canEditProject}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                {projectSaveError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{projectSaveError}</span>
                  </div>
                )}
                {projectSaveSuccess && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{projectSaveSuccess}</span>
                  </div>
                )}

                {canEditProject && (
                  <Button onClick={() => void saveProjectDetails()} disabled={isSavingDetails}>
                    {isSavingDetails ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
