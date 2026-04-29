const API_URL = process.env.NEXT_PUBLIC_API_URL

let accessToken: string | null = null
let hydratePromise: Promise<string | null> | null = null
let refreshPromise: Promise<string | null> | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        credentials: "include",
      })

      if (!res.ok) {
        clearAccessToken()
        return null
      }

      const data = await res.json()
      const newAccess = data?.access_token
      if (!newAccess) {
        clearAccessToken()
        return null
      }

      accessToken = newAccess
      return newAccess as string
    } catch {
      clearAccessToken()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function hydrateAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken
  if (hydratePromise) return hydratePromise
  hydratePromise = refreshAccessToken().finally(() => {
    hydratePromise = null
  })
  return hydratePromise
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    })
  } catch {
    // ignore network errors; client state is cleared regardless
  } finally {
    clearAccessToken()
  }
}

function withAuthHeader(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers || {})
  headers.set("Authorization", `Bearer ${token}`)
  return { ...init, headers }
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let token = accessToken ?? (await hydrateAccessToken())

  const baseInit: RequestInit = { ...(init || {}), credentials: "include" }
  const firstInit = token ? withAuthHeader(baseInit, token) : baseInit
  let res = await fetch(input, firstInit)

  if (res.status !== 401) return res

  const newToken = await refreshAccessToken()
  if (!newToken) return res

  return fetch(input, withAuthHeader(baseInit, newToken))
}
