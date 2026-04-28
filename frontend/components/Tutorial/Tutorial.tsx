"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { driver, type Driver } from "driver.js"
import "driver.js/dist/driver.css"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, Rocket, PlayCircle, X } from "lucide-react"

const TUTORIAL_KEY = "teamnest_tutorial_completed"
const TUTORIAL_FORCE_EVENT = "teamnest:start-tutorial"

type TourStep = {
  element: string
  title: string
  description: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

const welcomeTour: TourStep[] = [
  {
    element: '[data-tour="sidebar-home"]',
    title: "This is your home base",
    description:
      "From here you can jump back to your dashboard, see your organizations, and access friends or direct messages.",
    side: "right",
  },
  {
    element: '[data-tour="sidebar-friends"]',
    title: "Add friends",
    description:
      "Find other TeamNest users by their tag and connect with them. Friends can DM you directly.",
    side: "right",
  },
  {
    element: '[data-tour="sidebar-dm"]',
    title: "Direct messages",
    description: "Have private 1:1 conversations with anyone you've connected with.",
    side: "right",
  },
  {
    element: '[data-tour="sidebar-add-org"]',
    title: "Create your first organization",
    description:
      "An organization is your workspace — it holds your teams, channels, and tasks. Click here to create or join one.",
    side: "right",
  },
  {
    element: '[data-tour="welcome-create-org"]',
    title: "Or start right here",
    description:
      "Click 'Create Organization' to get started. Once you have one, we'll show you how to invite teammates and set up channels.",
    side: "top",
  },
]

const organizationTour: TourStep[] = [
  {
    element: '[data-tour="org-add-member"]',
    title: "Invite your team",
    description:
      "Add members to your organization by their user tag. They can join as Admin or regular Member.",
    side: "bottom",
    align: "end",
  },
  {
    element: '[data-tour="org-new-team"]',
    title: "Create a team",
    description:
      "Teams group people working on the same project. Each team gets its own channels, tasks, and files.",
    side: "left",
  },
  {
    element: '[data-tour="org-quick-actions"]',
    title: "Quick actions",
    description:
      "Common shortcuts live here — invite members, create teams, or upgrade your plan in one click.",
    side: "left",
  },
  {
    element: '[data-tour="sidebar-dm"]',
    title: "Chat with anyone",
    description:
      "Direct messages are always one click away. Once a team is set up, you'll also see channels and an AI assistant inside it.",
    side: "right",
  },
  {
    element: '[data-tour="org-settings"]',
    title: "Manage your organization",
    description:
      "Edit organization details, manage your plan, or delete the org from this menu. You can replay this tour anytime from your profile menu.",
    side: "bottom",
    align: "end",
  },
]

function buildDriver(steps: TourStep[], onDone: () => void): Driver {
  return driver({
    showProgress: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.6,
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it",
    steps: steps.map((s) => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
        side: s.side,
        align: s.align,
      },
    })),
    onDestroyed: () => {
      onDone()
    },
  })
}

function elementsExist(steps: TourStep[]): boolean {
  return steps.some((s) => document.querySelector(s.element) !== null)
}

export default function Tutorial() {
  const pathname = usePathname()
  const router = useRouter()
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const driverRef = useRef<Driver | null>(null)
  const startedRef = useRef(false)

  const isWelcomePage = pathname === "/welcome"
  const isOrgPage = /^\/organization\/\d+$/.test(pathname || "")

  useEffect(() => {
    const startTour = (steps: TourStep[]) => {
      if (driverRef.current) {
        driverRef.current.destroy()
      }
      let attempts = 0
      const tryStart = () => {
        if (elementsExist(steps)) {
          driverRef.current = buildDriver(steps, () => {
            localStorage.setItem(TUTORIAL_KEY, "true")
            startedRef.current = false
          })
          driverRef.current.drive()
          startedRef.current = true
        } else if (attempts < 20) {
          attempts++
          setTimeout(tryStart, 200)
        }
      }
      tryStart()
    }

    const handleForceStart = () => {
      localStorage.removeItem(TUTORIAL_KEY)
      startedRef.current = false
      if (isOrgPage) {
        startTour(organizationTour)
      } else if (isWelcomePage) {
        setWelcomeOpen(true)
      } else {
        router.push("/welcome")
      }
    }

    window.addEventListener(TUTORIAL_FORCE_EVENT, handleForceStart)
    return () => window.removeEventListener(TUTORIAL_FORCE_EVENT, handleForceStart)
  }, [pathname, isOrgPage, isWelcomePage, router])

  const handleStartWelcomeTour = () => {
    setWelcomeOpen(false)
    setTimeout(() => {
      if (driverRef.current) driverRef.current.destroy()
      driverRef.current = buildDriver(welcomeTour, () => {
        localStorage.setItem(TUTORIAL_KEY, "true")
        startedRef.current = false
      })
      driverRef.current.drive()
      startedRef.current = true
    }, 200)
  }

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_KEY, "true")
    setWelcomeOpen(false)
  }

  const showWelcomeButton = isWelcomePage
  const showOrgButton = isOrgPage

  const handleOrgButtonClick = () => {
    if (driverRef.current) driverRef.current.destroy()
    let attempts = 0
    const tryStart = () => {
      if (elementsExist(organizationTour)) {
        driverRef.current = buildDriver(organizationTour, () => {
          localStorage.setItem(TUTORIAL_KEY, "true")
          startedRef.current = false
        })
        driverRef.current.drive()
        startedRef.current = true
      } else if (attempts < 20) {
        attempts++
        setTimeout(tryStart, 200)
      }
    }
    tryStart()
  }

  return (
    <>
      {showWelcomeButton && (
        <Button
          onClick={() => setWelcomeOpen(true)}
          className="fixed bottom-6 right-6 z-50 shadow-lg"
          size="lg"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Start tutorial
        </Button>
      )}
      {showOrgButton && (
        <Button
          onClick={handleOrgButtonClick}
          className="fixed bottom-6 right-6 z-50 shadow-lg"
          size="lg"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Start tutorial
        </Button>
      )}
      <Dialog open={welcomeOpen} onOpenChange={setWelcomeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Welcome to TeamNest</DialogTitle>
            <DialogDescription className="text-center">
              Take a quick 60-second tour and we'll show you the essentials —
              organizations, teams, channels, and how to chat with your team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-center gap-2 sm:gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button onClick={handleStartWelcomeTour}>
              <Rocket className="h-4 w-4 mr-2" />
              Start tour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function startTutorial() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(TUTORIAL_FORCE_EVENT))
}
