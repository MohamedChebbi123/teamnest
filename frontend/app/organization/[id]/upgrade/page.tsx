"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Hash,
  Users,
  Upload,
  MessageSquare,
  Mic,
  ShieldCheck,
  Headphones,
  Sparkles,
  X,
  Check,
  ChevronDown,
  ArrowLeft,
  Crown,
  Loader2,
  Zap,
  Building2,
} from "lucide-react"
import { toast } from "sonner"

// ── Types ──

interface PlanFeature {
  icon: React.ElementType
  label: string
  included: boolean
  detail?: string
  comingSoon?: boolean
}

interface FaqItem {
  question: string
  answer: string
}

// ── Data ──

const FREE_FEATURES: PlanFeature[] = [
  { icon: Hash, label: "Up to 5 channels", included: true },
  { icon: Users, label: "Up to 10 members per org", included: true },
  { icon: Upload, label: "10 MB file upload limit", included: true },
  { icon: MessageSquare, label: "Limited message history", included: true },
  { icon: Mic, label: "Voice channels", included: false },
  { icon: ShieldCheck, label: "Basic roles only", included: true, detail: "Admin & Member" },
  { icon: Headphones, label: "Priority support", included: false },
  { icon: Sparkles, label: "AI features", included: false },
]

const PRO_FEATURES: PlanFeature[] = [
  { icon: Hash, label: "Unlimited channels", included: true },
  { icon: Users, label: "Unlimited members", included: true },
  { icon: Upload, label: "100 MB file upload limit", included: true },
  { icon: MessageSquare, label: "Unlimited message history", included: true },
  { icon: Mic, label: "Voice channels", included: true },
  { icon: ShieldCheck, label: "Advanced roles & permissions", included: true },
  { icon: Headphones, label: "Priority support", included: true },
  { icon: Sparkles, label: "AI-powered features", included: true, comingSoon: true },
]

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, absolutely. You can cancel your Pro subscription at any time from your organization settings. Your plan will remain active until the end of the current billing cycle with no additional charges.",
  },
  {
    question: "What happens if I downgrade?",
    answer:
      "When you downgrade to the Free plan, you keep access to Pro features until your billing period ends. After that, limits will apply — extra channels beyond 5 will become read-only, and file uploads will be capped at 10 MB.",
  },
  {
    question: "Are payments secure?",
    answer:
      "All payments are processed securely through Stripe, a PCI Level 1 certified payment processor. We never store your card details on our servers.",
  },
  {
    question: "Can I upgrade a single organization?",
    answer:
      "Yes. Pro plans are per-organization. You can upgrade one org while keeping others on the Free plan — you only pay for what you need.",
  },
]

// ── Components ──

function FeatureRow({ feature }: { feature: PlanFeature }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {feature.included ? (
        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
      )}
      <feature.icon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      <span
        className={
          feature.included ? "text-sm" : "text-sm text-muted-foreground/50"
        }
      >
        {feature.label}
      </span>
      {feature.detail && (
        <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
          {feature.detail}
        </span>
      )}
      {feature.comingSoon && (
        <Badge
          variant="secondary"
          className="ml-auto text-[10px] px-1.5 py-0 h-5 font-medium"
        >
          Coming soon
        </Badge>
      )}
    </div>
  )
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card overflow-hidden transition-colors hover:border-border/80"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-sm font-semibold pr-4">{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-200 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──

export default function UpgradePage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id
  const [upgrading, setUpgrading] = useState(false)
  const [orgName, setOrgName] = useState<string>("")
  const [currentPlan, setCurrentPlan] = useState<string>("free")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const token = localStorage.getItem("access_token")
        if (!token) {
          router.replace("/auth/login")
          return
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/get_organization/${organizationId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (res.ok) {
          const data = await res.json()
          setOrgName(data.organization_name || "")
          setCurrentPlan((data.organization_plan || "free").toLowerCase())
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    fetchOrg()
  }, [organizationId, router])

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        toast.error("Authentication required")
        router.push("/auth/login")
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/subscribe`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.ok) {
        const url = await response.json()
        window.location.href = url
      } else {
        const data = await response.json()
        toast.error("Failed to start upgrade", {
          description: data.detail || "Please try again",
        })
      }
    } catch {
      toast.error("Error", { description: "Failed to initiate upgrade" })
    } finally {
      setUpgrading(false)
    }
  }

  const isPro = currentPlan === "pro"

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/organization/${organizationId}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to {orgName || "Organization"}</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>

          {isPro && (
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Crown className="w-3 h-3" />
              Pro Active
            </Badge>
          )}
        </div>
      </nav>

      {/* Header */}
      <section className="pt-12 pb-4 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          {orgName && (
            <span className="text-sm font-medium text-muted-foreground">{orgName}</span>
          )}
        </div>

        <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium">
          <Sparkles className="w-3 h-3" />
          Simple, transparent pricing
        </Badge>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          {isPro ? "Manage your plan" : (
            <>
              Upgrade{" "}
              <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                to Pro
              </span>
            </>
          )}
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto">
          {isPro
            ? "You're on the Pro plan. Here's what's included."
            : "Unlock the full power of TeamNest for your organization."}
        </p>
      </section>

      {/* Plans */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
          {/* Free Plan */}
          <Card
            className={`relative transition-all duration-300 hover:shadow-lg hover:shadow-black/5 ${
              !isPro
                ? "border-2 border-foreground/20"
                : "border-border/60 hover:border-border"
            }`}
          >
            {!isPro && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center">
                <Badge variant="secondary" className="px-3 py-0.5 text-xs font-semibold shadow-sm">
                  Current plan
                </Badge>
              </div>
            )}

            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Free</CardTitle>
              <CardDescription>Everything you need to get started.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold tracking-tight">$0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>

              <Separator />

              <div className="space-y-0.5">
                {FREE_FEATURES.map((feature, i) => (
                  <FeatureRow key={i} feature={feature} />
                ))}
              </div>
            </CardContent>

            <CardFooter>
              {isPro ? (
                <Link href={`/organization/${organizationId}`} className="w-full">
                  <Button variant="outline" className="w-full h-11 font-semibold rounded-xl">
                    Current: Free tier limits
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-11 font-semibold rounded-xl"
                  disabled
                >
                  <Check className="w-4 h-4 mr-2" />
                  Your current plan
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card
            className={`relative transition-all duration-300 hover:shadow-2xl ${
              isPro
                ? "border-2 border-violet-500/60 shadow-xl shadow-violet-500/5 scale-[1.02]"
                : "border-2 border-violet-500/60 shadow-xl shadow-violet-500/5 scale-[1.02] hover:shadow-violet-500/10"
            }`}
          >
            <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
              <Badge className="bg-violet-500 hover:bg-violet-500 text-white border-0 px-3 py-1 text-xs font-semibold gap-1.5 shadow-lg shadow-violet-500/25">
                <Crown className="w-3 h-3" />
                {isPro ? "Active" : "Most Popular"}
              </Badge>
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pro</CardTitle>
              <CardDescription>For teams that need power and flexibility.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold tracking-tight">$10</span>
                <span className="text-sm text-muted-foreground">/ month per org</span>
              </div>

              <Separator />

              <div className="space-y-0.5">
                {PRO_FEATURES.map((feature, i) => (
                  <FeatureRow key={i} feature={feature} />
                ))}
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-2">
              {isPro ? (
                <Button
                  variant="outline"
                  className="w-full h-11 font-semibold rounded-xl"
                  disabled
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Your current plan
                </Button>
              ) : (
                <Button
                  className="w-full h-11 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                >
                  {upgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </>
                  )}
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {isPro ? "Manage billing in organization settings" : "Cancel anytime"}
              </p>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Comparison note */}
      <section className="pb-16 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Both plans include real-time messaging, direct messages, group chats,
            friend system, task management, and file sharing. Pro unlocks higher limits
            and premium features.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-muted/30 border-t border-border/40">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground text-sm">
              Everything you need to know about our plans.
            </p>
          </div>
          <FaqSection />
        </div>
      </section>

      {/* Bottom CTA */}
      {!isPro && (
        <section className="py-16 px-6 border-t border-border/40">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
              Ready to unlock the full experience?
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Upgrade now and give your team unlimited channels, members, and premium features.
            </p>
            <Button
              className="h-12 px-8 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/25"
              onClick={handleUpgrade}
              disabled={upgrading}
            >
              {upgrading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade to Pro — $10/month
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
