import { useState } from "react"
import { NavLink, useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"
import { usePlatform } from "@/contexts/PlatformContext"

const roleLabels = {
  renter: "Người thuê",
  landlord: "Chủ trọ",
  admin: "Quản trị viên",
} as const

export default function MainHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { user, logout } = useAuth()
  const { notifications } = usePlatform()
  const unreadNotifications = notifications.filter((item) => item.userId === user?.id && !item.read).length
  const navigate = useNavigate()
  const closeMenu = () => setMenuOpen(false)
  const renterLinks = [
    ["/tim-phong", "Tìm phòng"],
    ["/dien-dan", "Diễn đàn"],
    ["/tin-nhan", "Tin nhắn"],
  ]
  const landlordLinks = [
    ["/tim-phong", "Tìm phòng"],
    ["/chu-tro/dang-tin", "Đăng tin"],
    ["/chu-tro/quan-ly-tin", "Quản lý tin"],
    ["/chu-tro/thong-ke", "Thống kê"],
    ["/dien-dan", "Diễn đàn"],
    ["/tin-nhan", "Tin nhắn"],
  ]
  const guestLinks = [
    ["/tim-phong", "Tìm phòng"],
    ["/dien-dan", "Diễn đàn"],
  ]
  const links =
    user?.role === "landlord"
      ? landlordLinks
      : user?.role === "renter"
        ? renterLinks
        : guestLinks
  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản này?")) return
    logout()
    setAvatarOpen(false)
    navigate("/dang-nhap")
  }

  return (
    <header className="topbar">
      <div className="container nav">
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-controls="main-navigation"
          aria-expanded={menuOpen}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
        <NavLink className="logo" to="/" onClick={closeMenu}>
          Trọ <span>Ơi</span>
        </NavLink>
        <form
          className="nav-search"
          onSubmit={(event) => {
            event.preventDefault()
            const params = new URLSearchParams()
            if (searchQuery.trim()) params.set("location", searchQuery.trim())
            navigate(`/tim-phong?${params.toString()}`)
          }}
        >
          <Icon name="search" size={18} />
          <input
            aria-label="Tìm kiếm"
            placeholder="Tìm phòng, khu vực..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </form>
        <nav id="main-navigation" className={menuOpen ? "nav-links open" : "nav-links"}>
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <button
                className="icon-btn"
                aria-label="Thông báo"
                onClick={() => navigate(user.role === "admin" ? "/admin/thong-bao" : "/thong-bao")}
              >
                <Icon name="bell" />
                {unreadNotifications > 0 && <span className="notification-dot">{unreadNotifications}</span>}
              </button>
              {user.role === "landlord" && (
                <Button
                  variant="orange"
                  icon="plus"
                  onClick={() => navigate("/chu-tro/dang-tin")}
                >
                  Đăng tin
                </Button>
              )}
              <div className="avatar-menu">
                <button
                  className="avatar"
                  onClick={() => setAvatarOpen((open) => !open)}
                  aria-expanded={avatarOpen}
                  aria-label="Mở menu tài khoản"
                >
                  {user.initials}
                </button>
                {avatarOpen && (
                  <div className="avatar-dropdown">
                    <div className="avatar-profile">
                      <span className="avatar">{user.initials}</span>
                      <div>
                        <strong>{user.name}</strong>
                        <small>{roleLabels[user.role]}</small>
                      </div>
                    </div>
                    <button onClick={() => navigate(user.role === "admin" ? "/admin/ho-so" : "/tai-khoan/ho-so")}>
                      Hồ sơ
                    </button>
                    <button onClick={() => navigate(user.role === "admin" ? "/admin/doi-mat-khau" : "/tai-khoan/doi-mat-khau")}>
                      Đổi mật khẩu
                    </button>
                    {user.role !== "admin" && (
                      <button onClick={() => navigate("/yeu-thich")}>
                        <Icon name="heart" size={18} />
                        Tin yêu thích
                      </button>
                    )}
                    {user.role === "landlord" && (
                      <button onClick={() => navigate("/chu-tro/quan-ly-tin")}>
                        <Icon name="building" size={18} />
                        Tin của tôi
                      </button>
                    )}
                    <button className="logout" onClick={handleLogout}>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="guest-actions">
              <Button variant="ghost" onClick={() => navigate("/dang-nhap")}>
                Đăng nhập
              </Button>
              <Button variant="outline" onClick={() => navigate("/dang-ky")}>
                Đăng ký
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
