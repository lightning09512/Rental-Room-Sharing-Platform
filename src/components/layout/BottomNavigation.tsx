import { NavLink } from "react-router"
import { Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"

export default function BottomNavigation() {
  const { user } = useAuth()
  return (
    <nav className="bottom-nav" aria-label="Điều hướng di động">
      <NavLink to="/">
        <Icon name="home" />
        <span>Trang chủ</span>
      </NavLink>
      <NavLink to="/tim-phong">
        <Icon name="search" />
        <span>Tìm phòng</span>
      </NavLink>
      <NavLink to="/dien-dan">
        <Icon name="users" />
        <span>Diễn đàn</span>
      </NavLink>
      <NavLink to={user ? "/tin-nhan" : "/dang-nhap"}>
        <Icon name="chat" />
        <span>Tin nhắn</span>
      </NavLink>
      <NavLink to={user ? "/tai-khoan/ho-so" : "/dang-nhap"}>
        {user ? (
          <span className="avatar">{user.initials}</span>
        ) : (
          <Icon name="users" />
        )}
        <span>Tôi</span>
      </NavLink>
    </nav>
  )
}
