import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import useAuth from "@/hooks/useAuth"
import type { UserRole } from "@/types/auth"

export default function RoleGuard({
  roles,
  children,
}: {
  roles: UserRole[]
  children: ReactNode
}) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user)
    return (
      <Navigate
        to={roles.includes("admin") ? "/admin/dang-nhap" : "/dang-nhap"}
        state={{ from: location.pathname }}
        replace
      />
    )
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />
  return children
}
