"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { User, Shield } from "lucide-react"

const navItems = [
    {
        label: "Edit Profile",
        href: "/settings/edit_profile",
        icon: User,
    },
    {
        label: "Security",
        href: "/settings/security",
        icon: Shield,
    },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="container max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your account settings</p>
            </div>

            <div className="flex gap-8">
                <aside className="w-48 shrink-0">
                    <nav className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const active = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        active
                                            ? "bg-muted text-foreground"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </aside>

                <main className="flex-1 min-w-0">{children}</main>
            </div>
        </div>
    )
}
