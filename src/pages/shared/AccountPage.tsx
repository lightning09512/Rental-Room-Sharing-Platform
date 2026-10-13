import { useState, type FormEvent } from "react"
import { Link } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"
import { authService } from "@/services/authService"
import { useFavorites } from "@/contexts/FavoritesContext"
import { usePlatform } from "@/contexts/PlatformContext"

export default function AccountPage({
  passwordMode = false,
}: {
  passwordMode?: boolean
}) {
  const { user, updateUser } = useAuth()
  const { favoriteIds } = useFavorites()
  const { listings } = usePlatform()
  const myListings = listings.filter((item) => item.ownerId === user?.id)
  const currentRental = listings.find((item) => item.status === "rented" && item.currentTenantId === user?.id)
  const [name, setName] = useState(user?.name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle")
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage("")
    if (
      passwordMode
        ? !currentPassword || newPassword.length < 8 || newPassword !== confirm
        : !name.trim() || !phone.trim()
    ) {
      setStatus("error")
      return
    }
    setStatus("loading")
    try {
      if (passwordMode && user) {
        await authService.changePassword(user.id, currentPassword, newPassword)
      } else if (user) {
        const initials = name.trim().split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase()
        await updateUser({ ...user, name: name.trim(), phone: phone.trim(), initials })
      }
      setStatus("success")
    } catch (caught) {
      setStatus("error")
      setErrorMessage(caught instanceof Error ? caught.message : "Không thể lưu thay đổi.")
    }
  }
  const [errorMessage, setErrorMessage] = useState("")
  const shortcuts = user?.role === "renter"
    ? [
        ...(currentRental ? [{ to: `/phong/${currentRental.id}`, title: "Đánh giá phòng đang thuê", detail: currentRental.title, icon: "star" }] : []),
        { to: "/yeu-thich", title: "Tin yêu thích", detail: `${favoriteIds.length} phòng đã lưu`, icon: "heart" },
        { to: "/tin-nhan", title: "Tin nhắn", detail: "Trao đổi với chủ trọ và người thuê", icon: "chat" },
        { to: "/dien-dan", title: "Diễn đàn", detail: "Đọc và chia sẻ kinh nghiệm thuê trọ", icon: "users" },
        { to: "/bao-cao-cua-toi", title: "Báo cáo của tôi", detail: "Theo dõi nội dung đã gửi báo cáo", icon: "shield" },
      ]
    : user?.role === "landlord"
      ? [
          { to: "/chu-tro/quan-ly-tin", title: "Tin cho thuê của tôi", detail: `${myListings.length} tin đã đăng`, icon: "building" },
          { to: "/chu-tro/dang-tin", title: "Đăng tin cho thuê", detail: "Tạo tin mới để tìm người thuê", icon: "plus" },
          { to: "/chu-tro/thong-ke", title: "Hiệu quả tin đăng", detail: "Theo dõi lượt xem và liên hệ", icon: "chart" },
          { to: "/yeu-thich", title: "Tin yêu thích", detail: `${favoriteIds.length} phòng đã lưu`, icon: "heart" },
          { to: "/tin-nhan", title: "Tin nhắn", detail: "Trao đổi với người đang tìm phòng", icon: "chat" },
        ]
      : [
          { to: "/admin", title: "Tổng quan quản trị", detail: "Xem các việc cần xử lý", icon: "chart" },
          { to: "/admin/nguoi-dung", title: "Người dùng", detail: "Quản lý tài khoản và vai trò", icon: "users" },
          { to: "/admin/bao-cao", title: "Báo cáo vi phạm", detail: "Xem và xử lý báo cáo", icon: "shield" },
          { to: "/admin/thong-ke", title: "Thống kê", detail: "Xem và xuất báo cáo hệ thống", icon: "download" },
        ]
  return (
    <main className="page-bg account-page">
      <div className="container account-layout">
        <aside className="account-summary">
          <span className="avatar xlarge">{user?.initials}</span>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <span className="role-badge">
            {user?.role === "admin" ? "Quản trị viên" : user?.role === "landlord" ? "Chủ trọ" : "Người thuê"}
          </span>
        </aside>
        <section className="account-card">
          <div className="account-heading">
            <span>Tài khoản của tôi</span>
            <h1>{passwordMode ? "Đổi mật khẩu" : "Hồ sơ cá nhân"}</h1>
            <p>
              {passwordMode
                ? "Cập nhật mật khẩu định kỳ để bảo vệ tài khoản."
                : "Thông tin này giúp mọi người nhận biết và liên hệ với bạn."}
            </p>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            {!passwordMode ? (
              <>
                <label className="form-field">
                  <span>
                    Họ và tên <b>*</b>
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input value={user?.email ?? ""} disabled />
                  <small>Email đăng nhập hiện chưa thể thay đổi.</small>
                </label>
                <label className="form-field">
                  <span>
                    Số điện thoại <b>*</b>
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="form-field">
                  <span>
                    Mật khẩu hiện tại <b>*</b>
                  </span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>
                    Mật khẩu mới <b>*</b>
                  </span>
                  <div className="password-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((show) => !show)}
                      aria-label="Hiện hoặc ẩn mật khẩu"
                    >
                      <Icon name="eye" size={18} />
                    </button>
                  </div>
                  <small>Tối thiểu 8 ký tự.</small>
                </label>
                <label className="form-field">
                  <span>
                    Xác nhận mật khẩu mới <b>*</b>
                  </span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                  />
                </label>
              </>
            )}
            {status === "error" && (
              <p className="form-message error" role="alert">
                {errorMessage || "Vui lòng kiểm tra lại các trường bắt buộc."}
              </p>
            )}
            {status === "success" && (
              <p className="form-message success" role="status">
                Cập nhật thông tin thành công.
              </p>
            )}
            <Button disabled={status === "loading"}>
              {status === "loading" ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </form>
          {!passwordMode && <section className="account-shortcuts"><span className="eyebrow">Lối tắt theo vai trò</span><div>{shortcuts.map((item) => <Link className="favorites-shortcut" to={item.to} key={item.to}><span className="favorites-shortcut-icon"><Icon name={item.icon}/></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron"/></Link>)}</div></section>}
        </section>
      </div>
    </main>
  )
}
