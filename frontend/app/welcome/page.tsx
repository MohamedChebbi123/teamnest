"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Hash, Loader2, PlusCircle, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import { getAccessToken } from "@/lib/auth"

interface UserData {
    first_name?: string
    last_name?: string
    email?: string
    avatar_url?: string
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
        router.push("/organization/create_organizattion")
    }

    const handleSendJoinInvite = async () => {
        const token = getAccessToken()
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/join`, {
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
                const detail = formatApiError(payload?.detail, "Failed to send join request")
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
                        
                        {/* Action Cards */}
                        <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
                            {/* Create Organization */}
                            <Card className="flex flex-col" data-tour="welcome-create-org">
                                <CardHeader>
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <PlusCircle className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Create an Organization</CardTitle>
                                    <CardDescription>
                                        Start fresh and build your own workspace for your team.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto">
                                    <Button
                                        onClick={handleCreateOrganization}
                                        className="w-full"
                                        size="lg"
                                        disabled={loading}
                                    >
                                        Create Organization
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Join Organization */}
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <UserPlus className="h-6 w-6" />
                                    </div>
                                    <CardTitle>Join an Organization</CardTitle>
                                    <CardDescription>
                                        Already have an invite? Enter the details below to request access.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="org-name" className="flex items-center gap-2 text-sm font-medium">
                                            <Building2 className="h-4 w-4 text-primary" />
                                            Organization Name
                                        </Label>
                                        <Input
                                            id="org-name"
                                            placeholder="e.g. Acme Inc"
                                            value={orgSearch}
                                            onChange={(e) => setOrgSearch(e.target.value)}
                                            disabled={loading || sendingInvite}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="org-tag" className="flex items-center gap-2 text-sm font-medium">
                                            <Hash className="h-4 w-4 text-primary" />
                                            Organization Tag
                                        </Label>
                                        <Input
                                            id="org-tag"
                                            placeholder="e.g. 123456"
                                            type="number"
                                            value={orgTag}
                                            onChange={(e) => setOrgTag(e.target.value)}
                                            disabled={loading || sendingInvite}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSendJoinInvite}
                                        className="w-full"
                                        size="lg"
                                        variant="outline"
                                        disabled={loading || sendingInvite}
                                    >
                                        {sendingInvite ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending Request...
                                            </>
                                        ) : (
                                            "Send Join Request"
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
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

