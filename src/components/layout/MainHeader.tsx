import { useState } from "react"
import { NavLink, useNavigate } from "react-router"
import { Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"
import { usePlatform } from "@/contexts/PlatformContext"

const roleLabels = {
  renter: "Người thuê",
  landlord: "Chủ trọ",
  admin: "Quản trị viên",
} as const

type NavigationLink = [path: string, label: string]

const primaryLinks: NavigationLink[] = [
  ["/tim-phong", "Tìm phòng"],
  ["/dien-dan", "Diễn đàn"],
]

export default function MainHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { user, logout } = useAuth()
  const { notifications } = usePlatform()
  const unreadNotifications = notifications.filter((item) => item.userId === user?.id && !item.read).length
  const navigate = useNavigate()
  const closeMenu = () => setMenuOpen(false)
  const mobileLinks: NavigationLink[] =
    user?.role === "landlord"
      ? [
          ...primaryLinks,
          ["/chu-tro/quan-ly-tin", "Quản lý tin"],
          ["/chu-tro/thong-ke", "Thống kê"],
          ["/tin-nhan", "Tin nhắn"],
        ]
      : user?.role === "renter"
        ? [...primaryLinks, ["/chuyen-nhuong", "Chuyển nhượng"], ["/chuyen-nhuong/cua-toi", "Tin của tôi"], ["/tin-nhan", "Tin nhắn"]]
        : primaryLinks
  const desktopLinks: NavigationLink[] = user?.role === "renter"
    ? [...primaryLinks, ["/chuyen-nhuong", "Chuyển nhượng"]]
    : primaryLinks

  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản này?")) return
    logout()
    setAvatarOpen(false)
    navigate("/dang-nhap")
  }

  const actionClass = "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#dfe7e0] bg-white px-4 text-[14px] font-semibold text-[#344b3a] transition-colors hover:border-[#bfd4c2] hover:bg-[#f4f8f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34794a]"

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-[#e1e8e2] bg-white/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-full w-full max-w-[1480px] items-center gap-2 px-3 sm:gap-3 sm:px-5 xl:gap-4 xl:px-7">
        <button
          className="inline-grid size-10 shrink-0 place-items-center rounded-full border border-[#e1e8e2] bg-white text-[#345441] transition-colors hover:bg-[#f0f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34794a] lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-controls="main-navigation"
          aria-expanded={menuOpen}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>

        <NavLink
          className="shrink-0 rounded-lg text-[24px] font-extrabold tracking-[-1.2px] text-[#26382e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#34794a] sm:text-[26px]"
          to="/"
          onClick={closeMenu}
        >
          Trọ <span className="text-[#34794a]">Ơi</span>
        </NavLink>

        <form
          className="group hidden h-11 w-[min(22vw,270px)] shrink-0 items-center gap-2 rounded-full border border-transparent bg-[#f2f5f2] px-3.5 text-[#718078] transition-colors focus-within:border-[#c9dccd] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#34794a]/10 xl:flex"
          onSubmit={(event) => {
            event.preventDefault()
            const params = new URLSearchParams()
            if (searchQuery.trim()) params.set("location", searchQuery.trim())
            navigate(`/tim-phong?${params.toString()}`)
          }}
        >
          <button
            className="inline-grid size-8 shrink-0 place-items-center rounded-full text-[#63756b] transition-colors hover:bg-[#eaf3eb] hover:text-[#245f3b] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#34794a]"
            type="submit"
            aria-label="Tìm phòng"
          >
            <Icon name="search" size={18} />
          </button>
          <input
            className="header-search-field min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#26382e] outline-none placeholder:text-[#84908a]"
            aria-label="Tìm kiếm"
            placeholder="Tìm phòng, khu vực..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </form>

        <nav
          id="main-navigation"
          className={menuOpen
            ? "absolute left-3 right-3 top-[calc(100%+8px)] z-[60] grid grid-cols-2 gap-1.5 rounded-2xl border border-[#e1e8e2] bg-white p-2 shadow-[0_14px_24px_rgb(29_58_38_/_0.10)] lg:static lg:z-auto lg:ml-auto lg:flex lg:flex-row lg:items-center lg:gap-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
            : "hidden lg:ml-auto lg:flex lg:items-center lg:gap-1"
          }
        >
          {(menuOpen ? mobileLinks : desktopLinks).map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMenu}
              className={({ isActive }) => `relative inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-3 text-[14px] font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#34794a] lg:min-h-11 lg:w-auto lg:rounded-full lg:px-3 ${isActive ? "border-[#d7e6d9] bg-[#edf5ee] text-[#245f3b] lg:border-transparent lg:bg-transparent after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-[#34794a]" : "border-transparent text-[#4d5c52] hover:bg-[#f1f6f2] hover:text-[#245f3b]"}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-3 xl:gap-2.5">
          {user ? (
            <>
              {user.role !== "admin" && (
                <NavLink
                  to="/yeu-thich"
                  className={({ isActive }) => `hidden size-11 shrink-0 place-items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34794a] sm:inline-grid ${isActive ? "border-[#c4dac7] bg-[#edf5ee] text-[#245f3b]" : "border-[#dfe7e0] bg-white text-[#344b3a] hover:border-[#bfd4c2] hover:bg-[#f4f8f4]"}`}
                  aria-label="Tin yêu thích"
                  title="Tin yêu thích"
                >
                  <Icon name="heart" size={19} />
                </NavLink>
              )}

              <button
                className="relative inline-grid size-11 shrink-0 place-items-center rounded-full border border-[#dfe7e0] bg-white text-[#344b3a] transition-colors hover:border-[#bfd4c2] hover:bg-[#f4f8f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34794a]"
                aria-label={unreadNotifications ? `Thông báo, ${unreadNotifications} chưa đọc` : "Thông báo"}
                title={unreadNotifications ? `${unreadNotifications} thông báo chưa đọc` : "Thông báo"}
                onClick={() => navigate(user.role === "admin" ? "/admin/thong-bao" : "/thong-bao")}
              >
                <Icon name="bell" />
                {unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 inline-grid min-h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-[#dc5b50] px-1 text-[9px] font-bold leading-none text-white">{unreadNotifications}</span>}
              </button>

              <NavLink
                to="/tin-nhan"
                className={({ isActive }) => `${actionClass} max-lg:hidden lg:inline-flex ${isActive ? "border-[#bfd4c2] bg-[#edf5ee] text-[#245f3b]" : ""}`}
              >
                <Icon name="chat" size={18} />
                Tin nhắn
              </NavLink>

              {user.role === "landlord" && (
                <>
                  <NavLink
                    to="/chu-tro/quan-ly-tin"
                    className={({ isActive }) => `${actionClass} max-lg:hidden lg:inline-flex ${isActive ? "border-[#bfd4c2] bg-[#edf5ee] text-[#245f3b]" : ""}`}
                  >
                    Quản lý tin
                  </NavLink>
                  <button
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#245f3b] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#1c4e30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34794a] max-sm:size-11 max-sm:px-0"
                    aria-label="Đăng tin"
                    title="Đăng tin"
                    onClick={() => navigate("/chu-tro/dang-tin")}
                  >
                    <Icon name="plus" size={19} />
                    <span className="max-sm:hidden">Đăng tin</span>
                  </button>
                </>
              )}

              <div className="relative">
                <button
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-transparent bg-white py-0 pl-0.5 pr-2 text-[#4a5b50] transition-colors hover:border-[#e3ebe4] hover:bg-[#f7faf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34794a]"
                  onClick={() => setAvatarOpen((open) => !open)}
                  aria-expanded={avatarOpen}
                  aria-haspopup="true"
                  aria-label="Mở menu tài khoản"
                  title="Mở menu tài khoản"
                >
                  <span className="inline-grid size-10 shrink-0 place-items-center rounded-full bg-[#e9f2eb] text-[13px] font-bold text-[#245f3b]">{user.initials}</span>
                  <Icon name="down" size={15} />
                </button>
                {avatarOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[90] w-[min(260px,calc(100vw-32px))] rounded-2xl border border-[#e1e8e2] bg-white p-2 shadow-[0_16px_36px_rgb(29_58_38_/_0.14)]">
                    <div className="mb-1.5 flex items-center gap-3 border-b border-[#e5ece6] px-2 py-2.5">
                      <span className="inline-grid size-10 shrink-0 place-items-center rounded-full bg-[#e9f2eb] text-[13px] font-bold text-[#245f3b]">{user.initials}</span>
                      <div>
                        <strong className="block text-[13px] font-bold text-[#26382e]">{user.name}</strong>
                        <small className="text-xs text-[#718078]">{roleLabels[user.role]}</small>
                      </div>
                    </div>
                    <button className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-[#384b3e] hover:bg-[#edf5ee] hover:text-[#245f3b]" onClick={() => navigate(user.role === "admin" ? "/admin/ho-so" : "/tai-khoan/ho-so")}>
                      Hồ sơ
                    </button>
                    <button className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-[#384b3e] hover:bg-[#edf5ee] hover:text-[#245f3b]" onClick={() => navigate(user.role === "admin" ? "/admin/doi-mat-khau" : "/tai-khoan/doi-mat-khau")}>
                      Đổi mật khẩu
                    </button>
                    {user.role !== "admin" && (
                      <button className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-[#384b3e] hover:bg-[#edf5ee] hover:text-[#245f3b]" onClick={() => navigate("/yeu-thich")}>
                        <Icon name="heart" size={18} />
                        Tin yêu thích
                      </button>
                    )}
                    {user.role === "landlord" && (
                      <button className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-[#384b3e] hover:bg-[#edf5ee] hover:text-[#245f3b]" onClick={() => navigate("/chu-tro/thong-ke")}>
                        <Icon name="chart" size={18} />
                        Thống kê
                      </button>
                    )}
                    {user.role === "renter" && (
                      <button className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-[#384b3e] hover:bg-[#edf5ee] hover:text-[#245f3b]" onClick={() => navigate("/chuyen-nhuong/cua-toi")}>
                        <Icon name="building" size={18} />
                        Tin chuyển nhượng của tôi
                      </button>
                    )}
                    <button className="mt-1.5 flex min-h-10 w-full items-center gap-2.5 rounded-lg border-t border-[#e5ece6] px-2.5 pt-1 text-left text-[13px] font-semibold text-[#a04a45] hover:bg-[#fff5f3]" onClick={handleLogout}>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <button className="inline-flex h-10 items-center justify-center rounded-full px-2.5 text-[13px] font-semibold text-[#315b3d] transition-colors hover:bg-[#f0f6f1] sm:px-3" onClick={() => navigate("/dang-nhap")}>
                Đăng nhập
              </button>
              <button className="inline-flex h-10 items-center justify-center rounded-full border border-[#cdddcf] bg-white px-3 text-[13px] font-semibold text-[#315b3d] transition-colors hover:border-[#9fbea4] hover:bg-[#f6faf6] sm:px-4" onClick={() => navigate("/dang-ky")}>
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
