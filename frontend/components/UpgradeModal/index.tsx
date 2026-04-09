"use client"

import { useRouter } from "next/navigation"
import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  upgradeUrl?: string
}

export default function UpgradeModal({ open, onClose, title, description, upgradeUrl }: UpgradeModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onClose()
    if (upgradeUrl) router.push(upgradeUrl)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/15">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Maybe later
          </Button>
          {upgradeUrl && (
            <Button onClick={handleUpgrade} className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white">
              <Zap className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
