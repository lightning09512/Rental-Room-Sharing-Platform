import { useMemo } from "react"
import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"

export default function MyReportsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { reports } = usePlatform()
  const mine = useMemo(() => reports.filter((report) => report.reporterId === user?.id), [reports, user?.id])
  return <main className="workspace-page reports-page"><div className="container workspace-container"><div className="page-heading-row"><div><span className="eyebrow">An toàn cộng đồng</span><h1>Báo cáo của tôi</h1><p>Theo dõi kết quả xử lý các nội dung bạn đã gửi báo cáo.</p></div></div>{mine.length ? <div className="report-list">{mine.map((item) => <article className="report-item" key={item.id}><span className={`status-pill status-${item.status === "pending" ? "pending" : item.status === "accepted" ? "active" : "rejected"}`}>{item.status === "pending" ? "Đang xem xét" : item.status === "accepted" ? "Đã xử lý" : "Không vi phạm"}</span><h2>{item.targetTitle}</h2><p>{item.targetType} · {item.reason}</p>{item.description && <small>Bạn đã gửi: {item.description}</small>}{item.adminNote && <div className="report-resolution"><Icon name="check" size={16}/><span>{item.adminNote}</span></div>}<time>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</time></article>)}</div> : <section className="empty-state"><span className="placeholder-icon"><Icon name="shield"/></span><h2>Chưa có báo cáo nào</h2><p>Bạn có thể gửi báo cáo từ tin phòng hoặc bài viết có nội dung cần quản trị viên xem xét. Kết quả sẽ được lưu tại đây.</p><Button variant="outline" onClick={() => navigate("/dien-dan")}>Về diễn đàn</Button></section>}</div></main>
}
