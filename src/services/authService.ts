import { mockUsers } from "@/mocks/users"
import type { AuthUser, LoginCredentials, RegisterPayload } from "@/types/auth"
import { apiRequest, clearApiSession, isApiMode, storeApiSession } from "@/services/apiClient"

const STORAGE_KEY = "phongtroplus_auth_user"
const ACCOUNTS_KEY = "phongtroplus_accounts"
const RESET_KEY = "phongtroplus_password_reset"
const DEMO_PASSWORD = "PhongTro@123"
type AccountRecord = AuthUser & { password: string; status: "active" | "locked" }
const wait = (duration = 220) => new Promise((resolve) => window.setTimeout(resolve, duration))

const seedAccounts = (): AccountRecord[] => Object.values(mockUsers).map((user) => ({ ...user, password: DEMO_PASSWORD, status: "active" }))
const getAccounts = (): AccountRecord[] => {
  try {
    const saved = window.localStorage.getItem(ACCOUNTS_KEY)
    return saved ? JSON.parse(saved) as AccountRecord[] : seedAccounts()
  } catch {
    return seedAccounts()
  }
}
const saveAccounts = (accounts: AccountRecord[]) => window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
const saveSessionUser = (user: AuthUser) => {
  const target = window.localStorage.getItem(STORAGE_KEY) ? window.localStorage : window.sessionStorage
  target.setItem(STORAGE_KEY, JSON.stringify(user))
}

export const authService = {
  getStoredUser(): AuthUser | null {
    if (isApiMode && !window.localStorage.getItem("trooi_access_token") && !window.sessionStorage.getItem("trooi_access_token")) return null
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try { return JSON.parse(stored) as AuthUser } catch { return null }
  },
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    if (isApiMode) {
      const result = await apiRequest<{ user: AuthUser; token: string }>("auth/login", { method: "POST", body: JSON.stringify(credentials) })
      storeApiSession(result.user, result.token, credentials.remember)
      return result.user
    }
    await wait()
    const identifier = credentials.identifier.trim().toLocaleLowerCase("vi")
    const account = getAccounts().find((item) =>
      (item.email.toLocaleLowerCase("vi") === identifier || item.phone.replace(/\s/g, "") === identifier.replace(/\s/g, "")) &&
      (!credentials.role || item.role === credentials.role),
    )
    if (!account || account.password !== credentials.password) throw new Error("Thông tin đăng nhập chưa chính xác.")
    if (account.status === "locked") throw new Error("Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.")
    const user: AuthUser = { id: account.id, name: account.name, email: account.email, phone: account.phone, role: account.role, initials: account.initials }
    const storage = credentials.remember ? window.localStorage : window.sessionStorage
    window.localStorage.removeItem(STORAGE_KEY)
    window.sessionStorage.removeItem(STORAGE_KEY)
    storage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },
  async register(payload: RegisterPayload): Promise<AuthUser> {
    if (isApiMode) {
      const result = await apiRequest<{ user: AuthUser; token: string }>("auth/register", { method: "POST", body: JSON.stringify(payload) })
      storeApiSession(result.user, result.token, true)
      return result.user
    }
    await wait()
    const accounts = getAccounts()
    const email = payload.email.trim().toLocaleLowerCase("vi")
    const phone = payload.phone.replace(/\s/g, "")
    if (accounts.some((item) => item.email.toLocaleLowerCase("vi") === email || item.phone.replace(/\s/g, "") === phone)) {
      throw new Error("Email hoặc số điện thoại đã được đăng ký.")
    }
    const user: AuthUser = {
      id: `user-${Date.now()}`, name: payload.name.trim(), email, phone: payload.phone.trim(), role: payload.role,
      initials: payload.name.trim().split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase(),
    }
    saveAccounts([...accounts, { ...user, password: payload.password, status: "active" }])
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },
  async requestPasswordReset(identifier: string): Promise<string> {
    if (isApiMode) {
      await apiRequest("auth/password-reset/request", { method: "POST", body: JSON.stringify({ identifier }) })
      return ""
    }
    await wait()
    const account = getAccounts().find((item) => item.email.toLocaleLowerCase("vi") === identifier.trim().toLocaleLowerCase("vi") || item.phone.replace(/\s/g, "") === identifier.trim().replace(/\s/g, ""))
    if (!account) throw new Error("Không tìm thấy tài khoản phù hợp.")
    const token = { userId: account.id, code: "123456", expiresAt: Date.now() + 15 * 60 * 1000 }
    window.sessionStorage.setItem(RESET_KEY, JSON.stringify(token))
    return token.code
  },
  async resetPassword(identifier: string, code: string, password: string): Promise<void> {
    if (isApiMode) {
      await apiRequest("auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ identifier, code, password }) })
      return
    }
    await wait()
    const token = window.sessionStorage.getItem(RESET_KEY)
    const reset = token ? JSON.parse(token) as { userId: string; code: string; expiresAt: number } : null
    if (!reset || reset.code !== code || reset.expiresAt < Date.now()) throw new Error("Mã xác nhận không hợp lệ hoặc đã hết hạn.")
    const accounts = getAccounts()
    const account = accounts.find((item) => item.id === reset.userId && (item.email.toLocaleLowerCase("vi") === identifier.trim().toLocaleLowerCase("vi") || item.phone.replace(/\s/g, "") === identifier.trim().replace(/\s/g, "")))
    if (!account) throw new Error("Không tìm thấy tài khoản.")
    saveAccounts(accounts.map((item) => item.id === account.id ? { ...item, password } : item))
    window.sessionStorage.removeItem(RESET_KEY)
  },
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (isApiMode) {
      await apiRequest("auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) })
      return
    }
    await wait()
    const accounts = getAccounts()
    const account = accounts.find((item) => item.id === userId)
    if (!account || account.password !== currentPassword) throw new Error("Mật khẩu hiện tại chưa chính xác.")
    saveAccounts(accounts.map((item) => item.id === userId ? { ...item, password: newPassword } : item))
  },
  async updateProfile(user: AuthUser): Promise<void> {
    if (isApiMode) {
      const result = await apiRequest<{ user: AuthUser }>("auth/me", { method: "PATCH", body: JSON.stringify({ name: user.name, email: user.email, phone: user.phone }) })
      const target = window.localStorage.getItem(STORAGE_KEY) ? window.localStorage : window.sessionStorage
      target.setItem(STORAGE_KEY, JSON.stringify(result.user))
      return
    }
    const accounts = getAccounts()
    saveAccounts(accounts.map((item) => item.id === user.id ? { ...item, ...user } : item))
    saveSessionUser(user)
  },
  saveManagedAccount(user: AuthUser & { status: "active" | "locked" }): void {
    const accounts = getAccounts()
    const existing = accounts.find((item) => item.id === user.id)
    const password = existing?.password ?? DEMO_PASSWORD
    saveAccounts(existing ? accounts.map((item) => item.id === user.id ? { ...item, ...user, password } : item) : [...accounts, { ...user, password }])
  },
  deleteManagedAccount(userId: string): void {
    saveAccounts(getAccounts().filter((item) => item.id !== userId))
  },
  logout(): void {
    window.localStorage.removeItem(STORAGE_KEY)
    window.sessionStorage.removeItem(STORAGE_KEY)
    if (isApiMode) clearApiSession()
  },
  demoPassword: DEMO_PASSWORD,
}
