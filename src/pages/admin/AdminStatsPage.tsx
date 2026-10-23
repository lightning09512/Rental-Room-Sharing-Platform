import { useEffect, useMemo, useState } from "react"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform } from "@/contexts/PlatformContext"
import { apiRequest, isApiMode } from "@/services/apiClient"

type ApiStats = {
  users: { role: string; count: number }[]
  listings: { count: number; views: number; contacts: number }
  listingStatuses: { status: string; count: number }[]
  transfers: { count: number }
  transferStatuses: { status: string; count: number }[]
  community: { posts: number; comments: number; likes: number }
  pendingReports: number
  interactions: { favorites: number; reviews: number }
}

export default function AdminStatsPage() {
  const { users, listings, transfers, posts, reports } = usePlatform()
  const [period, setPeriod] = useState("30")
  const [apiStats, setApiStats] = useState<ApiStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(isApiMode)
  const [statsError, setStatsError] = useState("")
  useEffect(() => {
    if (!isApiMode) return
    let alive = true
    setStatsLoading(true)
    setStatsError("")
    setApiStats(null)
    void apiRequest<{ stats: ApiStats }>(`admin/stats?days=${period}`).then((result) => {
      if (alive) setApiStats(result.stats)
    }).catch((error: unknown) => {
      if (alive) setStatsError(error instanceof Error ? error.message : "Không tải được thống kê.")
    }).finally(() => { if (alive) setStatsLoading(false) })
    return () => { alive = false }
  }, [period])
  const cutoff = Date.now() - Number(period) * 24 * 60 * 60 * 1000
  const withinPeriod = <T extends { createdAt: string }>(items: T[]) => items.filter((item) => new Date(item.createdAt).getTime() >= cutoff)
  const periodUsers = withinPeriod(users)
  const periodListings = withinPeriod(listings)
  const periodTransfers = withinPeriod(transfers)
  const periodPosts = withinPeriod(posts)
  const periodReports = withinPeriod(reports)
  const activeRooms = periodListings.filter((item) => item.status === "active").length
  const pendingReports = periodReports.filter((item) => item.status === "pending").length
  const totalViews = periodListings.reduce((sum, item) => sum + item.views, 0)
  const totalContacts = periodListings.reduce((sum, item) => sum + item.contacts, 0)
  const activeTransfers = periodTransfers.filter((item) => item.status === "active").length
  const apiStatusCount = (statuses: { status: string; count: number }[] | undefined, status: string) => statuses?.find((item) => item.status === status)?.count ?? 0
  const displayViews = isApiMode ? apiStats?.listings.views ?? 0 : totalViews
  const displayContacts = isApiMode ? apiStats?.listings.contacts ?? 0 : totalContacts
  const displayLikes = isApiMode ? apiStats?.community.likes ?? 0 : periodPosts.reduce((sum, item) => sum + item.likes, 0)
  const metrics = [
    { name: "Tài khoản mới", value: isApiMode ? apiStats?.users.reduce((sum, item) => sum + item.count, 0) ?? 0 : periodUsers.length, hint: `${isApiMode ? apiStats?.users.find((item) => item.role === "renter")?.count ?? 0 : periodUsers.filter((item) => item.role === "renter").length} người thuê · ${isApiMode ? apiStats?.users.find((item) => item.role === "landlord")?.count ?? 0 : periodUsers.filter((item) => item.role === "landlord").length} chủ trọ`, icon: "users" },
    { name: "Tin cho thuê", value: isApiMode ? apiStatusCount(apiStats?.listingStatuses, "active") : activeRooms, hint: `${isApiMode ? apiStatusCount(apiStats?.listingStatuses, "pending") : periodListings.filter((item) => item.status === "pending").length} tin chờ duyệt`, icon: "building" },
    { name: "Tin chuyển nhượng", value: isApiMode ? apiStatusCount(apiStats?.transferStatuses, "active") : activeTransfers, hint: `${isApiMode ? apiStatusCount(apiStats?.transferStatuses, "pending") : periodTransfers.filter((item) => item.status === "pending").length} chờ duyệt · ${isApiMode ? apiStats?.transfers.count ?? 0 : periodTransfers.length} tổng trong kỳ`, icon: "building" },
    { name: "Bài viết diễn đàn", value: isApiMode ? apiStats?.community.posts ?? 0 : periodPosts.filter((item) => item.status === "active").length, hint: isApiMode ? `${apiStats?.community.comments ?? 0} bình luận` : `${periodPosts.filter((item) => item.status === "pending").length} bài chờ duyệt`, icon: "chat" },
    { name: "Báo cáo cần xử lý", value: isApiMode ? apiStats?.pendingReports ?? 0 : pendingReports, hint: isApiMode ? "Báo cáo mới trong kỳ" : `${periodReports.length} báo cáo trong kỳ`, icon: "shield" },
  ]
  const topRooms = useMemo(() => [...periodListings].sort((a, b) => b.views - a.views).slice(0, 5), [periodListings])
  const exportExcel = () => {
    if (isApiMode) {
      void apiRequest<Blob>(`admin/stats/export?format=xlsx&days=${period}`).then((blob) => {
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = "tro-oi-thong-ke.xlsx"
        link.click()
        URL.revokeObjectURL(link.href)
      }).catch((error: unknown) => setStatsError(error instanceof Error ? error.message : "Không xuất được Excel."))
      return
    }
    const rows = [
      ["Nhóm", "Chỉ số", "Giá trị"],
      ["Người dùng", "Tài khoản mới", String(periodUsers.length)],
      ["Người dùng", "Người thuê", String(periodUsers.filter((item) => item.role === "renter").length)],
      ["Người dùng", "Chủ trọ", String(periodUsers.filter((item) => item.role === "landlord").length)],
      ["Tin cho thuê", "Đang hiển thị", String(activeRooms)],
      ["Tin cho thuê", "Chờ duyệt", String(periodListings.filter((item) => item.status === "pending").length)],
      ["Tin chuyển nhượng", "Đang hiển thị", String(activeTransfers)],
      ["Tin chuyển nhượng", "Chờ duyệt", String(periodTransfers.filter((item) => item.status === "pending").length)],
      ["Diễn đàn", "Bài viết đang hiển thị", String(periodPosts.filter((item) => item.status === "active").length)],
      ["Diễn đàn", "Lượt thích", String(periodPosts.reduce((sum, item) => sum + item.likes, 0))],
      ["Diễn đàn", "Bình luận", String(periodPosts.reduce((sum, item) => sum + item.commentsCount, 0))],
      ["Tương tác", "Lượt xem phòng", String(totalViews)],
      ["Tương tác", "Lượt liên hệ", String(totalContacts)],
      ["Báo cáo", "Chờ xử lý", String(pendingReports)],
    ]
    const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const sheetRows = rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`).join("")
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Thong ke"><Table>${sheetRows}</Table></Worksheet></Workbook>`
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob(["\uFEFF", workbook], { type: "application/vnd.ms-excel;charset=utf-8" }))
    link.download = "bao-cao-tro-oi.xls"
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const exportPdf = () => {
    if (!isApiMode) { window.print(); return }
    void apiRequest<Blob>(`admin/stats/export?format=pdf&days=${period}`).then((blob) => {
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = "tro-oi-thong-ke.pdf"
      link.click()
      URL.revokeObjectURL(link.href)
    }).catch((error: unknown) => setStatsError(error instanceof Error ? error.message : "Không xuất được PDF."))
  }

  return <main className="admin-resource-page"><div className="resource-page-heading"><div><span className="eyebrow">Báo cáo hệ thống</span><h2>Thống kê & hiệu quả</h2><p>Chọn khoảng thời gian để xem quy mô tin đăng và hoạt động cộng đồng.</p></div><div className="stats-export"><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Khoảng thời gian"><option value="7">7 ngày qua</option><option value="30">30 ngày qua</option><option value="90">90 ngày qua</option><option value="365">12 tháng qua</option></select><Button variant="outline" icon="download" onClick={exportExcel}>Xuất Excel</Button><Button variant="outline" onClick={exportPdf}>Lưu PDF</Button></div></div>
    {isApiMode && statsLoading && <p className="text-sm text-muted" aria-live="polite">Đang tải thống kê từ máy chủ…</p>}
    {isApiMode && statsError && <p className="form-message error" role="alert">{statsError}</p>}
    <section className="metric-grid admin-metric-grid">{metrics.map((item) => <article className="metric-card" key={item.name}><span><Icon name={item.icon}/></span><div><small>{item.name}</small><strong>{item.value.toLocaleString("vi-VN")}</strong><p>{item.hint}</p></div></article>)}</section>
    <div className="admin-report-grid"><section className="resource-panel analytics-panel"><div className="editor-section-title"><span>01</span><div><h3>Hoạt động tin đăng</h3><p>{isApiMode ? "Lượt xem được ghi nhận từ API." : "Lượt xem được ghi nhận trong trình duyệt này."}</p></div></div><div className="analytic-bars">{topRooms.map((item) => <div className="analytic-bar-row" key={item.id}><span>{item.title}</span><div><i style={{ width: `${Math.max(5, item.views / Math.max(1, ...topRooms.map((room) => room.views)) * 100)}%` }}/></div><b>{item.views}</b></div>)}</div></section><section className="resource-panel engagement-panel"><div className="editor-section-title"><span>02</span><div><h3>Tương tác cộng đồng</h3><p>{isApiMode ? "Hoạt động được lưu trên máy chủ." : "Hoạt động ghi nhận trong trình duyệt này."}</p></div></div><div className="engagement-stats"><div><strong>{displayViews.toLocaleString("vi-VN")}</strong><span>Lượt xem tin</span></div><div><strong>{displayContacts.toLocaleString("vi-VN")}</strong><span>Lượt liên hệ</span></div><div><strong>{displayLikes.toLocaleString("vi-VN")}</strong><span>Lượt thích bài viết</span></div></div></section></div>
    <p className="demo-note">Khoảng thời gian: {period === "365" ? "12 tháng" : `${period} ngày`} gần nhất. {isApiMode ? "Số liệu được tải từ dịch vụ Trọ Ơi." : "Dữ liệu được lưu trong trình duyệt này."}</p>
  </main>
}
