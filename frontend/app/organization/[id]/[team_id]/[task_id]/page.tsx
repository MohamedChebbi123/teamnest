"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, Plus, Calendar, CalendarDays, User, Flag, CheckCircle2, Circle, Clock, LayoutGrid, List, ChevronRight, ChevronLeft, ChevronDown, AlertCircle, Pencil, Trash2, Check, X, FolderOpen, Eye } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import Sidebar from "@/components/Sidebar/page"
import MembersSidebar from "@/components/MembersSidebar/page"

interface Assignee {
  user_id: number
  first_name: string
  last_name: string
  avatar_url: string | null
}

interface TeamMember {
  user_id: number
  first_name: string
  last_name: string
  avatar_url: string | null
}

interface Task {
  id: number
  title: string
  description: string
  priotrity: string
  status: string
  team_id: number
  created_by: number
  parent_task_id: number | null
  subtask_group: string | null
  created_at: string
  updated_at: string
  assignees: Assignee[]
}

const COLUMNS = [
  {
    key: "todo",
    label: "To Do",
    icon: Circle,
    color: "text-slate-500",
    bg: "bg-slate-500",
    headerBg: "bg-slate-50 dark:bg-slate-800/50",
    cardBorder: "border-l-slate-400",
    count_bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-500",
    headerBg: "bg-blue-50 dark:bg-blue-900/20",
    cardBorder: "border-l-blue-400",
    count_bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  },
  {
    key: "review",
    label: "Review",
    icon: Eye,
    color: "text-purple-500",
    bg: "bg-purple-500",
    headerBg: "bg-purple-50 dark:bg-purple-900/20",
    cardBorder: "border-l-purple-400",
    count_bg: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
  },
  {
    key: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500",
    headerBg: "bg-emerald-50 dark:bg-emerald-900/20",
    cardBorder: "border-l-emerald-400",
    count_bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
  },
]

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon_color: string; label: string }> = {
  high: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800", icon_color: "text-red-500", label: "High" },
  medium: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800", icon_color: "text-amber-500", label: "Medium" },
  low: { color: "text-green-600 dark:text-green-400", bg: "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800", icon_color: "text-green-500", label: "Low" },
}

export default function TasksPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id as string
  const teamId = params.team_id as string

  const [tasks, setTasks] = useState<Task[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>("MEMBER")
  const [canManageTasks, setCanManageTasks] = useState(false)
  const [viewMode, setViewMode] = useState<"board" | "list" | "calendar" | "my-tasks">("board")
  const [userId, setUserId] = useState<number | null>(null)
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d
  })

  // Detail panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskPriority, setTaskPriority] = useState("medium")
  const [taskStatus, setTaskStatus] = useState("todo")
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriority, setEditPriority] = useState("medium")
  const [editStatus, setEditStatus] = useState("todo")
  const [editAssigneeIds, setEditAssigneeIds] = useState<number[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Subtask dialog
  const [subtaskOpen, setSubtaskOpen] = useState(false)
  const [subtaskParentId, setSubtaskParentId] = useState<number | null>(null)
  const [subtaskTitle, setSubtaskTitle] = useState("")
  const [subtaskDescription, setSubtaskDescription] = useState("")
  const [subtaskPriority, setSubtaskPriority] = useState("medium")
  const [subtaskGroup, setSubtaskGroup] = useState("")
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false)

  // Assignees
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<number[]>([])
  const [subtaskAssigneeIds, setSubtaskAssigneeIds] = useState<number[]>([])
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<number | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Subtask edit
  const [editingSubtask, setEditingSubtask] = useState<Task | null>(null)
  const [editSubTitle, setEditSubTitle] = useState("")
  const [editSubDescription, setEditSubDescription] = useState("")
  const [editSubPriority, setEditSubPriority] = useState("medium")
  const [editSubStatus, setEditSubStatus] = useState("todo")
  const [editSubAssigneeIds, setEditSubAssigneeIds] = useState<number[]>([])
  const [editSubGroup, setEditSubGroup] = useState("")
  const [isEditingSubtask, setIsEditingSubtask] = useState(false)
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<number | null>(null)

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) setTasks(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  const fetchMyTasks = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const tasks_list = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/my-tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (tasks_list.ok) {
        setMyTasks(await tasks_list.json())
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("access_token")
        if (!token) { router.push("/auth/login"); return }

        const userRes = await fetch("http://localhost:8000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        let userId: number | null = null
        if (userRes.ok) userId = (await userRes.json()).user_id
        setUserId(userId)

        const orgRes = await fetch(
          `http://localhost:8000/organization/${organizationId}/members`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (orgRes.ok) {
          const members = await orgRes.json()
          const me = members.find((m: any) => m.user_id === userId)
          if (me) setUserRole(me.role_user)
        }

        const teamRes = await fetch(
          `http://localhost:8000/team/${teamId}/members`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (teamRes.ok) {
          const td = await teamRes.json()
          const me = td.members?.find((m: any) => m.user_id === userId)
          if (me?.permissions?.can_manage_tasks) setCanManageTasks(true)
          setTeamMembers(td.members || [])
        }

        await fetchTasks()
      } catch (e) {
        console.error(e)
        toast.error("Error", { description: "Failed to load tasks" })
      } finally {
        setLoading(false)
      }
    }
    if (organizationId && teamId) init()
  }, [organizationId, teamId])

  useEffect(() => {
    if (userId) {
      fetchMyTasks()
    }
  }, [userId, tasks])

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) { toast.error("Error", { description: "Title is required" }); return }
    if (!taskDescription.trim()) { toast.error("Error", { description: "Description is required" }); return }
    setIsCreating(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/tasks`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: taskTitle, description: taskDescription, priority: taskPriority, status: taskStatus, parent_task_id: null, assignee_ids: taskAssigneeIds }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Task created")
        setTasks(prev => [data, ...prev])
        setCreateOpen(false)
        setTaskTitle("")
        setTaskDescription("")
        setTaskPriority("medium")
        setTaskStatus("todo")
        setTaskAssigneeIds([])
      } else {
        toast.error("Error", { description: data.detail || "Failed to create task" })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateSubtask = async () => {
    if (!subtaskTitle.trim()) { toast.error("Error", { description: "Title is required" }); return }
    if (!subtaskDescription.trim()) { toast.error("Error", { description: "Description is required" }); return }
    setIsCreatingSubtask(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/tasks`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: subtaskTitle,
            description: subtaskDescription,
            priority: subtaskPriority,
            status: "todo",
            parent_task_id: subtaskParentId,
            subtask_group: subtaskGroup.trim() || null,
            assignee_ids: subtaskAssigneeIds,
          }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Subtask created")
        setTasks(prev => [...prev, data])
        setSubtaskOpen(false)
        setSubtaskTitle("")
        setSubtaskDescription("")
        setSubtaskPriority("medium")
        setSubtaskGroup("")
        setSubtaskAssigneeIds([])
      } else {
        toast.error("Error", { description: data.detail || "Failed to create subtask" })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    } finally {
      setIsCreatingSubtask(false)
    }
  }

  const handleEditTask = async () => {
    if (!selectedTask) return
    if (!editTitle.trim()) { toast.error("Error", { description: "Title is required" }); return }
    setIsEditing(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/tasks/${selectedTask.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: editTitle, description: editDescription, priority: editPriority, status: editStatus, assignee_ids: editAssigneeIds }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Task updated")
        setTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setSelectedTask(data)
        setEditOpen(false)
      } else {
        toast.error("Error", { description: data.detail || "Failed to update task" })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!selectedTask) return
    setIsDeleting(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/tasks/${selectedTask.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (res.ok) {
        toast.success("Task deleted")
        setTasks(prev => prev.filter(t => t.id !== selectedTask.id))
        setDetailOpen(false)
        setSelectedTask(null)
      } else {
        const data = await res.json()
        toast.error("Error", { description: data.detail || "Failed to delete task" })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/my-tasks/${taskId}/status`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success(`Task marked as ${newStatus.replace('_', ' ')}`)
        setTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setMyTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setSelectedTask(prev => (prev && prev.id === data.id ? data : prev))
      } else {
        toast.error("Error", { description: data.detail || "Failed to update task" })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    }
  }

  const handleEditSubtask = async () => {
    if (!editingSubtask) return
    if (!editSubTitle.trim()) { toast.error("Error", { description: "Title is required" }); return }
    setIsEditingSubtask(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/tasks/${editingSubtask.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: editSubTitle, description: editSubDescription, priority: editSubPriority, status: editSubStatus, subtask_group: editSubGroup.trim() || null, assignee_ids: editSubAssigneeIds }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Subtask updated")
        setTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setEditingSubtask(null)
      } else {
        toast.error("Error", { description: data.detail || "Failed to update subtask" })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    } finally {
      setIsEditingSubtask(false)
    }
  }

  const handleDeleteSubtask = async (subtaskId: number) => {
    setDeletingSubtaskId(subtaskId)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `http://localhost:8000/organization/${organizationId}/team/${teamId}/tasks/${subtaskId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (res.ok) {
        toast.success("Subtask deleted")
        setTasks(prev => prev.filter(t => t.id !== subtaskId))
        if (expandedSubtaskId === subtaskId) setExpandedSubtaskId(null)
      } else {
        const data = await res.json()
        toast.error("Error", { description: data.detail || "Failed to delete subtask" })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    } finally {
      setDeletingSubtaskId(null)
    }
  }

  const subtasksOf = (id: number) => tasks.filter(t => t.parent_task_id === id)
  const canCreate = userRole === "OWNER" || canManageTasks

  const parentTasks = tasks.filter(t => t.parent_task_id === null)
  const filteredTasks = filterPriority === "all"
    ? parentTasks
    : parentTasks.filter(t => t.priotrity === filterPriority)

  const tasksForColumn = (status: string) => filteredTasks.filter(t => t.status === status)

  const totalTasks = parentTasks.length
  const doneTasks = parentTasks.filter(t => t.status === "done").length
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const d = new Date(dateStr)
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <OrganizationNavBar organizationId={organizationId} />
        <MembersSidebar organizationId={organizationId} teamId={teamId} />
        <main className="p-8 lg:ml-[308px] xl:ml-[368px] lg:mr-[250px] xl:mr-[320px]">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-muted" />
                <Loader2 className="h-16 w-16 animate-spin text-primary absolute inset-0" />
              </div>
              <p className="font-medium">Loading tasks...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <OrganizationNavBar organizationId={organizationId} />
      <MembersSidebar organizationId={organizationId} teamId={teamId} />

      <main className="lg:ml-[308px] xl:ml-[368px] lg:mr-[250px] xl:mr-[320px] flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <div className="border-b bg-background px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/organization/${organizationId}/${teamId}`)}
                className="-ml-2 mb-1"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back to Team
              </Button>
              <h1 className="text-xl font-semibold tracking-tight">Task Board</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                <button
                  onClick={() => setViewMode("board")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    viewMode === "board"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Board
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    viewMode === "calendar"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode("my-tasks")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    viewMode === "my-tasks"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  My Tasks
                </button>
              </div>

              {canCreate && viewMode !== "my-tasks" && (
                <Button onClick={() => setCreateOpen(true)} size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Task
                </Button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{totalTasks}</span> tasks
              </div>
              <span className="text-muted-foreground/40">|</span>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {progressPercent}% done
                </span>
              </div>
            </div>

            {/* Priority filter */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
        <div className="flex-1 overflow-auto p-4">
          {viewMode === "calendar" ? (() => {
            const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
            const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
            const today = new Date()

            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart)
              d.setDate(weekStart.getDate() + i)
              return d
            })

            const sameDay = (a: Date, b: Date) =>
              a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

            const tasksForDay = (day: Date) =>
              filteredTasks.filter(t => sameDay(new Date(t.created_at), day))

            const monthLabel = (() => {
              const months = new Set(weekDays.map(d => d.getMonth()))
              if (months.size === 1) return `${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
              const [first, last] = [weekDays[0], weekDays[6]]
              if (first.getFullYear() !== last.getFullYear())
                return `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()} – ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`
              return `${MONTH_NAMES[first.getMonth()]} – ${MONTH_NAMES[last.getMonth()]} ${last.getFullYear()}`
            })()

            return (
              <div className="h-full flex flex-col -m-4">
                {/* Week nav */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-background">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5"
                      onClick={() => {
                        const d = new Date()
                        d.setHours(0, 0, 0, 0)
                        d.setDate(d.getDate() - d.getDay())
                        setWeekStart(d)
                      }}
                    >
                      Today
                    </Button>
                    <button
                      onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })}
                      className="rounded-full p-1.5 hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })}
                      className="rounded-full p-1.5 hover:bg-muted transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <h2 className="text-sm font-semibold ml-1">{monthLabel}</h2>
                  </div>
                </div>

                {/* Day header row */}
                <div className="grid grid-cols-7 border-b bg-background">
                  {weekDays.map((day, i) => {
                    const isToday = sameDay(day, today)
                    return (
                      <div key={i} className="flex flex-col items-center py-3 border-r last:border-r-0">
                        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                          {DAY_NAMES[day.getDay()]}
                        </span>
                        <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                        }`}>
                          {day.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Week grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-7 h-full min-h-[500px]">
                    {weekDays.map((day, i) => {
                      const dayTasks = tasksForDay(day)
                      return (
                        <div key={i} className="border-r last:border-r-0 border-b p-2 flex flex-col gap-1.5 min-h-[500px]">
                          {dayTasks.map(task => {
                            const col = COLUMNS.find(c => c.key === task.status) ?? COLUMNS[0]
                            const priority = PRIORITY_CONFIG[task.priotrity] ?? PRIORITY_CONFIG.medium
                            return (
                              <button
                                key={task.id}
                                onClick={() => { setSelectedTask(task); setExpandedSubtaskId(null); setDetailOpen(true) }}
                                className={`w-full rounded-lg border-l-[3px] ${col.cardBorder} bg-background border px-2.5 py-2 text-left shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
                              >
                                <p className="text-[11px] font-medium truncate leading-tight mb-1">
                                  {task.title}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-semibold ${col.color}`}>
                                    {col.label}
                                  </span>
                                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold ${priority.color}`}>
                                    <Flag className={`h-2 w-2 ${priority.icon_color}`} />
                                    {priority.label}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                          {dayTasks.length === 0 && (
                            <div className="flex-1" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })() : viewMode === "board" ? (
            /* Kanban Board */
            <div className="grid grid-cols-3 gap-4 h-full min-h-0">
              {COLUMNS.map(col => {
                const colTasks = tasksForColumn(col.key)
                const Icon = col.icon
                return (
                  <div key={col.key} className="flex flex-col min-h-0 rounded-xl bg-muted/30 border">
                    {/* Column header */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${col.headerBg}`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${col.color}`} />
                        <span className="text-sm font-semibold">{col.label}</span>
                        <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold ${col.count_bg}`}>
                          {colTasks.length}
                        </span>
                      </div>
                      {canCreate && (
                        <button
                          onClick={() => {
                            setTaskStatus(col.key)
                            setCreateOpen(true)
                          }}
                          className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>

                    {/* Column body */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {colTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                            <Icon className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                          <p className="text-xs text-muted-foreground">No tasks</p>
                        </div>
                      ) : (
                        colTasks.map(task => {
                          const priority = PRIORITY_CONFIG[task.priotrity] ?? PRIORITY_CONFIG.medium
                          const subs = subtasksOf(task.id)
                          const doneSubs = subs.filter(s => s.status === "done").length
                          return (
                            <button
                              key={task.id}
                              onClick={() => { setSelectedTask(task); setExpandedSubtaskId(null); setDetailOpen(true) }}
                              className={`w-full text-left rounded-lg border border-l-[3px] ${col.cardBorder} bg-background p-3.5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group`}
                            >
                              {/* Priority badge */}
                              <div className="flex items-center justify-between mb-2">
                                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${priority.bg} ${priority.color}`}>
                                  <Flag className={`h-2.5 w-2.5 ${priority.icon_color}`} />
                                  {priority.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{timeAgo(task.created_at)}</span>
                              </div>

                              {/* Title */}
                              <h3 className="text-sm font-medium leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                                {task.title}
                              </h3>

                              {/* Description preview */}
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                <div className="flex items-center">
                                  {task.assignees?.length > 0 ? (
                                    <div className="flex -space-x-1.5">
                                      {task.assignees.slice(0, 3).map(a => (
                                        <Avatar key={a.user_id} className="h-5 w-5 border border-background">
                                          <AvatarImage src={a.avatar_url || undefined} />
                                          <AvatarFallback className="text-[9px]">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {task.assignees.length > 3 && (
                                        <div className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center text-[9px] font-medium">
                                          +{task.assignees.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-3 w-3" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {subs.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>{doneSubs}/{subs.length}</span>
                                    </div>
                                    {/* Mini progress */}
                                    <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-emerald-500"
                                        style={{ width: `${subs.length > 0 ? (doneSubs / subs.length) * 100 : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : viewMode === "list" ? (
            /* List View */
            <div className="space-y-1 max-w-4xl mx-auto">
              {COLUMNS.map(col => {
                const colTasks = tasksForColumn(col.key)
                const Icon = col.icon
                if (colTasks.length === 0 && filterPriority !== "all") return null
                return (
                  <div key={col.key} className="mb-6">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Icon className={`h-4 w-4 ${col.color}`} />
                      <span className="text-sm font-semibold">{col.label}</span>
                      <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold ${col.count_bg}`}>
                        {colTasks.length}
                      </span>
                    </div>
                    {colTasks.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        No tasks in this column
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {colTasks.map(task => {
                          const priority = PRIORITY_CONFIG[task.priotrity] ?? PRIORITY_CONFIG.medium
                          const subs = subtasksOf(task.id)
                          const doneSubs = subs.filter(s => s.status === "done").length
                          return (
                            <button
                              key={task.id}
                              onClick={() => { setSelectedTask(task); setExpandedSubtaskId(null); setDetailOpen(true) }}
                              className="w-full flex items-center gap-4 rounded-lg border bg-background px-4 py-3 text-left hover:bg-muted/40 hover:shadow-sm transition-all group"
                            >
                              <Icon className={`h-4 w-4 shrink-0 ${col.color}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                    {task.title}
                                  </h3>
                                  <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[10px] font-semibold shrink-0 ${priority.bg} ${priority.color}`}>
                                    <Flag className={`h-2.5 w-2.5 ${priority.icon_color}`} />
                                    {priority.label}
                                  </span>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {subs.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {doneSubs}/{subs.length}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{formatDate(task.created_at)}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">No tasks found</h3>
                  <p className="text-xs text-muted-foreground">
                    {filterPriority !== "all" ? "Try changing the priority filter" : "Create your first task to get started"}
                  </p>
                </div>
              )}
            </div>
          ) : viewMode === "my-tasks" ? (
            /* My Tasks View */
            <div className="space-y-1 max-w-4xl mx-auto">
              {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">No tasks assigned to you</h3>
                  <p className="text-xs text-muted-foreground">
                    Tasks assigned to you will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold">My Assigned Tasks</span>
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      {myTasks.length}
                    </span>
                  </div>
                  {myTasks.map(task => {
                    const col = COLUMNS.find(c => c.key === task.status) ?? COLUMNS[0]
                    const priority = PRIORITY_CONFIG[task.priotrity] ?? PRIORITY_CONFIG.medium
                    const Icon = col.icon
                    return (
                      <div key={task.id} className="w-full rounded-lg border bg-background px-4 py-3 hover:bg-muted/40 hover:shadow-sm transition-all">
                        <button
                          onClick={() => { setSelectedTask(task); setExpandedSubtaskId(null); setDetailOpen(true) }}
                          className="w-full flex items-center gap-4 text-left group"
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${col.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {task.title}
                              </h3>
                              <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[10px] font-semibold shrink-0 ${priority.bg} ${priority.color}`}>
                                <Flag className={`h-2.5 w-2.5 ${priority.icon_color}`} />
                                {priority.label}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-muted-foreground">{formatDate(task.created_at)}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateTaskStatus(task.id, "todo")
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                              task.status === "todo"
                                ? "bg-slate-500 text-white"
                                : "border text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                          >
                            To Do
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateTaskStatus(task.id, "in_progress")
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                              task.status === "in_progress"
                                ? "bg-blue-500 text-white"
                                : "border text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
                            }`}
                          >
                            In Progress
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateTaskStatus(task.id, "review")
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                              task.status === "review"
                                ? "bg-purple-500 text-white"
                                : "border text-purple-600 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-900/30"
                            }`}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateTaskStatus(task.id, "done")
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                              task.status === "done"
                                ? "bg-emerald-500 text-white"
                                : "border text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                            }`}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

          {/* Create Task Side Panel */}
          {createOpen && (
            <div className="w-[360px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-semibold text-sm">Create Task</h2>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task_title">Title <span className="text-destructive">*</span></Label>
                  <Input
                    id="task_title"
                    placeholder="Task title"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task_description">Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="task_description"
                    placeholder="Describe the task..."
                    rows={4}
                    value={taskDescription}
                    onChange={e => setTaskDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Panel footer */}
              <div className="border-t px-5 py-3 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreateTask} disabled={isCreating}>
                  {isCreating
                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creating...</>
                    : <><Plus className="mr-1.5 h-3.5 w-3.5" />Create Task</>
                  }
                </Button>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {selectedTask && (() => {
            const col = COLUMNS.find(c => c.key === selectedTask.status) ?? COLUMNS[0]
            const priority = PRIORITY_CONFIG[selectedTask.priotrity] ?? PRIORITY_CONFIG.medium
            const subs = subtasksOf(selectedTask.id)
            const doneSubs = subs.filter(s => s.status === "done").length
            const Icon = col.icon
            return (
              <>
                {/* Colored header bar */}
                <div className={`px-6 py-4 ${col.headerBg} border-b`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${col.color}`} />
                      <Badge variant="secondary" className="text-xs font-medium">
                        {col.label}
                      </Badge>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${priority.bg} ${priority.color}`}>
                      <Flag className={`h-3 w-3 ${priority.icon_color}`} />
                      {priority.label} priority
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold leading-tight">{selectedTask.title}</h2>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Description */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/80">
                      {selectedTask.description || "No description provided."}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Created</p>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(selectedTask.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Created by</p>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        User #{selectedTask.created_by}
                      </div>
                    </div>
                  </div>

                  {/* Assignees */}
                  {selectedTask.assignees?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assignees</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.assignees.map(a => (
                          <div key={a.user_id} className="flex items-center gap-1.5 rounded-full border bg-muted/30 pl-1 pr-2.5 py-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={a.avatar_url || undefined} />
                              <AvatarFallback className="text-[9px]">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{a.first_name} {a.last_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subtasks */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Subtasks
                        </p>
                        {subs.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {doneSubs}/{subs.length} completed
                          </span>
                        )}
                      </div>
                      {canCreate && viewMode !== "my-tasks" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSubtaskParentId(selectedTask.id)
                            setSubtaskTitle("")
                            setSubtaskDescription("")
                            setSubtaskPriority("medium")
                            setSubtaskGroup("")
                            setSubtaskOpen(true)
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add
                        </Button>
                      )}
                    </div>

                    {subs.length > 0 && (
                      <>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(doneSubs / subs.length) * 100}%` }}
                          />
                        </div>
                        {(() => {
                          // Group subtasks: grouped ones by their group name, ungrouped ones separately
                          const grouped: Record<string, Task[]> = {}
                          const ungrouped: Task[] = []
                          subs.forEach(sub => {
                            if (sub.subtask_group) {
                              if (!grouped[sub.subtask_group]) grouped[sub.subtask_group] = []
                              grouped[sub.subtask_group].push(sub)
                            } else {
                              ungrouped.push(sub)
                            }
                          })
                          const groupNames = Object.keys(grouped)

                          const renderSubtask = (sub: Task) => {
                            const subCol = COLUMNS.find(c => c.key === sub.status) ?? COLUMNS[0]
                            const SubIcon = subCol.icon
                            const subPriority = PRIORITY_CONFIG[sub.priotrity] ?? PRIORITY_CONFIG.medium
                            const isExpanded = expandedSubtaskId === sub.id
                            return (
                              <div key={sub.id} className="rounded-lg border bg-muted/20 overflow-hidden">
                                <button
                                  onClick={() => setExpandedSubtaskId(isExpanded ? null : sub.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left group"
                                >
                                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                                  <SubIcon className={`h-3.5 w-3.5 shrink-0 ${subCol.color}`} />
                                  <span className="text-sm flex-1 truncate group-hover:text-primary transition-colors">{sub.title}</span>
                                  {!isExpanded && sub.assignees?.length > 0 && (
                                    <div className="flex -space-x-1.5 shrink-0">
                                      {sub.assignees.slice(0, 2).map(a => (
                                        <Avatar key={a.user_id} className="h-5 w-5 border border-background">
                                          <AvatarImage src={a.avatar_url || undefined} />
                                          <AvatarFallback className="text-[9px]">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {sub.assignees.length > 2 && (
                                        <div className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center text-[9px] font-medium">
                                          +{sub.assignees.length - 2}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <Badge variant="secondary" className="text-[10px] shrink-0">
                                    {subCol.label}
                                  </Badge>
                                </button>
                                {isExpanded && (
                                  <div className="px-4 pb-3 pt-1 border-t bg-muted/10 space-y-3">
                                    {sub.description && (
                                      <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
                                        {sub.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${subPriority.bg} ${subPriority.color}`}>
                                        <Flag className={`h-2.5 w-2.5 ${subPriority.icon_color}`} />
                                        {subPriority.label} priority
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        Created {formatDate(sub.created_at)}
                                      </span>
                                    </div>
                                    {sub.assignees?.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Assigned to</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {sub.assignees.map(a => (
                                            <div key={a.user_id} className="flex items-center gap-1.5 rounded-full border bg-background pl-1 pr-2.5 py-0.5">
                                              <Avatar className="h-4 w-4">
                                                <AvatarImage src={a.avatar_url || undefined} />
                                                <AvatarFallback className="text-[8px]">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                                              </Avatar>
                                              <span className="text-[11px]">{a.first_name} {a.last_name}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {sub.assignees?.length === 0 && (
                                      <p className="text-[11px] text-muted-foreground italic">No one assigned</p>
                                    )}
                                    {canCreate && viewMode !== "my-tasks" && (
                                      <div className="flex items-center gap-2 pt-2 border-t border-dashed">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingSubtask(sub)
                                            setEditSubTitle(sub.title)
                                            setEditSubDescription(sub.description)
                                            setEditSubPriority(sub.priotrity)
                                            setEditSubStatus(sub.status)
                                            setEditSubGroup(sub.subtask_group || "")
                                            setEditSubAssigneeIds(sub.assignees?.map(a => a.user_id) || [])
                                          }}
                                        >
                                          <Pencil className="mr-1 h-3 w-3" />
                                          Edit
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-7 text-xs"
                                          disabled={deletingSubtaskId === sub.id}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteSubtask(sub.id)
                                          }}
                                        >
                                          {deletingSubtaskId === sub.id
                                            ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                            : <Trash2 className="mr-1 h-3 w-3" />
                                          }
                                          Delete
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-3">
                              {/* Grouped subtasks */}
                              {groupNames.map(groupName => {
                                const groupSubs = grouped[groupName]
                                const groupDone = groupSubs.filter(s => s.status === "done").length
                                const isCollapsed = collapsedGroups.has(groupName)
                                return (
                                  <div key={groupName} className="rounded-lg border overflow-hidden">
                                    <button
                                      onClick={() => setCollapsedGroups(prev => {
                                        const next = new Set(prev)
                                        if (next.has(groupName)) next.delete(groupName)
                                        else next.add(groupName)
                                        return next
                                      })}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                                    >
                                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                                      <span className="text-xs font-semibold flex-1 truncate">{groupName}</span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">
                                        {groupDone}/{groupSubs.length}
                                      </span>
                                      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden shrink-0">
                                        <div
                                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                          style={{ width: `${(groupDone / groupSubs.length) * 100}%` }}
                                        />
                                      </div>
                                      {canCreate && viewMode !== "my-tasks" && (
                                        <div
                                          role="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSubtaskParentId(selectedTask!.id)
                                            setSubtaskGroup(groupName)
                                            setSubtaskTitle("")
                                            setSubtaskDescription("")
                                            setSubtaskPriority("medium")
                                            setSubtaskAssigneeIds([])
                                            setSubtaskOpen(true)
                                          }}
                                          className="h-5 w-5 rounded flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
                                          title={`Add subtask to ${groupName}`}
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                        </div>
                                      )}
                                    </button>
                                    {!isCollapsed && (
                                      <div className="space-y-1.5 p-1.5">
                                        {groupSubs.map(renderSubtask)}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Ungrouped subtasks */}
                              {ungrouped.length > 0 && groupNames.length > 0 && (
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Ungrouped</p>
                              )}
                              {ungrouped.length > 0 && (
                                <div className="space-y-1.5">
                                  {ungrouped.map(renderSubtask)}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </>
                    )}

                    {subs.length === 0 && (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        No subtasks yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {canCreate && viewMode !== "my-tasks" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditTitle(selectedTask.title)
                            setEditDescription(selectedTask.description)
                            setEditPriority(selectedTask.priotrity)
                            setEditStatus(selectedTask.status)
                            setEditAssigneeIds(selectedTask.assignees?.map(a => a.user_id) || [])
                            setEditOpen(true)
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDeleteTask}
                          disabled={isDeleting}
                        >
                          {isDeleting
                            ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          }
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Close</Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to the board</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task_title">Title *</Label>
              <Input
                id="task_title"
                placeholder="Task title"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task_description">Description *</Label>
              <Textarea
                id="task_description"
                placeholder="Describe the task..."
                rows={3}
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={taskStatus} onValueChange={setTaskStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={isCreating}>
              {isCreating
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                : <><Plus className="mr-2 h-4 w-4" />Create Task</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update the task details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_title">Title *</Label>
              <Input
                id="edit_title"
                placeholder="Task title"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                placeholder="Describe the task..."
                rows={3}
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {teamMembers.length > 0 && (
              <div className="grid gap-2">
                <Label>Assignees</Label>
                <div className="border rounded-lg max-h-36 overflow-y-auto divide-y">
                  {teamMembers.map(m => (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 cursor-pointer select-none"
                      onClick={() => setEditAssigneeIds(prev =>
                        prev.includes(m.user_id) ? prev.filter(id => id !== m.user_id) : [...prev, m.user_id]
                      )}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${editAssigneeIds.includes(m.user_id) ? "bg-primary border-primary" : "border-input"}`}>
                        {editAssigneeIds.includes(m.user_id) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{m.first_name[0]}{m.last_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.first_name} {m.last_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isEditing}>
              Cancel
            </Button>
            <Button onClick={handleEditTask} disabled={isEditing}>
              {isEditing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                : <><Pencil className="mr-2 h-4 w-4" />Save Changes</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Subtask Dialog */}
      <Dialog open={subtaskOpen} onOpenChange={setSubtaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subtask</DialogTitle>
            <DialogDescription>This subtask will be linked to the parent task</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subtask_title">Title *</Label>
              <Input
                id="subtask_title"
                placeholder="Subtask title"
                value={subtaskTitle}
                onChange={e => setSubtaskTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subtask_description">Description *</Label>
              <Textarea
                id="subtask_description"
                placeholder="Describe the subtask..."
                rows={3}
                value={subtaskDescription}
                onChange={e => setSubtaskDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={subtaskPriority} onValueChange={setSubtaskPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subtask_group">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Group (optional)
                </span>
              </Label>
              <Input
                id="subtask_group"
                placeholder="e.g. Design, Backend, Testing..."
                value={subtaskGroup}
                onChange={e => setSubtaskGroup(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Subtasks with the same group name will be grouped together</p>
            </div>
            {teamMembers.length > 0 && (
              <div className="grid gap-2">
                <Label>Assign to</Label>
                <div className="border rounded-lg max-h-36 overflow-y-auto divide-y">
                  {teamMembers.map(m => (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 cursor-pointer select-none"
                      onClick={() => setSubtaskAssigneeIds(prev =>
                        prev.includes(m.user_id) ? prev.filter(id => id !== m.user_id) : [...prev, m.user_id]
                      )}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${subtaskAssigneeIds.includes(m.user_id) ? "bg-primary border-primary" : "border-input"}`}>
                        {subtaskAssigneeIds.includes(m.user_id) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{m.first_name[0]}{m.last_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.first_name} {m.last_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtaskOpen(false)} disabled={isCreatingSubtask}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubtask} disabled={isCreatingSubtask}>
              {isCreatingSubtask
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                : <><Plus className="mr-2 h-4 w-4" />Add Subtask</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subtask Dialog */}
      <Dialog open={!!editingSubtask} onOpenChange={(open) => { if (!open) setEditingSubtask(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subtask</DialogTitle>
            <DialogDescription>Update the subtask details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_sub_title">Title *</Label>
              <Input
                id="edit_sub_title"
                placeholder="Subtask title"
                value={editSubTitle}
                onChange={e => setEditSubTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_sub_description">Description</Label>
              <Textarea
                id="edit_sub_description"
                placeholder="Describe the subtask..."
                rows={3}
                value={editSubDescription}
                onChange={e => setEditSubDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={editSubPriority} onValueChange={setEditSubPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editSubStatus} onValueChange={setEditSubStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_sub_group">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Group (optional)
                </span>
              </Label>
              <Input
                id="edit_sub_group"
                placeholder="e.g. Design, Backend, Testing..."
                value={editSubGroup}
                onChange={e => setEditSubGroup(e.target.value)}
              />
            </div>
            {teamMembers.length > 0 && (
              <div className="grid gap-2">
                <Label>Assignees</Label>
                <div className="border rounded-lg max-h-36 overflow-y-auto divide-y">
                  {teamMembers.map(m => (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 cursor-pointer select-none"
                      onClick={() => setEditSubAssigneeIds(prev =>
                        prev.includes(m.user_id) ? prev.filter(id => id !== m.user_id) : [...prev, m.user_id]
                      )}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${editSubAssigneeIds.includes(m.user_id) ? "bg-primary border-primary" : "border-input"}`}>
                        {editSubAssigneeIds.includes(m.user_id) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{m.first_name[0]}{m.last_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.first_name} {m.last_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubtask(null)} disabled={isEditingSubtask}>
              Cancel
            </Button>
            <Button onClick={handleEditSubtask} disabled={isEditingSubtask}>
              {isEditingSubtask
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                : <><Pencil className="mr-2 h-4 w-4" />Save Changes</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
