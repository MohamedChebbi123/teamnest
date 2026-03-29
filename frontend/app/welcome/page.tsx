"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface UserData {
    first_name?: string
    last_name?: string
    email?: string
    avatar_url?: string
    is_verified?: boolean
    profile_completed?: boolean
}

export default function WelcomePage() {
    const [user, setUser] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const [orgSearch, setOrgSearch] = useState("")
    const [orgTag, setOrgTag] = useState("")
    const [sendingInvite, setSendingInvite] = useState(false)
    const router = useRouter()

    const handleUserFetched = (userData: UserData | null) => {
        setUser(userData)
        setLoading(false)
    }


    const handleCreateOrganization = () => {
        if (!user?.is_verified) {
            toast.error("Email Verification Required", {
                description: "You need to verify your email before creating an organization.",
                action: {
                    label: "Verify Email",
                    onClick: () => router.push("/auth/verify-email")
                }
            })
            return
        }
        router.push("/organization/create_organizattion")
    }

    const handleJoinOrganization = () => {
        if (!user?.is_verified) {
            toast.error("Email Verification Required", {
                description: "You need to verify your email before joining an organization.",
                action: {
                    label: "Verify Email",
                    onClick: () => router.push("/auth/verify-email")
                }
            })
            return
        }
    }

    const handleSendJoinInvite = async () => {
        if (!user?.is_verified) {
            toast.error("Email Verification Required", {
                description: "You need to verify your email before joining an organization.",
                action: {
                    label: "Verify Email",
                    onClick: () => router.push("/auth/verify-email")
                }
            })
            return
        }

        const token = localStorage.getItem("access_token") || localStorage.getItem("token")
        if (!token) {
            toast.error("Authentication Required", {
                description: "Please login again to continue."
            })
            router.push("/auth/login")
            return
        }

        const trimmedName = orgSearch.trim()
        const parsedTag = Number(orgTag)

        if (!trimmedName) {
            toast.error("Organization name is required")
            return
        }

        if (!orgTag || Number.isNaN(parsedTag) || parsedTag <= 0) {
            toast.error("Organization tag must be a valid number")
            return
        }

        try {
            setSendingInvite(true)
            const response = await fetch("http://localhost:8000/organization/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    org_name: trimmedName,
                    org_tag: parsedTag
                })
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                const detail = payload?.detail || "Failed to send join request"
                toast.error("Invite Failed", { description: detail })
                return
            }

            toast.success("Invite Sent", {
                description: "Your join request has been sent successfully."
            })
            setOrgSearch("")
            setOrgTag("")
        } catch {
            toast.error("Network Error", {
                description: "Could not connect to server. Please try again."
            })
        } finally {
            setSendingInvite(false)
        }
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar onUserFetched={handleUserFetched} />
            <main className="flex-1 overflow-auto">
                <div className="p-8 lg:p-12">
                    <h1 className="text-3xl font-bold">Welcome to TeamNest{user?.first_name ? `, ${user.first_name}` : ''}</h1>
                   

                    {/* Welcome Image */}
                    <div className="flex flex-col items-center my-12">
                        <div className="relative w-full max-w-md mb-8">
                            <img 
                                src="/LOGOORG.png" 
                                alt="Welcome to TeamNest"
                                className="w-full h-auto rounded-lg"
                                style={{ backgroundColor: 'transparent' }}
                            />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                            <Button 
                                onClick={handleCreateOrganization}
                                className="flex-1"
                                size="lg"
                                disabled={loading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Organization
                            </Button>
                            <Button 
                                onClick={handleJoinOrganization}
                                className="flex-1"
                                variant="outline"
                                size="lg"
                                disabled={loading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Join Organization
                            </Button>
                        </div>

                        <div className="w-full max-w-md mt-6 rounded-lg border p-4">
                            <h2 className="text-lg font-semibold mb-3">Join an Organization</h2>
                            <div className="space-y-3">
                                <Input
                                    placeholder="Search organization name"
                                    value={orgSearch}
                                    onChange={(e) => setOrgSearch(e.target.value)}
                                    disabled={loading || sendingInvite}
                                />
                                <Input
                                    placeholder="Organization tag (example: 123456)"
                                    type="number"
                                    value={orgTag}
                                    onChange={(e) => setOrgTag(e.target.value)}
                                    disabled={loading || sendingInvite}
                                />
                                <Button
                                    onClick={handleSendJoinInvite}
                                    className="w-full"
                                    disabled={loading || sendingInvite}
                                >
                                    {sendingInvite ? "Sending..." : "Send Invite"}
                                </Button>
                            </div>
                        </div>

                    </div>

                    {loading ? (
                        <div className="mt-8">
                            <p>Loading...</p>
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    )
}

