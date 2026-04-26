"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"

export default function SecuritySettings() {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [updating, setUpdating] = useState(false)

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match")
            return
        }

        setUpdating(true)

        try {
            const token = localStorage.getItem("access_token")
            if (!token) {
                toast.error("Please login first")
                return
            }

            const formData = new FormData()
            formData.append("current_password", currentPassword)
            formData.append("new_password", newPassword)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/change-password`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const text = await response.text()
                let detail = "Failed to change password"
                try { detail = formatApiError(JSON.parse(text).detail, detail) } catch {}
                throw new Error(detail)
            }

            toast.success("Password changed successfully!")
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } catch (error: any) {
            toast.error(error.message || "Failed to change password")
        } finally {
            setUpdating(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                        />
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Password must be at least 8 characters and include uppercase, lowercase, and a number.
                    </p>

                    <Button type="submit" disabled={updating} className="w-full">
                        {updating ? "Changing..." : "Change Password"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
