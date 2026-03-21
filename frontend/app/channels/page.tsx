"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function ChannelsPageRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    const target = query ? `/direct-messages?${query}` : "/direct-messages"
    router.replace(target)
  }, [router, searchParams])

  return null
}
