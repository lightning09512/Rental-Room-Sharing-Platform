import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform } from "@/contexts/PlatformContext"

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { users, listings, posts, reports } = usePlatform()
  const pendingRooms = listings.filter((item) => item.status === "pending")
  const pendingPosts = posts.filter((item) => item.status === "pending")
  const pendingReports = reports.filter((item) => item.status === "pending")
  const metrics = [
    ["users", "Tài khoản", users.length, "Người thuê và chủ trọ", "/admin/nguoi-dung"],
    ["building", "Tin đang cho thuê", listings.filter((item) => item.status === "active").length, `${pendingRooms.length} chờ duyệt`, "/admin/tin-cho-thue"],
    ["chat", "Bài viết diễn đàn", posts.filter((item) => item.status === "active").length, `${pendingPosts.length} chờ duyệt`, "/admin/dien-dan"],
    ["shield", "Báo cáo cần xem", pendingReports.length, `${reports.length} báo cáo tổng cộng`, "/admin/bao-cao"],
  ]
  const tasks = [
    ...pendingRooms.map((item) => ({ type: "Tin cho thuê", title: item.title, detail: `${item.ownerName} · ${item.location}`, link: "/admin/tin-cho-thue" })),
    ...pendingPosts.map((item) => ({ type: "Bài viết diễn đàn", title: item.content, detail: item.name, link: "/admin/dien-dan" })),
    ...pendingReports.map((item) => ({ type: "Báo cáo", title: item.targetTitle, detail: `${item.reason} · ${item.reporter}`, link: "/admin/bao-cao" })),
  ].slice(0, 5)

  return <main className="admin-resource-page"><div className="resource-page-heading"><div><span className="eyebrow">Không gian quản trị</span><h2>Tổng quan hệ thống</h2><p>Những việc cần xử lý và hoạt động trong dữ liệu của bạn.</p></div><Button variant="outline" icon="chart" onClick={() => navigate("/admin/thong-ke")}>Mở thống kê</Button></div>
    <section className="metric-grid admin-metric-grid">{metrics.map(([icon, label, value, hint, link]) => <button className="metric-card" key={String(label)} onClick={() => navigate(String(link))}><span><Icon name={String(icon)}/></span><div><small>{label}</small><strong>{Number(value).toLocaleString("vi-VN")}</strong><p>{hint}</p></div><Icon name="chevron" size={17}/></button>)}</section>
    <div className="admin-report-grid"><section className="resource-panel"><div className="editor-section-title"><span>01</span><div><h3>Cần xử lý</h3><p>Tin, bài viết và báo cáo đang chờ quản trị viên.</p></div></div>{tasks.length ? <div className="task-list">{tasks.map((task, index) => <button className="task-row" key={`${task.type}-${task.title}-${index}`} onClick={() => navigate(task.link)}><span className="task-index">0{index + 1}</span><span><small>{task.type}</small><strong>{task.title}</strong><em>{task.detail}</em></span><Icon name="chevron" size={17}/></button>)}</div> : <div className="rounded-xl border border-line bg-page p-5"><p className="m-0 text-sm leading-relaxed text-muted">Hiện không có tin, bài viết hoặc báo cáo nào chờ xử lý.</p><button type="button" onClick={() => navigate("/admin/tin-cho-thue")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-brand-dark transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Xem tin cho thuê <Icon name="chevron" size={16}/></button></div>}</section>
      <section className="resource-panel admin-activity-card"><div className="editor-section-title"><span>02</span><div><h3>Hoạt động nội dung</h3><p>Quy mô dữ liệu hiện tại.</p></div></div><div className="activity-total"><strong>{posts.filter((item) => item.status === "active").length}</strong><span>bài viết đang hiển thị</span></div><div className="activity-total"><strong>{listings.reduce((sum, item) => sum + item.views, 0).toLocaleString("vi-VN")}</strong><span>lượt xem phòng đã ghi nhận</span></div><Button variant="outline" onClick={() => navigate("/admin/dien-dan")}>Kiểm duyệt bài viết</Button></section></div>
  </main>
}
