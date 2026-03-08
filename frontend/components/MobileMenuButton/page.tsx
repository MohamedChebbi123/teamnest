"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileMenuButtonProps {
  onClick: () => void
}

export default function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed top-4 left-4 z-50 lg:hidden"
      onClick={onClick}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
