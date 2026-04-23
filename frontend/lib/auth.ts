const API_URL = process.env.NEXT_PUBLIC_API_URL

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("refresh_token")
}

export function setTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem("access_token", accessToken)
  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken)
  }
}

export function clearTokens() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  refreshPromise = (async () => {
    try {
      const body = new FormData()
      body.append("refresh_token", refreshToken)

      const res = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        body,
      })

      if (!res.ok) {
        clearTokens()
        return null
      }

      const data = await res.json()
      const newAccess = data?.access_token
      if (!newAccess) {
        clearTokens()
        return null
      }

      localStorage.setItem("access_token", newAccess)
      return newAccess as string
    } catch {
      clearTokens()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function withAuthHeader(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers || {})
  headers.set("Authorization", `Bearer ${token}`)
  return { ...init, headers }
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let token = getAccessToken()

  const firstInit = token ? withAuthHeader(init, token) : init
  let res = await fetch(input, firstInit)

  if (res.status !== 401) return res

  const newToken = await refreshAccessToken()
  if (!newToken) return res

  return fetch(input, withAuthHeader(init, newToken))
}
