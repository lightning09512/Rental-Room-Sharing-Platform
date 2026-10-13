import { useEffect, useMemo } from "react"
import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notifications, markNotificationsRead } = usePlatform()
  const mine = useMemo(() => notifications.filter((item) => item.userId === user?.id), [notifications, user?.id])
  useEffect(() => { if (user) markNotificationsRead(user.id) }, [user?.id])
  const nextPath = user?.role === "admin" ? "/admin" : user?.role === "landlord" ? "/chu-tro/quan-ly-tin" : "/tin-nhan"
  const nextLabel = user?.role === "admin" ? "Về tổng quan" : user?.role === "landlord" ? "Quản lý tin" : "Mở tin nhắn"
  return <main className="workspace-page notifications-page"><div className="container workspace-container"><div className="page-heading-row"><div><span className="eyebrow">Tài khoản của tôi</span><h1>Thông báo</h1><p>Cập nhật về tin đăng, cuộc trò chuyện và các quyết định kiểm duyệt.</p></div></div>{mine.length ? <div className="notification-list">{mine.map((item) => <article className="notification-item" key={item.id}><span><Icon name="bell"/></span><div><strong>{item.title}</strong><p>{item.detail}</p><small>{new Date(item.createdAt).toLocaleString("vi-VN")}</small></div><span className={`notification-read-label${item.read ? " read" : ""}`}>{item.read ? "Đã đọc" : "Chưa đọc"}</span></article>)}</div> : <section className="empty-state"><span className="placeholder-icon"><Icon name="bell"/></span><h2>Chưa có thông báo mới</h2><p>Khi có cập nhật về tin đăng, cuộc trò chuyện hoặc hoạt động tài khoản, thông báo sẽ xuất hiện tại đây.</p><Button variant="outline" onClick={() => navigate(nextPath)}>{nextLabel}</Button></section>}</div></main>
}
