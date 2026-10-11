import type { AuthUser } from "@/types/auth"

export const mockUsers: Record<AuthUser["role"], AuthUser> = {
  renter: {
    id: "user-renter-01",
    name: "Hoàng Trang",
    email: "trang.nguyen@example.com",
    phone: "0901 234 567",
    role: "renter",
    initials: "HT",
  },
  landlord: {
    id: "user-landlord-01",
    name: "Minh Ngọc",
    email: "minhngoc@example.com",
    phone: "0987 654 321",
    role: "landlord",
    initials: "MN",
  },
  admin: {
    id: "user-admin-01",
    name: "Quản trị viên",
    email: "admin@phongtroplus.vn",
    phone: "0909 000 001",
    role: "admin",
    initials: "AD",
  },
}
