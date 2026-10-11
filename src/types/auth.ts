export type UserRole = "renter" | "landlord" | "admin"

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  initials: string
}

export interface LoginCredentials {
  identifier: string
  password: string
  remember: boolean
  role?: UserRole
}

export interface RegisterPayload {
  name: string
  email: string
  phone: string
  password: string
  role: Exclude<UserRole, "admin">
}
