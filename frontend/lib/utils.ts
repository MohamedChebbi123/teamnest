import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type PydanticErrorItem = {
  type?: string
  loc?: (string | number)[]
  msg?: string
  input?: unknown
  ctx?: Record<string, unknown>
}

export function formatApiError(detail: unknown, fallback = "Something went wrong"): string {
  if (detail == null) return fallback
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object") {
          const e = item as PydanticErrorItem
          const field = Array.isArray(e.loc) ? e.loc.filter((p) => p !== "body").join(".") : ""
          const msg = e.msg ?? ""
          if (field && msg) return `${field}: ${msg}`
          return msg || field
        }
        return ""
      })
      .filter(Boolean)
    return messages.length ? messages.join("; ") : fallback
  }
  if (typeof detail === "object") {
    const e = detail as PydanticErrorItem
    if (typeof e.msg === "string") return e.msg
  }
  return fallback
}
