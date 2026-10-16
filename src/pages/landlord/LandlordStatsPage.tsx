import { useMemo } from "react"
import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"

export default function LandlordStatsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { listings } = usePlatform()
  const mine = useMemo(() => listings.filter((item) => item.ownerId === user?.id), [listings, user?.id])
  const totalViews = mine.reduce((total, item) => total + item.views, 0)
  const totalContacts = mine.reduce((total, item) => total + item.contacts, 0)
  const active = mine.filter((item) => item.status === "active").length
  const maxViews = Math.max(1, ...mine.map((item) => item.views))

  return (
    <main className="workspace-page">
      <div className="container workspace-container">
        <div className="page-heading-row"><div><span className="eyebrow">Không gian chủ trọ</span><h1>Hiệu quả tin đăng</h1><p>Số liệu được tính từ hoạt động của các tin trong tài khoản này.</p></div><Button variant="outline" onClick={() => navigate("/chu-tro/quan-ly-tin")}>Quản lý tin</Button></div>
        <section className="metric-grid">
          {[["Lượt xem", totalViews, "eye"], ["Lượt liên hệ", totalContacts, "chat"], ["Tin đang hiển thị", active, "building"], ["Tổng số tin", mine.length, "chart"]].map(([label, value, icon]) => <article className="metric-card" key={label}><span><Icon name={String(icon)} /></span><div><small>{label}</small><strong>{Number(value).toLocaleString("vi-VN")}</strong></div></article>)}
        </section>
        <section className="editor-card performance-card"><div className="editor-section-title"><span>01</span><div><h2>Lượt xem theo phòng</h2><p>Phòng nào đang thu hút nhiều sự quan tâm.</p></div></div>{mine.length ? <div className="performance-list">{mine.map((item) => <div className="performance-row" key={item.id}><div><strong>{item.title}</strong><small>{item.location} · {item.contacts} lượt liên hệ</small></div><span className="performance-track"><i style={{ width: `${Math.max(4, item.views / maxViews * 100)}%` }} /></span><b>{item.views}</b></div>)}</div> : <p>Bạn chưa có dữ liệu. Đăng tin cho thuê để bắt đầu theo dõi.</p>}</section>
      </div>
    </main>
  )
}
