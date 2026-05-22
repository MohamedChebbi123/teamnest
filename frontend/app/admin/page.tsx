"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users as UsersIcon,
  Building2,
  LogOut,
  Loader2,
  Activity,
  MessageSquare,
  Hash,
  ShieldCheck,
  RefreshCw,
  Search,
  Mail,
  BadgeCheck,
  ChevronRight,
  Crown,
  Folder,
  Volume2,
  Users2,
  Layers,
  Gift,
  Ban,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { authFetch, hydrateAccessToken, getAccessToken, logout } from "@/lib/auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Overview {
  users_count: number
  active_users_count: number
  organizations_count: number
  paid_orgs_count: number
  free_orgs_count: number
  channels_count: number
  messages_sent: number
}

interface AdminUser {
  user_id: number
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  country: string | null
  user_tag: string | null
  is_verified: boolean
  profile_completed: boolean
  status: string
  role: string
  account_status: string
  joined_at: string | null
  last_login_at: string | null
}

interface OrgMember {
  user_id: number
  first_name: string
  last_name: string
  avatar_url: string | null
  role: string
  joined_at: string | null
}

interface OrgChannel {
  channel_id: number
  channel_name: string
  channel_category: string
}

interface OrgTeam {
  team_id: number
  team_name: string
  team_size: number | null
  created_at: string | null
  channels: OrgChannel[]
}

interface AdminOrganization {
  organization_id: number
  organization_name: string
  organization_picture: string | null
  organization_tag: string
  organization_plan: string | null
  created_at: string | null
  owner: {
    user_id: number | null
    first_name: string | null
    last_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
  members_count: number
  teams_count: number
  channels_count: number
  members: OrgMember[]
  teams: OrgTeam[]
  org_channels: OrgChannel[]
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const duration = 800
    const start = performance.now()
    const from = 0
    const to = value
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{display.toLocaleString()}</>
}

interface StatCardProps {
  label: string
  value: number
  hint: string
  icon: React.ReactNode
  delay?: number
}

function StatCard({ label, value, hint, icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      <Card className="relative border-border/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-tight">
            <AnimatedNumber value={value} />
          </div>
          <CardDescription className="mt-1.5 text-xs">{hint}</CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  )
}

type ConfirmKind = "ban" | "unban" | "delete-org"
interface ConfirmState {
  kind: ConfirmKind
  title: string
  description: string
  confirmLabel: string
  destructive: boolean
  run: () => Promise<void>
}

export default function AdminDashboard() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState<Overview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [orgs, setOrgs] = useState<AdminOrganization[]>([])
  const [orgSearch, setOrgSearch] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const load = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else setRefreshing(true)

    const token = getAccessToken() ?? (await hydrateAccessToken())
    if (!token) {
      router.replace("/auth/login")
      return
    }

    try {
      const [overviewRes, usersRes, orgsRes] = await Promise.all([
        authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/overview`),
        authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`),
        authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/organizations`),
      ])

      if (overviewRes.status === 403 || usersRes.status === 403 || orgsRes.status === 403) {
        toast.error("Access denied", { description: "You are not an administrator." })
        router.replace("/home")
        return
      }
      if (!overviewRes.ok) throw new Error("Failed to load admin overview")
      if (!usersRes.ok) throw new Error("Failed to load users list")
      if (!orgsRes.ok) throw new Error("Failed to load organizations list")

      const overview = (await overviewRes.json()) as Overview
      const usersJson = (await usersRes.json()) as AdminUser[]
      const orgsJson = (await orgsRes.json()) as AdminOrganization[]
      setData(overview)
      setUsers(usersJson)
      setOrgs(orgsJson)
    } catch (err) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Failed to load dashboard",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await logout()
    router.replace("/auth/login")
  }

  const apiAction = async (url: string, method: "POST" | "DELETE", successMsg: string) => {
    setActionBusy(true)
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, { method })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail || "Action failed")
      toast.success(successMsg)
      await load(false)
    } catch (err) {
      toast.error("Action failed", {
        description: err instanceof Error ? err.message : "Something went wrong",
      })
    } finally {
      setActionBusy(false)
      setConfirm(null)
    }
  }

  const askBan = (u: AdminUser) =>
    setConfirm({
      kind: "ban",
      title: `Ban ${u.first_name} ${u.last_name}?`,
      description:
        "They will be signed out of all sessions and blocked from logging back in. This can be reversed.",
      confirmLabel: "Ban user",
      destructive: true,
      run: () => apiAction(`/admin/users/${u.user_id}/ban`, "POST", "User banned"),
    })

  const askUnban = (u: AdminUser) =>
    setConfirm({
      kind: "unban",
      title: `Unban ${u.first_name} ${u.last_name}?`,
      description: "They will be able to log in again.",
      confirmLabel: "Unban",
      destructive: false,
      run: () => apiAction(`/admin/users/${u.user_id}/unban`, "POST", "User unbanned"),
    })

  const askDeleteOrg = (org: AdminOrganization) =>
    setConfirm({
      kind: "delete-org",
      title: `Delete "${org.organization_name}"?`,
      description:
        "This permanently removes the workspace, its teams, channels, messages, files and tasks. This cannot be undone.",
      confirmLabel: "Delete workspace",
      destructive: true,
      run: () => apiAction(`/admin/organizations/${org.organization_id}`, "DELETE", "Workspace deleted"),
    })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  const activeRatio = data && data.users_count > 0
    ? Math.round((data.active_users_count / data.users_count) * 100)
    : 0

  const avgMsgsPerUser = data && data.users_count > 0
    ? Math.round(data.messages_sent / data.users_count)
    : 0

  const avgChannelsPerOrg = data && data.organizations_count > 0
    ? Math.round((data.channels_count / data.organizations_count) * 10) / 10
    : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-foreground border border-border/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                TeamNest · Admin Console
              </p>
              <h1 className="text-lg font-semibold leading-tight">Owner Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(false)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {users.length.toLocaleString()} users · {orgs.length.toLocaleString()} workspaces · {activeRatio}% active
            </p>
          </div>
        </section>

        {/* KPI grid */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Total Users"
            value={data?.users_count ?? 0}
            hint="All registered accounts"
            icon={<UsersIcon className="w-4 h-4" />}
            delay={0.05}
          />
          <StatCard
            label="Active Users"
            value={data?.active_users_count ?? 0}
            hint="Currently online or away"
            icon={<Activity className="w-4 h-4" />}
            delay={0.1}
          />
          <StatCard
            label="Organizations"
            value={data?.organizations_count ?? 0}
            hint="Workspaces created"
            icon={<Building2 className="w-4 h-4" />}
            delay={0.15}
          />
          <StatCard
            label="Pro Workspaces"
            value={data?.paid_orgs_count ?? 0}
            hint="On the paid plan"
            icon={<Crown className="w-4 h-4" />}
            delay={0.2}
          />
          <StatCard
            label="Free Workspaces"
            value={data?.free_orgs_count ?? 0}
            hint="On the free plan"
            icon={<Gift className="w-4 h-4" />}
            delay={0.22}
          />
          <StatCard
            label="Channels"
            value={data?.channels_count ?? 0}
            hint="Across all orgs"
            icon={<Hash className="w-4 h-4" />}
            delay={0.25}
          />
          <StatCard
            label="Messages Sent"
            value={data?.messages_sent ?? 0}
            hint="Channel + DM + group"
            icon={<MessageSquare className="w-4 h-4" />}
            delay={0.3}
          />
        </section>

        {/* Insight panels */}
        <section className="grid gap-5 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-border/60 shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User activity</CardTitle>
                    <CardDescription>How many of your users are online right now</CardDescription>
                  </div>
                  <Badge variant="secondary">{activeRatio}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-medium">
                      {data?.active_users_count ?? 0} / {data?.users_count ?? 0}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${activeRatio}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
                      className="h-full bg-foreground/80 rounded-full"
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Online</p>
                    <p className="text-2xl font-semibold">
                      <AnimatedNumber value={data?.active_users_count ?? 0} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Offline</p>
                    <p className="text-2xl font-semibold text-muted-foreground">
                      <AnimatedNumber value={Math.max(0, (data?.users_count ?? 0) - (data?.active_users_count ?? 0))} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.33 }}
          >
            <Card className="border-border/60 shadow-none h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Plan mix</CardTitle>
                    <CardDescription>Free vs Pro workspaces</CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="w-3 h-3" />
                    {data && data.organizations_count > 0
                      ? Math.round((data.paid_orgs_count / data.organizations_count) * 100)
                      : 0}
                    % Pro
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  const total = data?.organizations_count ?? 0
                  const paid = data?.paid_orgs_count ?? 0
                  const free = data?.free_orgs_count ?? 0
                  const paidPct = total > 0 ? (paid / total) * 100 : 0
                  const freePct = total > 0 ? (free / total) * 100 : 0
                  return (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Distribution</span>
                          <span className="font-medium">{total} total</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${paidPct}%` }}
                            transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
                            className="bg-foreground/80"
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${freePct}%` }}
                            transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
                            className="bg-muted-foreground/50"
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground">
                            <Crown className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pro</p>
                            <p className="text-2xl font-semibold">
                              <AnimatedNumber value={paid} />
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground">
                            <Gift className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Free</p>
                            <p className="text-2xl font-semibold">
                              <AnimatedNumber value={free} />
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
          >
            <Card className="border-border/60 shadow-none h-full">
              <CardHeader>
                <CardTitle>Platform insights</CardTitle>
                <CardDescription>Derived metrics from your raw counts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <InsightRow
                  label="Avg. messages per user"
                  value={avgMsgsPerUser.toLocaleString()}
                  hint="Total messages / total users"
                  icon={<MessageSquare className="w-4 h-4 text-muted-foreground" />}
                />
                <Separator />
                <InsightRow
                  label="Avg. channels per workspace"
                  value={avgChannelsPerOrg.toLocaleString()}
                  hint="Total channels / total orgs"
                  icon={<Hash className="w-4 h-4 text-muted-foreground" />}
                />
                <Separator />
                <InsightRow
                  label="Workspaces per user"
                  value={
                    data && data.users_count > 0
                      ? (Math.round((data.organizations_count / data.users_count) * 100) / 100).toLocaleString()
                      : "0"
                  }
                  hint="Total orgs / total users"
                  icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                />
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Organizations tree */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
        >
          <Card className="border-border/60 shadow-none overflow-hidden">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-muted-foreground" />
                  Organizations
                </CardTitle>
                <CardDescription>
                  {orgs.length.toLocaleString()} {orgs.length === 1 ? "workspace" : "workspaces"} · click to expand
                </CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search organizations…"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <OrgTreeList orgs={orgs} search={orgSearch} onDelete={askDeleteOrg} />
            </CardContent>
          </Card>
        </motion.section>

        {/* Users list */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-border/60 shadow-none overflow-hidden">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>All users</CardTitle>
                <CardDescription>
                  {users.length.toLocaleString()} {users.length === 1 ? "account" : "accounts"} registered
                </CardDescription>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or tag…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <UsersTable users={users} search={search} onBan={askBan} onUnban={askUnban} />
            </CardContent>
          </Card>
        </motion.section>

        <Dialog open={!!confirm} onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full",
                    confirm?.destructive
                      ? "bg-red-500/10 ring-1 ring-red-500/30"
                      : "bg-primary/10 ring-1 ring-primary/30"
                  )}
                >
                  {confirm?.destructive ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <DialogTitle>{confirm?.title}</DialogTitle>
                </div>
              </div>
              <DialogDescription className="pt-2">{confirm?.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirm(null)}
                disabled={actionBusy}
              >
                Cancel
              </Button>
              <Button
                variant={confirm?.destructive ? "destructive" : "default"}
                onClick={() => confirm?.run()}
                disabled={actionBusy}
              >
                {actionBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Working…
                  </>
                ) : (
                  confirm?.confirmLabel
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-center text-xs text-muted-foreground pt-4">
          TeamNest Admin · Data refreshes on demand
        </p>
      </main>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "online"
      ? "bg-green-500"
      : status === "away"
      ? "bg-yellow-500"
      : status === "busy" || status === "dnd"
      ? "bg-red-500"
      : "bg-muted-foreground/40"
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      <span className="capitalize text-xs text-muted-foreground">{status || "offline"}</span>
    </span>
  )
}

function formatDate(value: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "—"
  }
}

function OrgTreeList({
  orgs,
  search,
  onDelete,
}: {
  orgs: AdminOrganization[]
  search: string
  onDelete: (org: AdminOrganization) => void
}) {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? orgs.filter((o) =>
        `${o.organization_name} ${o.organization_tag} ${o.owner?.email ?? ""}`
          .toLowerCase()
          .includes(q)
      )
    : orgs

  if (filtered.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        No organizations match your search.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map((org) => (
        <OrgTreeNode key={org.organization_id} org={org} onDelete={onDelete} />
      ))}
    </div>
  )
}

function OrgTreeNode({
  org,
  onDelete,
}: {
  org: AdminOrganization
  onDelete: (org: AdminOrganization) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const ownerName = org.owner
    ? `${org.owner.first_name ?? ""} ${org.owner.last_name ?? ""}`.trim() || org.owner.email
    : "—"
  const ownerInitials = org.owner
    ? `${org.owner.first_name?.[0] ?? ""}${org.owner.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 transition-all">
      <div className="flex items-stretch">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex-1 flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronRight
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform shrink-0",
              expanded && "rotate-90"
            )}
          />
          <Avatar className="w-10 h-10">
            {org.organization_picture ? (
              <AvatarImage src={org.organization_picture} alt={org.organization_name} />
            ) : null}
            <AvatarFallback className="bg-muted text-sm font-semibold">
              {org.organization_name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{org.organization_name}</p>
              {org.organization_plan && (
                <Badge variant="secondary" className="capitalize text-xs">
                  {org.organization_plan}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {ownerName}
              </span>
              <span>·</span>
              <span>#{org.organization_tag}</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="gap-1">
            <Users2 className="w-3 h-3" />
            {org.members_count}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Folder className="w-3 h-3" />
            {org.teams_count}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Hash className="w-3 h-3" />
            {org.channels_count}
          </Badge>
        </div>
      </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(org)
          }}
          className="px-3 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors border-l border-border/40"
          title="Delete workspace"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="border-t border-border/50 bg-muted/10"
        >
          <div className="p-4 space-y-3">
            {org.owner && (
              <TreeBranch
                icon={<Crown className="w-3.5 h-3.5 text-muted-foreground" />}
                label="Owner"
                badge={null}
              >
                <div className="flex items-center gap-2 py-1">
                  <Avatar className="w-6 h-6">
                    {org.owner.avatar_url ? (
                      <AvatarImage src={org.owner.avatar_url} alt={ownerName ?? "owner"} />
                    ) : null}
                    <AvatarFallback className="text-[10px]">{ownerInitials}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <span className="font-medium">{ownerName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{org.owner.email}</span>
                  </div>
                </div>
              </TreeBranch>
            )}

            {/* Org-level channels */}
            {org.org_channels.length > 0 && (
              <TreeBranch
                icon={<Hash className="w-3.5 h-3.5 text-muted-foreground" />}
                label="Org channels"
                badge={org.org_channels.length}
              >
                <div className="space-y-1">
                  {org.org_channels.map((c) => (
                    <ChannelRow key={c.channel_id} channel={c} />
                  ))}
                </div>
              </TreeBranch>
            )}

            {/* Teams */}
            {org.teams.length > 0 && (
              <TreeBranch
                icon={<Folder className="w-3.5 h-3.5 text-muted-foreground" />}
                label="Teams"
                badge={org.teams.length}
              >
                <div className="space-y-2">
                  {org.teams.map((team) => (
                    <TeamNode key={team.team_id} team={team} />
                  ))}
                </div>
              </TreeBranch>
            )}

            {/* Members */}
            {org.members.length > 0 && (
              <TreeBranch
                icon={<Users2 className="w-3.5 h-3.5 text-muted-foreground" />}
                label="Members"
                badge={org.members.length}
              >
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {org.members.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background/50 border border-border/40"
                    >
                      <Avatar className="w-7 h-7">
                        {m.avatar_url ? (
                          <AvatarImage src={m.avatar_url} alt={m.first_name} />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {`${m.first_name?.[0] ?? ""}${m.last_name?.[0] ?? ""}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {m.first_name} {m.last_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {m.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TreeBranch>
            )}

            {org.org_channels.length === 0 &&
              org.teams.length === 0 &&
              org.members.length === 0 && (
                <p className="text-xs text-muted-foreground pl-2">This workspace is empty.</p>
              )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function TreeBranch({
  icon,
  label,
  badge,
  children,
}: {
  icon: React.ReactNode
  label: string
  badge: number | null
  children: React.ReactNode
}) {
  return (
    <div className="relative pl-5 border-l-2 border-dashed border-border/50">
      <div className="flex items-center gap-2 mb-2 -ml-[26px]">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-background border border-border/60">
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {badge !== null && (
          <Badge variant="outline" className="h-5 text-[10px] px-1.5">
            {badge}
          </Badge>
        )}
      </div>
      <div className="pl-1">{children}</div>
    </div>
  )
}

function TeamNode({ team }: { team: OrgTeam }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border/40 rounded-lg bg-background/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
              open && "rotate-90"
            )}
          />
          <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{team.team_name}</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px] gap-1">
          <Hash className="w-2.5 h-2.5" />
          {team.channels.length}
        </Badge>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-border/40 bg-muted/10 space-y-1">
          {team.channels.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">No channels in this team.</p>
          ) : (
            team.channels.map((c) => <ChannelRow key={c.channel_id} channel={c} indent />)
          )}
        </div>
      )}
    </div>
  )
}

function ChannelRow({ channel, indent = false }: { channel: OrgChannel; indent?: boolean }) {
  const isVoice = channel.channel_category === "voice"
  const Icon = isVoice ? Volume2 : Hash
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm px-2 py-1 rounded-md hover:bg-muted/30",
        indent && "pl-6"
      )}
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="truncate">{channel.channel_name}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">
        {channel.channel_category}
      </span>
    </div>
  )
}

function UsersTable({
  users,
  search,
  onBan,
  onUnban,
}: {
  users: AdminUser[]
  search: string
  onBan: (u: AdminUser) => void
  onUnban: (u: AdminUser) => void
}) {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? users.filter((u) =>
        `${u.first_name} ${u.last_name} ${u.email} ${u.user_tag ?? ""}`
          .toLowerCase()
          .includes(q)
      )
    : users

  if (filtered.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        No users match your search.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="text-left">
            <th className="font-medium px-6 py-3">User</th>
            <th className="font-medium px-4 py-3">Email</th>
            <th className="font-medium px-4 py-3">Role</th>
            <th className="font-medium px-4 py-3">Status</th>
            <th className="font-medium px-4 py-3">Country</th>
            <th className="font-medium px-4 py-3">Joined</th>
            <th className="font-medium px-4 py-3">Last login</th>
            <th className="font-medium px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u, idx) => {
            const initials = `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase()
            const banned = u.account_status === "banned"
            return (
              <tr
                key={u.user_id}
                className={cn(
                  "border-t border-border/40 hover:bg-muted/30 transition-colors",
                  idx % 2 === 1 && "bg-muted/10",
                  banned && "opacity-60"
                )}
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.first_name} /> : null}
                      <AvatarFallback className="text-xs font-medium bg-muted">
                        {initials || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        {u.is_verified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                      </div>
                      {u.user_tag && (
                        <p className="text-xs text-muted-foreground">#{u.user_tag}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[220px]">{u.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {u.role === "admin" ? (
                      <Badge variant="outline" className="gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {u.role || "none"}
                      </Badge>
                    )}
                    {banned && (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="w-3 h-3" />
                        Banned
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusDot status={u.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.country || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(u.joined_at)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(u.last_login_at)}</td>
                <td className="px-4 py-3 text-right">
                  {u.role === "admin" ? (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  ) : banned ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-8 text-green-600 border-green-500/40 hover:bg-green-500/10 hover:text-green-600"
                      onClick={() => onUnban(u)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Unban
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-8 text-red-500 border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => onBan(u)}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Ban
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function InsightRow({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/60">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
