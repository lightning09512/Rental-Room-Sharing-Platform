import { NavLink, Outlet, useNavigate } from "react-router"
import { Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"
import { usePlatform } from "@/contexts/PlatformContext"

const items = [
  ["/admin", "chart", "Tổng quan"],
  ["/admin/nguoi-dung", "users", "Người dùng"],
  ["/admin/tin-cho-thue", "building", "Tin cho thuê"],
  ["/admin/tin-chuyen-nhuong", "building", "Tin chuyển nhượng"],
  ["/admin/dien-dan", "chat", "Diễn đàn"],
  ["/admin/danh-muc", "filter", "Danh mục"],
  ["/admin/bao-cao", "shield", "Báo cáo"],
  ["/admin/thong-ke", "chart", "Thống kê & báo cáo"],
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { reports, transfers } = usePlatform()
  const navigate = useNavigate()
  const pendingReports = reports.filter((item) => item.status === "pending").length
  const pendingTransfers = transfers.filter((item) => item.status === "pending").length
  return (
    <main className="admin-layout admin-shell">
      <aside className="admin-side">
        <NavLink className="admin-logo" to="/admin">
          <span className="admin-monogram">TƠ</span><b>Trọ Ơi</b>
        </NavLink>
        <small>QUẢN TRỊ HỆ THỐNG</small>
        {items.map(([to, icon, label]) => (
          <NavLink
            end={to === "/admin"}
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon name={icon} />
            <span>{label}</span>
            {label === "Báo cáo" && pendingReports > 0 && <b>{pendingReports}</b>}
            {label === "Tin chuyển nhượng" && pendingTransfers > 0 && <b>{pendingTransfers}</b>}
          </NavLink>
        ))}
      </aside>
      <section className="admin-main">
        <header>
          <div>
            <h1>Quản trị hệ thống</h1>
            <p>Quản lý dữ liệu và hoạt động trên Trọ Ơi</p>
          </div>
          <button className="icon-btn" aria-label="Thông báo" onClick={() => navigate("/admin/thong-bao")}>
            <Icon name="bell" />
          </button>
          <NavLink to="/admin/ho-so" className="avatar" aria-label="Hồ sơ quản trị viên">
            {user?.initials ?? "AD"}
          </NavLink>
          <button
            className="admin-logout"
            onClick={() => {
              if (!window.confirm("Bạn có chắc muốn đăng xuất khỏi trang quản trị?")) return
              logout()
              navigate("/admin/dang-nhap")
            }}
          >
            Đăng xuất
          </button>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </section>
    </main>
  )
}
