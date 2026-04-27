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
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Loader2, Plus, Calendar, CalendarDays, User, Flag, CheckCircle2, Circle, Clock, LayoutGrid, List, ChevronRight, ChevronLeft, ChevronDown, AlertCircle, Pencil, Trash2, Check, X, FolderOpen, Eye, Paperclip, FileText, Image, Download } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import Sidebar from "@/components/Sidebar/page"
import MembersSidebar from "@/components/MembersSidebar/page"
import UpgradeModal from "@/components/UpgradeModal"

interface Attachment {
  id: number
  file_url: string
  file_name: string
  uploaded_by: number
  uploaded_at: string
}

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
  priority: string
  status: string
  team_id: number
  created_by: number
  parent_task_id: number | null
  subtask_group: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  assignees: Assignee[]
  attachments: Attachment[]
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
  const [filterDue, setFilterDue] = useState<"all" | "overdue" | "today" | "week" | "no_date">("all")
  const [sortBy, setSortBy] = useState<"default" | "due_asc" | "due_desc">("default")
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
  const [taskDueDate, setTaskDueDate] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriority, setEditPriority] = useState("medium")
  const [editStatus, setEditStatus] = useState("todo")
  const [editAssigneeIds, setEditAssigneeIds] = useState<number[]>([])
  const [editDueDate, setEditDueDate] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Subtask dialog
  const [subtaskOpen, setSubtaskOpen] = useState(false)
  const [subtaskParentId, setSubtaskParentId] = useState<number | null>(null)
  const [subtaskTitle, setSubtaskTitle] = useState("")
  const [subtaskDescription, setSubtaskDescription] = useState("")
  const [subtaskPriority, setSubtaskPriority] = useState("medium")
  const [subtaskGroup, setSubtaskGroup] = useState("")
  const [subtaskDueDate, setSubtaskDueDate] = useState("")
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
  const [editSubDueDate, setEditSubDueDate] = useState("")
  const [isEditingSubtask, setIsEditingSubtask] = useState(false)
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<number | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [showFileSizeModal, setShowFileSizeModal] = useState(false)

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks`,
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/my-tasks`,
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

        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        let userId: number | null = null
        if (userRes.ok) userId = (await userRes.json()).user_id
        setUserId(userId)

        const orgRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/members`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (orgRes.ok) {
          const members = await orgRes.json()
          const me = members.find((m: any) => m.user_id === userId)
          if (me) setUserRole(me.role_user)
        }

        const teamRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/team/${teamId}/members`,
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: taskTitle, description: taskDescription, priority: taskPriority, status: taskStatus, parent_task_id: null, assignee_ids: taskAssigneeIds, due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null }),
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
        setTaskDueDate("")
      } else {
        toast.error("Error", { description: formatApiError(data.detail, "Failed to create task") })
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks`,
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
            due_date: subtaskDueDate ? new Date(subtaskDueDate).toISOString() : null,
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
        setSubtaskDueDate("")
      } else {
        toast.error("Error", { description: formatApiError(data.detail, "Failed to create subtask") })
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks/${selectedTask.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: editTitle, description: editDescription, priority: editPriority, status: editStatus, assignee_ids: editAssigneeIds, due_date: editDueDate ? new Date(editDueDate).toISOString() : null }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Task updated")
        setTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setSelectedTask(data)
        setEditOpen(false)
      } else {
        toast.error("Error", { description: formatApiError(data.detail, "Failed to update task") })
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks/${selectedTask.id}`,
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
        toast.error("Error", { description: formatApiError(data.detail, "Failed to delete task") })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUploadAttachment = async (taskId: number, file: File) => {
    const MAX_FREE_BYTES = 10 * 1024 * 1024
    if (file.size > MAX_FREE_BYTES) {
      setShowFileSizeModal(true)
      return
    }
    setIsUploadingAttachment(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks/${taskId}/attachments`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ file_name: file.name, file_base64: base64, file_size: file.size }),
          }
        )
        const data = await res.json()
        if (res.ok) {
          toast.success("Attachment uploaded")
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, attachments: [...(t.attachments || []), data] } : t))
          setSelectedTask(prev => prev && prev.id === taskId ? { ...prev, attachments: [...(prev.attachments || []), data] } : prev)
        } else {
          toast.error("Error", { description: formatApiError(data.detail, "Failed to upload attachment") })
        }
        setIsUploadingAttachment(false)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error("Error", { description: "An error occurred" })
      setIsUploadingAttachment(false)
    }
  }

  const handleDeleteAttachment = async (taskId: number, attachmentId: number) => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks/${taskId}/attachments/${attachmentId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        toast.success("Attachment deleted")
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, attachments: t.attachments.filter(a => a.id !== attachmentId) } : t))
        setSelectedTask(prev => prev && prev.id === taskId ? { ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId) } : prev)
      } else {
        const data = await res.json()
        toast.error("Error", { description: formatApiError(data.detail, "Failed to delete attachment") })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    }
  }

  const handleReviewTask = async (taskId: number, action: "accept" | "reject") => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks/${taskId}/review?action=${action}`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success(action === "accept" ? "Task accepted — marked as Done" : "Task rejected — moved back to In Progress")
        setTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setMyTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setSelectedTask(prev => (prev && prev.id === data.id ? data : prev))
      } else {
        toast.error("Error", { description: formatApiError(data.detail, "Failed to review task") })
      }
    } catch {
      toast.error("Error", { description: "An error occurred" })
    }
  }

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/my-tasks/${taskId}/status`,
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
        toast.error("Error", { description: formatApiError(data.detail, "Failed to update task") })
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks/${editingSubtask.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: editSubTitle, description: editSubDescription, priority: editSubPriority, status: editSubStatus, subtask_group: editSubGroup.trim() || null, assignee_ids: editSubAssigneeIds, due_date: editSubDueDate ? new Date(editSubDueDate).toISOString() : null }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Subtask updated")
        setTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setEditingSubtask(null)
      } else {
        toast.error("Error", { description: formatApiError(data.detail, "Failed to update subtask") })
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/tasks/${subtaskId}`,
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
        toast.error("Error", { description: formatApiError(data.detail, "Failed to delete subtask") })
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

  const startOfToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()
  const endOfToday = (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d })()
  const endOfWeek = (() => { const d = new Date(startOfToday); d.setDate(d.getDate() + 7); return d })()

  const matchesDueFilter = (t: Task) => {
    if (filterDue === "all") return true
    if (filterDue === "no_date") return !t.due_date
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    if (filterDue === "overdue") return due.getTime() < startOfToday.getTime() && t.status !== "done"
    if (filterDue === "today") return due.getTime() >= startOfToday.getTime() && due.getTime() <= endOfToday.getTime()
    if (filterDue === "week") return due.getTime() >= startOfToday.getTime() && due.getTime() <= endOfWeek.getTime()
    return true
  }

  const filteredTasks = parentTasks
    .filter(t => filterPriority === "all" || t.priority === filterPriority)
    .filter(matchesDueFilter)

  const sortTasks = (list: Task[]) => {
    if (sortBy === "default") return list
    const dir = sortBy === "due_asc" ? 1 : -1
    return [...list].sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : null
      const bd = b.due_date ? new Date(b.due_date).getTime() : null
      if (ad === null && bd === null) return 0
      if (ad === null) return 1
      if (bd === null) return -1
      return (ad - bd) * dir
    })
  }

  const tasksForColumn = (status: string) => sortTasks(filteredTasks.filter(t => t.status === status))

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
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/organization/${organizationId}/${teamId}`)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{totalTasks} tasks</span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{progressPercent}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                {([
                  { key: "board" as const, icon: LayoutGrid, label: "Board" },
                  { key: "list" as const, icon: List, label: "List" },
                  { key: "calendar" as const, icon: CalendarDays, label: "Calendar" },
                  { key: "my-tasks" as const, icon: User, label: "My Tasks" },
                ] as const).map(v => (
                  <button
                    key={v.key}
                    onClick={() => setViewMode(v.key)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                      viewMode === v.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <v.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDue} onValueChange={(v) => setFilterDue(v as typeof filterDue)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Due" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any due date</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Due today</SelectItem>
                  <SelectItem value="week">Due this week</SelectItem>
                  <SelectItem value="no_date">No due date</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default order</SelectItem>
                  <SelectItem value="due_asc">Due soonest</SelectItem>
                  <SelectItem value="due_desc">Due latest</SelectItem>
                </SelectContent>
              </Select>

              {canCreate && viewMode !== "my-tasks" && (
                <Button onClick={() => setCreateOpen(true)} size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Task
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
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
              filteredTasks.filter(t => t.due_date && sameDay(new Date(t.due_date), day))

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
                            const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
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
            <div className="grid grid-cols-4 gap-3 h-full min-h-0">
              {COLUMNS.map(col => {
                const colTasks = tasksForColumn(col.key)
                const Icon = col.icon
                return (
                  <div key={col.key} className="flex flex-col min-h-0 rounded-xl border bg-muted/20">
                    {/* Column header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${col.bg}`} />
                        <span className="text-xs font-semibold">{col.label}</span>
                        <span className="text-[10px] text-muted-foreground">{colTasks.length}</span>
                      </div>
                      {canCreate && (
                        <button
                          onClick={() => {
                            setTaskStatus(col.key)
                            setCreateOpen(true)
                          }}
                          className="rounded p-0.5 hover:bg-muted transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>

                    {/* Column body */}
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                      {colTasks.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-[11px] text-muted-foreground/50">No tasks</p>
                        </div>
                      ) : (
                        colTasks.map(task => {
                          const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
                          const subs = subtasksOf(task.id)
                          const doneSubs = subs.filter(s => s.status === "done").length
                          return (
                            <button
                              key={task.id}
                              onClick={() => { setSelectedTask(task); setExpandedSubtaskId(null); setDetailOpen(true) }}
                              className="w-full text-left rounded-lg border bg-background p-3 hover:shadow-md transition-all hover:-translate-y-0.5 group"
                            >
                              {/* Title */}
                              <h3 className="text-[13px] font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                {task.title}
                              </h3>

                              {/* Meta row */}
                              <div className="flex items-center justify-between mt-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${priority.bg} ${priority.color}`}>
                                    <Flag className={`h-2.5 w-2.5 ${priority.icon_color}`} />
                                    {priority.label}
                                  </span>
                                  {subs.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {doneSubs}/{subs.length}
                                    </span>
                                  )}
                                  {task.due_date && (() => {
                                    const due = new Date(task.due_date)
                                    const overdue = due.getTime() < startOfToday.getTime() && task.status !== "done"
                                    const dueToday = due.getTime() >= startOfToday.getTime() && due.getTime() <= endOfToday.getTime()
                                    return (
                                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${overdue ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : dueToday ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                                        <CalendarDays className="h-2.5 w-2.5" />
                                        {formatDate(task.due_date)}
                                      </span>
                                    )
                                  })()}
                                </div>
                                {task.assignees?.length > 0 ? (
                                  <div className="flex -space-x-1.5">
                                    {task.assignees.slice(0, 2).map(a => (
                                      <Avatar key={a.user_id} className="h-5 w-5 border-2 border-background">
                                        <AvatarImage src={a.avatar_url || undefined} />
                                        <AvatarFallback className="text-[8px] bg-muted">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {task.assignees.length > 2 && (
                                      <div className="h-5 w-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px] font-medium">
                                        +{task.assignees.length - 2}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
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
                          const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
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
                                {task.due_date && (() => {
                                  const due = new Date(task.due_date)
                                  const overdue = due.getTime() < startOfToday.getTime() && task.status !== "done"
                                  return (
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                                      <CalendarDays className="h-3 w-3" />
                                      {formatDate(task.due_date)}
                                    </span>
                                  )
                                })()}
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
                    {filterPriority !== "all" || filterDue !== "all" ? "Try changing the filters" : "Create your first task to get started"}
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
                    const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
                    const Icon = col.icon
                    const statusOrder = ["todo", "in_progress", "review", "done"]
                    const currentIdx = statusOrder.indexOf(task.status)
                    return (
                      <div key={task.id} className="w-full rounded-lg border bg-background overflow-hidden hover:shadow-sm transition-all">
                        <button
                          onClick={() => { setSelectedTask(task); setExpandedSubtaskId(null); setDetailOpen(true) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left group"
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${col.color}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {task.title}
                            </h3>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${priority.bg} ${priority.color}`}>
                            <Flag className={`h-2.5 w-2.5 ${priority.icon_color}`} />
                            {priority.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </button>

                        {/* Status stepper */}
                        <div className="px-4 pb-3 flex items-center gap-1">
                          {COLUMNS.map((step, i) => {
                            const StepIcon = step.icon
                            const isActive = step.key === task.status
                            const isPast = i < currentIdx
                            const isClickable = step.key !== "done"
                            return (
                              <div key={step.key} className="flex items-center gap-1 flex-1">
                                {i > 0 && (
                                  <div className={`h-[2px] flex-1 rounded-full transition-colors ${isPast || isActive ? step.bg : "bg-muted"}`} />
                                )}
                                <button
                                  type="button"
                                  disabled={!isClickable}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isClickable) handleUpdateTaskStatus(task.id, step.key)
                                  }}
                                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-all whitespace-nowrap ${
                                    isActive
                                      ? `${step.bg} text-white shadow-sm`
                                      : isPast
                                        ? `${step.color} bg-transparent`
                                        : `text-muted-foreground/50 ${isClickable ? "hover:text-muted-foreground" : ""}`
                                  }`}
                                  title={step.label}
                                >
                                  <StepIcon className="h-3 w-3" />
                                  {isActive && <span>{step.label}</span>}
                                </button>
                              </div>
                            )
                          })}
                        </div>

                        {/* Review actions */}
                        {task.status === "review" && (canManageTasks || userRole === "OWNER") && !task.assignees.some(a => a.user_id === userId) && (
                          <div className="flex items-center gap-2 px-4 pb-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleReviewTask(task.id, "accept") }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleReviewTask(task.id, "reject") }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

      </main>

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[85vh] rounded-2xl shadow-2xl border-0 bg-background">
          {selectedTask && (() => {
            const col = COLUMNS.find(c => c.key === selectedTask.status) ?? COLUMNS[0]
            const priority = PRIORITY_CONFIG[selectedTask.priority] ?? PRIORITY_CONFIG.medium
            const subs = subtasksOf(selectedTask.id)
            const doneSubs = subs.filter(s => s.status === "done").length
            const Icon = col.icon
            return (
              <>
                {/* ── Top: Title + badges + actions ── */}
                <div className="px-8 pt-7 pb-5">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${col.count_bg}`}>
                      <Icon className={`h-3 w-3 ${col.color}`} />
                      {col.label}
                    </div>
                    <div className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${priority.bg} ${priority.color}`}>
                      <Flag className={`h-3 w-3 ${priority.icon_color}`} />
                      {priority.label}
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      {canCreate && viewMode !== "my-tasks" && (
                        <>
                          <button
                            onClick={() => {
                              setEditTitle(selectedTask.title)
                              setEditDescription(selectedTask.description)
                              setEditPriority(selectedTask.priority)
                              setEditStatus(selectedTask.status)
                              setEditAssigneeIds(selectedTask.assignees?.map(a => a.user_id) || [])
                              setEditDueDate(selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : "")
                              setEditOpen(true)
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={handleDeleteTask}
                            disabled={isDeleting}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <DialogTitle className="text-xl font-semibold tracking-tight leading-snug">
                    {selectedTask.title}
                  </DialogTitle>
                </div>

                <Separator />

                {/* ── Description (full width) ── */}
                <div className="px-8 py-5">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {selectedTask.description || <span className="text-muted-foreground/40 italic">No description</span>}
                  </p>
                </div>

                {/* Review actions (full width) */}
                {selectedTask.status === "review" && (canManageTasks || userRole === "OWNER") && !selectedTask.assignees.some(a => a.user_id === userId) && (
                  <div className="px-8 pb-4">
                    <div className="flex items-center gap-2">
                      <Button
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-none rounded-lg h-9"
                        onClick={() => { handleReviewTask(selectedTask.id, "accept"); setDetailOpen(false) }}
                      >
                        <Check className="mr-2 h-4 w-4" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30 shadow-none rounded-lg h-9"
                        onClick={() => { handleReviewTask(selectedTask.id, "reject"); setDetailOpen(false) }}
                      >
                        <X className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                {/* ── Two-column layout: Left (subtasks) | Right (sidebar) ── */}
                <div className="flex min-h-0 overflow-hidden" style={{ maxHeight: "calc(85vh - 280px)" }}>

                  {/* LEFT — Subtasks (70%) */}
                  <div className="flex-[7] overflow-y-auto px-8 py-5 min-w-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[13px] font-semibold text-foreground">Subtasks</h3>
                        {subs.length > 0 && (
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {doneSubs} of {subs.length}
                          </span>
                        )}
                      </div>
                      {canCreate && viewMode !== "my-tasks" && (
                        <button
                          onClick={() => {
                            setSubtaskParentId(selectedTask.id)
                            setSubtaskTitle("")
                            setSubtaskDescription("")
                            setSubtaskPriority("medium")
                            setSubtaskGroup("")
                            setSubtaskOpen(true)
                          }}
                          className="flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      )}
                    </div>

                    {subs.length > 0 && (
                      <div className="w-full h-1 rounded-full bg-muted overflow-hidden mb-4">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(doneSubs / subs.length) * 100}%` }} />
                      </div>
                    )}

                    {subs.length > 0 ? (() => {
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
                        const subPriority = PRIORITY_CONFIG[sub.priority] ?? PRIORITY_CONFIG.medium
                        const isExpanded = expandedSubtaskId === sub.id
                        return (
                          <div key={sub.id}>
                            <button
                              onClick={() => setExpandedSubtaskId(isExpanded ? null : sub.id)}
                              className="w-full flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                            >
                              <SubIcon className={`h-3.5 w-3.5 shrink-0 ${subCol.color}`} />
                              <span className={`text-[13px] flex-1 truncate ${sub.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {sub.title}
                              </span>
                              {sub.assignees?.length > 0 && !isExpanded && (
                                <div className="flex -space-x-1 shrink-0">
                                  {sub.assignees.slice(0, 2).map(a => (
                                    <Avatar key={a.user_id} className="h-5 w-5 border-2 border-background">
                                      <AvatarImage src={a.avatar_url || undefined} />
                                      <AvatarFallback className="text-[8px] bg-muted">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                              )}
                              <span className={`text-[10px] font-medium shrink-0 ${subCol.color}`}>{subCol.label}</span>
                              <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                            </button>

                            {isExpanded && (
                              <div className="ml-5 pl-3 border-l-2 border-muted pb-3 pt-1 space-y-2.5">
                                {sub.description && (
                                  <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{sub.description}</p>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${subPriority.bg} ${subPriority.color}`}>
                                    <Flag className={`h-2.5 w-2.5 ${subPriority.icon_color}`} />
                                    {subPriority.label}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground/60">{formatDate(sub.created_at)}</span>
                                </div>
                                {sub.assignees?.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex -space-x-1">
                                      {sub.assignees.map(a => (
                                        <Avatar key={a.user_id} className="h-5 w-5 border-2 border-background">
                                          <AvatarImage src={a.avatar_url || undefined} />
                                          <AvatarFallback className="text-[8px] bg-muted">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                                        </Avatar>
                                      ))}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">{sub.assignees.map(a => a.first_name).join(", ")}</span>
                                  </div>
                                )}
                                {sub.attachments?.length > 0 && (
                                  <div className="space-y-1">
                                    {sub.attachments.map(att => {
                                      const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(att.file_name)
                                      return (
                                        <div key={att.id} className="flex items-center gap-2 py-1">
                                          {isImage ? <Image className="h-3.5 w-3.5 text-blue-500 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                          <span className="text-[11px] text-muted-foreground flex-1 truncate">{att.file_name}</span>
                                          <a href={att.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground/50 hover:text-primary transition-colors"><Download className="h-3 w-3" /></a>
                                          {att.uploaded_by === userId && (
                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(sub.id, att.id) }} className="text-muted-foreground/50 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                                <label className={`inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary cursor-pointer transition-colors ${isUploadingAttachment ? "opacity-50 pointer-events-none" : ""}`}>
                                  {isUploadingAttachment ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                                  {isUploadingAttachment ? "Uploading..." : "Attach file"}
                                  <input type="file" className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); const file = e.target.files?.[0]; if (file) handleUploadAttachment(sub.id, file); e.target.value = "" }} />
                                </label>
                                {canCreate && viewMode !== "my-tasks" && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingSubtask(sub); setEditSubTitle(sub.title); setEditSubDescription(sub.description); setEditSubPriority(sub.priority); setEditSubStatus(sub.status); setEditSubGroup(sub.subtask_group || ""); setEditSubAssigneeIds(sub.assignees?.map(a => a.user_id) || []); setEditSubDueDate(sub.due_date ? sub.due_date.slice(0, 10) : "") }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Edit</button>
                                    <span className="text-muted-foreground/30">·</span>
                                    <button disabled={deletingSubtaskId === sub.id} onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(sub.id) }} className="text-[11px] text-muted-foreground hover:text-red-500 transition-colors">{deletingSubtaskId === sub.id ? "Deleting..." : "Delete"}</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-0.5">
                          {groupNames.map(groupName => {
                            const groupSubs = grouped[groupName]
                            const groupDone = groupSubs.filter(s => s.status === "done").length
                            const isCollapsed = collapsedGroups.has(groupName)
                            return (
                              <div key={groupName}>
                                <button
                                  onClick={() => setCollapsedGroups(prev => { const next = new Set(prev); if (next.has(groupName)) next.delete(groupName); else next.add(groupName); return next })}
                                  className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                                >
                                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                                  <span className="text-[13px] font-medium flex-1 truncate">{groupName}</span>
                                  <span className="text-[11px] text-muted-foreground/60">{groupDone}/{groupSubs.length}</span>
                                  {canCreate && viewMode !== "my-tasks" && (
                                    <div role="button" onClick={(e) => { e.stopPropagation(); setSubtaskParentId(selectedTask!.id); setSubtaskGroup(groupName); setSubtaskTitle(""); setSubtaskDescription(""); setSubtaskPriority("medium"); setSubtaskAssigneeIds([]); setSubtaskOpen(true) }} className="rounded p-1 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors shrink-0" title={`Add to ${groupName}`}>
                                      <Plus className="h-3.5 w-3.5" />
                                    </div>
                                  )}
                                </button>
                                {!isCollapsed && <div className="ml-3 space-y-0.5">{groupSubs.map(renderSubtask)}</div>}
                              </div>
                            )
                          })}
                          {ungrouped.length > 0 && groupNames.length > 0 && <p className="text-[11px] font-medium text-muted-foreground/50 pt-2 pb-1">Other</p>}
                          {ungrouped.map(renderSubtask)}
                        </div>
                      )
                    })() : (
                      <p className="text-[13px] text-muted-foreground/40 py-3">No subtasks yet</p>
                    )}
                  </div>

                  {/* RIGHT — Sidebar (30%) */}
                  <div className="flex-[3] border-l bg-muted/20 overflow-y-auto py-5 px-5 space-y-6 min-w-[200px]">

                    {/* Assigned */}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-2.5">Assigned to</p>
                      {selectedTask.assignees?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedTask.assignees.map(a => (
                            <div key={a.user_id} className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={a.avatar_url || undefined} />
                                <AvatarFallback className="text-[9px] bg-muted font-medium">{a.first_name[0]}{a.last_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-[13px] text-foreground">{a.first_name} {a.last_name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-muted-foreground/40">Unassigned</p>
                      )}
                    </div>

                    {/* Priority */}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-2">Priority</p>
                      <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium ${priority.bg} ${priority.color}`}>
                        <Flag className={`h-3 w-3 ${priority.icon_color}`} />
                        {priority.label}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-2">Status</p>
                      <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium ${col.count_bg}`}>
                        <Icon className={`h-3 w-3 ${col.color}`} />
                        {col.label}
                      </div>
                    </div>

                    {/* Due date */}
                    {selectedTask.due_date && (() => {
                      const due = new Date(selectedTask.due_date)
                      const now = new Date()
                      const overdue = due.getTime() < now.getTime() && selectedTask.status !== "done"
                      return (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground mb-2">Due</p>
                          <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium ${overdue ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-muted text-foreground/70"}`}>
                            <CalendarDays className="h-3 w-3" />
                            {due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {overdue && <span className="text-[10px]">overdue</span>}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Date */}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-2">Created</p>
                      <div className="flex items-center gap-1.5 text-[12px] text-foreground/70">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(selectedTask.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      {selectedTask.updated_at && selectedTask.updated_at !== selectedTask.created_at && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 mt-1.5">
                          <Clock className="h-3 w-3" />
                          Updated {timeAgo(selectedTask.updated_at)}
                        </div>
                      )}
                    </div>

                    {/* Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">Attachments</p>
                        <label className={`cursor-pointer text-muted-foreground/50 hover:text-primary transition-colors ${isUploadingAttachment ? "opacity-50 pointer-events-none" : ""}`}>
                          {isUploadingAttachment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadAttachment(selectedTask.id, file); e.target.value = "" }} />
                        </label>
                      </div>
                      {selectedTask.attachments?.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedTask.attachments.map(att => {
                            const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(att.file_name)
                            return (
                              <div key={att.id} className="flex items-center gap-2 py-1 group">
                                <div className="h-7 w-7 rounded-md bg-background flex items-center justify-center shrink-0">
                                  {isImage ? <Image className="h-3.5 w-3.5 text-blue-500" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                                <span className="text-[11px] flex-1 truncate text-foreground/70">{att.file_name}</span>
                                <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all shrink-0">
                                  <Download className="h-3 w-3" />
                                </a>
                                {att.uploaded_by === userId && (
                                  <button type="button" onClick={() => handleDeleteAttachment(selectedTask.id, att.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/40">None</p>
                      )}
                    </div>
                  </div>
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
            <div className="grid gap-2">
              <Label htmlFor="task_due_date">Due date</Label>
              <Input
                id="task_due_date"
                type="date"
                value={taskDueDate}
                onChange={e => setTaskDueDate(e.target.value)}
              />
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
            <div className="grid gap-2">
              <Label htmlFor="edit_due_date">Due date</Label>
              <Input
                id="edit_due_date"
                type="date"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
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
            <div className="grid gap-2">
              <Label htmlFor="subtask_due_date">Due date</Label>
              <Input
                id="subtask_due_date"
                type="date"
                value={subtaskDueDate}
                onChange={e => setSubtaskDueDate(e.target.value)}
              />
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
            <div className="grid gap-2">
              <Label htmlFor="edit_sub_due_date">Due date</Label>
              <Input
                id="edit_sub_due_date"
                type="date"
                value={editSubDueDate}
                onChange={e => setEditSubDueDate(e.target.value)}
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
      <UpgradeModal
        open={showFileSizeModal}
        onClose={() => setShowFileSizeModal(false)}
        title="File too large"
        description="Your plan allows files up to 10 MB. Upgrade to Pro for up to 100 MB uploads."
        upgradeUrl={`/organization/${organizationId}/upgrade`}
      />
    </div>
  )
}
