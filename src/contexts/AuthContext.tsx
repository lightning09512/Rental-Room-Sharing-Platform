import {
  createContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { authService } from "@/services/authService"
import type { AuthUser, LoginCredentials, RegisterPayload } from "@/types/auth"
import { apiRequest, isApiMode } from "@/services/apiClient"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  logout: () => void
  updateUser: (user: AuthUser) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    authService.getStoredUser(),
  )
  useEffect(() => {
    if (!isApiMode || !authService.getStoredUser()) return
    let alive = true
    apiRequest<{ user: AuthUser }>("auth/me")
      .then((result) => { if (alive) setUser(result.user) })
      .catch(() => { if (alive) setUser(null) })
    return () => { alive = false }
  }, [])
  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextUser = await authService.login(credentials)
    setUser(nextUser)
    return nextUser
  }, [])
  const register = useCallback(async (payload: RegisterPayload) => {
    const nextUser = await authService.register(payload)
    setUser(nextUser)
    return nextUser
  }, [])
  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      updateUser: async (nextUser: AuthUser) => {
        await authService.updateProfile(nextUser)
        setUser(nextUser)
      },
    }),
    [user, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
