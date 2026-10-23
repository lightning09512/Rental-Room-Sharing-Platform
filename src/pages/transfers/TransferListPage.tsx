import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform, type TransferListing } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"
import { apiRequest, isApiMode } from "@/services/apiClient"

const statusLabel: Record<TransferListing["status"], string> = {
  pending: "Chờ duyệt", active: "Đang hiển thị", rejected: "Cần chỉnh sửa", closed: "Đã đóng", removed: "Đã gỡ",
}

export default function TransferListPage({ mine = false }: { mine?: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { transfers, closeTransfer, connectionState, connectionError } = usePlatform()
  const [location, setLocation] = useState("")
  const [minRent, setMinRent] = useState("")
  const [maxRent, setMaxRent] = useState("")
  const [maxFee, setMaxFee] = useState("")
  const [minArea, setMinArea] = useState("")
  const [maxArea, setMaxArea] = useState("")
  const [actionError, setActionError] = useState("")
  const [closingId, setClosingId] = useState("")
  const [apiItems, setApiItems] = useState<TransferListing[]>([])
  const [apiTotal, setApiTotal] = useState(0)
  const [apiPage, setApiPage] = useState(1)
  const [apiLoading, setApiLoading] = useState(isApiMode && !mine)
  const [apiError, setApiError] = useState("")

  useEffect(() => {
    if (!isApiMode || mine) return
    let alive = true
    const params = new URLSearchParams({ page: String(apiPage), limit: "24" })
    if (location.trim()) params.set("q", location.trim())
    if (minRent) params.set("minPrice", minRent)
    if (maxRent) params.set("maxPrice", maxRent)
    if (maxFee) params.set("maxFee", maxFee)
    if (minArea) params.set("minArea", minArea)
    if (maxArea) params.set("maxArea", maxArea)
    setApiLoading(true)
    setApiError("")
    void apiRequest<{ items: TransferListing[]; total: number }>(`transfers?${params}`).then((result) => {
      if (!alive) return
      setApiItems(result.items)
      setApiTotal(result.total)
    }).catch((error: unknown) => {
      if (!alive) return
      setApiItems([])
      setApiTotal(0)
      setApiError(error instanceof Error ? error.message : "Không tải được tin chuyển nhượng.")
    }).finally(() => { if (alive) setApiLoading(false) })
    return () => { alive = false }
  }, [mine, apiPage, location, minRent, maxRent, maxFee, minArea, maxArea])

  const source = mine
    ? transfers.filter((item) => item.ownerId === user?.id && item.status !== "removed")
    : isApiMode ? apiItems : transfers.filter((item) => item.status === "active")
  const filtered = useMemo(() => isApiMode && !mine ? source : source.filter((item) => {
    const query = location.trim().toLocaleLowerCase("vi")
    return (!query || `${item.location} ${item.title}`.toLocaleLowerCase("vi").includes(query))
      && (!minRent || item.priceValue >= Number(minRent))
      && (!maxRent || item.priceValue <= Number(maxRent))
      && (!maxFee || item.transferFeeValue === null || item.transferFeeValue <= Number(maxFee))
      && (!minArea || item.areaValue >= Number(minArea))
      && (!maxArea || item.areaValue <= Number(maxArea))
  }), [source, mine, location, minRent, maxRent, maxFee, minArea, maxArea])
  const loading = isApiMode && (mine ? connectionState === "loading" : apiLoading)
  const loadError = mine ? connectionState === "error" ? connectionError : "" : apiError

  const closeListing = async (item: TransferListing) => {
    if (!window.confirm(`Đóng tin “${item.title}”? Tin sẽ không còn xuất hiện trong danh sách công khai.`)) return
    setActionError("")
    setClosingId(item.id)
    try { await closeTransfer(item.id) }
    catch (error) { setActionError(error instanceof Error ? error.message : "Không thể đóng tin. Vui lòng thử lại.") }
    finally { setClosingId("") }
  }

  return <main className="workspace-page min-h-[70vh] px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="page-heading-row flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><span className="eyebrow">{mine ? "Quản lý tin của bạn" : "Cơ hội thuê lại phòng"}</span><h1>{mine ? "Tin chuyển nhượng của tôi" : "Tin chuyển nhượng phòng trọ"}</h1><p>{mine ? "Theo dõi trạng thái duyệt, cập nhật thông tin hoặc đóng tin khi đã tìm được người nhận." : "Tìm phòng đang có hợp đồng thuê và liên hệ trực tiếp với người muốn chuyển nhượng."}</p></div>
        <div className="flex flex-wrap gap-2">
          {mine && <Button variant="outline" onClick={() => navigate("/chuyen-nhuong")}>Xem tin đang đăng</Button>}
          <Button icon="plus" onClick={() => navigate("/chuyen-nhuong/dang-tin")}>Đăng tin chuyển nhượng</Button>
        </div>
      </div>

      {actionError && <p className="form-message error" role="alert">{actionError}</p>}
      {isApiMode && loadError && <div className="empty-state" role="alert"><span className="placeholder-icon"><Icon name="shield"/></span><h2>Không tải được tin chuyển nhượng</h2><p>{loadError}</p><Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button></div>}

      {!mine && <section className="market-filter mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" aria-label="Lọc tin chuyển nhượng">
        <label className="form-field sm:col-span-2 lg:col-span-1"><span>Khu vực</span><input value={location} onChange={(event) => { setLocation(event.target.value); setApiPage(1) }} placeholder="Quận, phường..."/></label>
        <label className="form-field"><span>Giá thuê từ (triệu/tháng)</span><input type="number" min="0" step="0.1" value={minRent} onChange={(event) => { setMinRent(event.target.value); setApiPage(1) }} placeholder="Tùy chọn"/></label>
        <label className="form-field"><span>Đến (triệu/tháng)</span><input type="number" min="0" step="0.1" value={maxRent} onChange={(event) => { setMaxRent(event.target.value); setApiPage(1) }} placeholder="Không giới hạn"/></label>
        <label className="form-field"><span>Phí sang nhượng tối đa (triệu)</span><input type="number" min="0" step="0.1" value={maxFee} onChange={(event) => { setMaxFee(event.target.value); setApiPage(1) }} placeholder="Kể cả thỏa thuận"/></label>
        <label className="form-field"><span>Diện tích từ (m²)</span><input type="number" min="0" step="1" value={minArea} onChange={(event) => { setMinArea(event.target.value); setApiPage(1) }} placeholder="Tùy chọn"/></label>
        <label className="form-field"><span>Đến (m²)</span><input type="number" min="0" step="1" value={maxArea} onChange={(event) => { setMaxArea(event.target.value); setApiPage(1) }} placeholder="Tùy chọn"/></label>
      </section>}

      {mine && <div className="mb-5 flex flex-wrap gap-2 text-sm text-muted"><span>{source.length} tin</span><span>·</span><span>{source.filter((item) => item.status === "pending").length} chờ duyệt</span><span>·</span><span>{source.filter((item) => item.status === "active").length} đang hiển thị</span></div>}
      {loading ? <div className="empty-state" aria-live="polite"><span className="placeholder-icon"><Icon name="search"/></span><h2>Đang tải tin chuyển nhượng</h2><p>Vui lòng đợi trong giây lát.</p></div> : filtered.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <Link to={`/chuyen-nhuong/${item.id}`} className="block aspect-[16/10] overflow-hidden bg-page"><img src={item.image || "/placeholder-room.jpg"} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]" loading="lazy"/></Link>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><span className={`status-pill status-${item.status}`}>{statusLabel[item.status]}</span><span className="text-right text-xs text-muted">{item.type}</span></div>
            <h2 className="line-clamp-2 text-lg font-bold leading-snug text-ink"><Link to={`/chuyen-nhuong/${item.id}`} className="hover:text-brand-dark">{item.title}</Link></h2>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted">{item.location}</p>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-page p-3 text-sm"><span className="text-muted">Giá thuê</span><strong className="text-right text-ink">{item.price}/tháng</strong><span className="text-muted">Phí sang nhượng</span><strong className="text-right text-ink">{item.transferFee}</strong><span className="text-muted">Diện tích</span><strong className="text-right text-ink">{item.area}</strong><span className="text-muted">Hợp đồng đến</span><strong className="text-right text-ink">{new Date(`${item.contractEndDate}T00:00:00`).toLocaleDateString("vi-VN")}</strong></div>
            {mine && item.status === "rejected" && item.moderationNote && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><strong>Lý do:</strong> {item.moderationNote}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3"><span className="text-xs text-muted">Người đăng: {item.ownerName}</span><div className="flex gap-2">
              <Link className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-page" to={`/chuyen-nhuong/${item.id}`}>Chi tiết</Link>
              {mine && item.status !== "closed" && <><Link className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-page" to={`/chuyen-nhuong/${item.id}/chinh-sua`}>Sửa</Link><button className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50" disabled={closingId === item.id} onClick={() => void closeListing(item)}>{closingId === item.id ? "Đang đóng..." : "Đóng tin"}</button></>}
            </div></div>
          </div>
        </article>)}
      </div> : !loading && !loadError ? <div className="empty-state"><span className="placeholder-icon"><Icon name={mine ? "building" : "search"}/></span><h2>{source.length ? "Không có tin phù hợp" : mine ? "Bạn chưa đăng tin chuyển nhượng" : "Chưa có tin chuyển nhượng đang hiển thị"}</h2><p>{source.length ? "Hãy điều chỉnh bộ lọc để xem thêm lựa chọn." : mine ? "Đăng thông tin phòng và hợp đồng để tìm người nhận chuyển nhượng." : "Các tin sẽ xuất hiện tại đây sau khi được quản trị viên duyệt."}</p>{mine && <Button icon="plus" onClick={() => navigate("/chuyen-nhuong/dang-tin")}>Đăng tin đầu tiên</Button>}</div> : null}
      {!mine && isApiMode && !loading && !loadError && apiTotal > 24 && <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted"><Button variant="outline" disabled={apiPage === 1} onClick={() => setApiPage((page) => page - 1)}>Trang trước</Button><span>Trang {apiPage} / {Math.ceil(apiTotal / 24)} · {apiTotal} tin</span><Button variant="outline" disabled={apiPage * 24 >= apiTotal} onClick={() => setApiPage((page) => page + 1)}>Trang sau</Button></div>}
    </div>
  </main>
}
