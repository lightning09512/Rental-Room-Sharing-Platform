export const isApiMode = import.meta.env.VITE_DATA_MODE === "api"
const TOKEN_KEY = "trooi_access_token"
const AUTH_KEY = "phongtroplus_auth_user"

function tokenStore() {
  return localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function storeApiSession(user: unknown, token: string, remember = true) {
  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  other.removeItem(TOKEN_KEY)
  other.removeItem(AUTH_KEY)
  target.setItem(TOKEN_KEY, token)
  target.setItem(AUTH_KEY, JSON.stringify(user))
}

export function clearApiSession() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AUTH_KEY)
  sessionStorage.removeItem(AUTH_KEY)
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json")
  const token = getAccessToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(path.startsWith("/") ? path : `/api/${path}`, { ...init, headers, credentials: "include" })
  } catch {
    const error = new Error("Không kết nối được máy chủ. Kiểm tra API và thử lại.")
    window.dispatchEvent(new CustomEvent("trooi:api-error", { detail: error.message }))
    throw error
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    if (response.status === 401) clearApiSession()
    const message = payload.error ?? `Yêu cầu thất bại (${response.status}).`
    window.dispatchEvent(new CustomEvent("trooi:api-error", { detail: message }))
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) return response.json() as Promise<T>
  return response.blob() as Promise<T>
}

export function savedSessionStore() {
  return tokenStore()
}
