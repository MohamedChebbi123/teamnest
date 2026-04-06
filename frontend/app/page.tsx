"use client"

import { useState } from "react"
import Link from "next/link"
import { useTheme } from "@/context/ThemeContext"
import {
  MessageSquare,
  Building2,
  CheckCircle2,
  Shield,
  Zap,
  ArrowRight,
  Hash,
  ListTodo,
  UserPlus,
  Bell,
  FileUp,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react"

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background font-extrabold text-sm tracking-tight">TN</span>
            </div>
            <span className="font-bold text-xl tracking-tight">TeamNest</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="px-5 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              Get started free
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3">
            <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <div className="pt-3 border-t border-border/50 flex flex-col gap-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <Link href="/auth/login" className="text-sm font-medium text-muted-foreground">Log in</Link>
              <Link href="/auth/register" className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg text-center">Get started free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-xs font-medium rounded-full border border-border/60 text-muted-foreground bg-muted/50">
            <Zap className="w-3.5 h-3.5" />
            Real-time collaboration for modern teams
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
            Where teams come
            <br />
            together to{" "}
            <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              build great things
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Messaging, task management, and team organization — all in one place.
            Stop juggling tools and start shipping faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group"
            >
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold border border-border rounded-xl hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
            >
              See features
            </a>
          </div>
        </div>

        {/* Hero visual */}
        <div className="max-w-5xl mx-auto mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/5 overflow-hidden">
            {/* Mock app header */}
            <div className="border-b border-border/60 bg-muted/30 px-5 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-background/60 text-xs text-muted-foreground">
                  app.teamnest.com
                </div>
              </div>
            </div>
            {/* Mock app content */}
            <div className="flex h-[340px] md:h-[440px]">
              {/* Sidebar */}
              <div className="w-16 md:w-56 bg-muted/20 border-r border-border/40 p-3 space-y-2 shrink-0">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/60">
                  <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <span className="hidden md:block text-xs font-medium truncate">Acme Corp</span>
                </div>
                <div className="space-y-0.5 pt-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-2 hidden md:block">Channels</div>
                  {["general", "engineering", "design"].map((ch) => (
                    <div key={ch} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted/40">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden md:block">{ch}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-0.5 pt-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-2 hidden md:block">Direct Messages</div>
                  {[
                    { name: "Sarah K.", color: "bg-emerald-400" },
                    { name: "Alex M.", color: "bg-sky-400" },
                  ].map((u) => (
                    <div key={u.name} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground">
                      <div className={`w-4 h-4 rounded-full ${u.color} shrink-0`} />
                      <span className="hidden md:block">{u.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main chat area */}
              <div className="flex-1 flex flex-col">
                <div className="border-b border-border/40 px-5 py-2.5 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">engineering</span>
                </div>
                <div className="flex-1 p-5 space-y-4 overflow-hidden">
                  {[
                    { name: "Sarah K.", msg: "Just pushed the new auth flow. Can someone review?", time: "10:24 AM", color: "bg-emerald-400" },
                    { name: "Alex M.", msg: "On it! The login page looks clean.", time: "10:26 AM", color: "bg-sky-400" },
                    { name: "You", msg: "Nice work! I'll handle the task assignments next.", time: "10:28 AM", color: "bg-violet-400" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full ${m.color} shrink-0 mt-0.5`} />
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{m.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/40 px-5 py-3">
                  <div className="rounded-lg bg-muted/40 border border-border/40 px-4 py-2.5 text-xs text-muted-foreground/60">
                    Message #engineering
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Everything your team needs
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From real-time messaging to task tracking — one platform, zero friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: MessageSquare,
                title: "Real-time Messaging",
                desc: "Channels, direct messages, and group chats with instant delivery. Pin messages, search history, and share files seamlessly.",
                gradient: "from-violet-500/10 to-purple-500/10",
                iconColor: "text-violet-500",
              },
              {
                icon: Building2,
                title: "Organizations & Teams",
                desc: "Create organizations, form teams, assign roles, and manage members with fine-grained permissions and admin controls.",
                gradient: "from-sky-500/10 to-cyan-500/10",
                iconColor: "text-sky-500",
              },
              {
                icon: ListTodo,
                title: "Task Management",
                desc: "Create, assign, and track tasks within teams. Full review workflow with status tracking, attachments, and approvals.",
                gradient: "from-emerald-500/10 to-green-500/10",
                iconColor: "text-emerald-500",
              },
              {
                icon: UserPlus,
                title: "Friends & Connections",
                desc: "Send friend requests, manage your connections, and block unwanted contacts. Build your professional network within TeamNest.",
                gradient: "from-orange-500/10 to-amber-500/10",
                iconColor: "text-orange-500",
              },
              {
                icon: Bell,
                title: "Live Notifications",
                desc: "Never miss a message or update. Real-time WebSocket notifications keep you in the loop across all your teams and chats.",
                gradient: "from-pink-500/10 to-rose-500/10",
                iconColor: "text-pink-500",
              },
              {
                icon: FileUp,
                title: "File Sharing",
                desc: "Drag, drop, and share files in any conversation or task. Cloud-powered storage keeps your team's assets organized.",
                gradient: "from-indigo-500/10 to-blue-500/10",
                iconColor: "text-indigo-500",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`group rounded-2xl border border-border/50 bg-gradient-to-br ${feature.gradient} p-7 hover:border-border transition-all hover:shadow-lg hover:shadow-black/5`}
              >
                <div className={`w-10 h-10 rounded-xl bg-background border border-border/60 flex items-center justify-center mb-5 ${feature.iconColor}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Up and running in minutes
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Three simple steps to transform how your team collaborates.
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Create your organization",
                desc: "Sign up, verify your email, and create your first organization. Set a name, description, and invite your team.",
              },
              {
                step: "02",
                title: "Build your teams & channels",
                desc: "Organize members into teams, create channels for topics, and set up roles and permissions that match your workflow.",
              },
              {
                step: "03",
                title: "Collaborate in real-time",
                desc: "Start messaging, assigning tasks, sharing files, and tracking progress — all from one unified workspace.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-6 rounded-2xl border border-border/50 bg-background p-7 hover:border-border/80 transition-colors"
              >
                <div className="text-4xl font-extrabold text-muted-foreground/20 shrink-0 leading-none pt-1">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security & Trust ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-10 md:p-14">
            <div className="flex flex-col md:flex-row items-start gap-10">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
                  Built with security first
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Your team&apos;s data is protected with industry-standard practices. From authentication to data handling, security is at the core of TeamNest.
                </p>
              </div>
              <div className="flex-1 space-y-4">
                {[
                  "Email verification for every account",
                  "JWT-based secure authentication",
                  "Role-based access control",
                  "User blocking and privacy controls",
                  "Secure file storage with Cloudinary",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Teaser ── */}
      <section id="pricing" className="py-24 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Free to start, powerful to scale
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-12">
            Get started with everything you need. Upgrade when your team is ready.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-border/50 bg-background p-8 text-left">
              <div className="text-sm font-medium text-muted-foreground mb-2">Free</div>
              <div className="text-4xl font-extrabold mb-1">$0</div>
              <div className="text-sm text-muted-foreground mb-6">forever</div>
              <ul className="space-y-3 mb-8">
                {["Create organizations", "Unlimited messaging", "Team management", "Task tracking", "File sharing"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="block w-full py-2.5 text-sm font-semibold border border-border rounded-xl text-center hover:bg-muted/50 transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Premium */}
            <div className="rounded-2xl border-2 border-violet-500/50 bg-background p-8 text-left relative">
              <div className="absolute -top-3 left-8 px-3 py-0.5 text-xs font-semibold bg-violet-500 text-white rounded-full">
                Popular
              </div>
              <div className="text-sm font-medium text-violet-500 mb-2">Premium</div>
              <div className="text-4xl font-extrabold mb-1">$10</div>
              <div className="text-sm text-muted-foreground mb-6">per month</div>
              <ul className="space-y-3 mb-8">
                {["Everything in Free", "Priority support", "Advanced permissions", "Extended storage", "Premium features"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="block w-full py-2.5 text-sm font-semibold bg-violet-500 text-white rounded-xl text-center hover:bg-violet-600 transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Ready to nest your team?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Join teams already using TeamNest to communicate, collaborate, and ship faster.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity group"
          >
            Get started for free
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-bold text-[10px]">TN</span>
            </div>
            <span className="font-semibold text-sm">TeamNest</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link href="/auth/login" className="hover:text-foreground transition-colors">Log in</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TeamNest. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

