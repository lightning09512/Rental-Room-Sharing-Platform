import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform, type TransferListing } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"
import { isApiMode } from "@/services/apiClient"

export default function TransferDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { transfers, loadTransfer, startConversation, sendMessage, connectionState } = usePlatform()
  const [item, setItem] = useState<TransferListing | undefined>(() => transfers.find((value) => value.id === id))
  const [loading, setLoading] = useState(!item)
  const [contactText, setContactText] = useState("")
  const [contactError, setContactError] = useState("")
  const [sending, setSending] = useState(false)
  const own = item?.ownerId === user?.id

  useEffect(() => {
    const cached = transfers.find((value) => value.id === id)
    if (cached) {
      setItem(cached)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    void loadTransfer(id).then((loaded) => {
      if (alive) setItem(loaded)
    }).catch((error: unknown) => {
      if (alive) setContactError(error instanceof Error ? error.message : "Không tải được tin chuyển nhượng.")
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id, transfers, loadTransfer])

  const sendContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!item || !user || item.status !== "active" || own) return
    const text = contactText.trim()
    if (text.length < 2 || text.length > 4000) {
      setContactError("Nội dung liên hệ cần từ 2 đến 4.000 ký tự.")
      return
    }
    setSending(true)
    setContactError("")
    try {
      const conversationId = await startConversation({ accountId: user.id, name: item.ownerName, avatar: item.ownerName.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase(), userId: item.ownerId, roomId: "", transferId: item.id })
      if (!conversationId) throw new Error("Không thể mở cuộc trò chuyện với người đăng tin.")
      await sendMessage(conversationId, user.id, text)
      navigate(`/tin-nhan?conversation=${encodeURIComponent(conversationId)}`)
    } catch (error) {
      setContactError(error instanceof Error ? error.message : "Không gửi được nội dung liên hệ. Vui lòng thử lại.")
    } finally { setSending(false) }
  }

  const notPublic = item && item.status !== "active" && !own
  if (loading || (isApiMode && connectionState === "loading" && !item)) return <main className="workspace-page min-h-[60vh] px-4 py-10"><div className="empty-state"><span className="placeholder-icon"><Icon name="search"/></span><h2>Đang tải tin chuyển nhượng</h2><p>Vui lòng đợi trong giây lát.</p></div></main>
  if (!item || notPublic) return <main className="workspace-page min-h-[60vh] px-4 py-10"><div className="empty-state"><span className="placeholder-icon"><Icon name="building"/></span><h1>Không tìm thấy tin chuyển nhượng</h1><p>{contactError || "Tin có thể đã đóng, bị gỡ hoặc chưa được duyệt."}</p><Button onClick={() => navigate("/chuyen-nhuong")}>Xem tin đang hiển thị</Button></div></main>

  return <main className="workspace-page min-h-[70vh] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="aspect-[16/9] bg-page"><img src={item.image} alt={item.title} className="h-full w-full object-cover"/></div>
      <div className="space-y-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2"><span className={`status-pill status-${item.status}`}>{item.status === "active" ? "Đang hiển thị" : item.status === "pending" ? "Chờ duyệt" : item.status === "rejected" ? "Cần chỉnh sửa" : "Đã đóng"}</span><span className="rounded-full bg-page px-3 py-1 text-xs text-muted">{item.type}</span></div>
        <div><h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{item.title}</h1><p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted"><Icon name="pin" size={18}/>{item.location}</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-page p-4"><span className="text-sm text-muted">Giá thuê hàng tháng</span><strong className="mt-1 block text-xl text-ink">{item.price}/tháng</strong></div><div className="rounded-lg bg-page p-4"><span className="text-sm text-muted">Phí chuyển nhượng</span><strong className="mt-1 block text-xl text-ink">{item.transferFee}</strong></div><div className="rounded-lg bg-page p-4"><span className="text-sm text-muted">Diện tích</span><strong className="mt-1 block text-lg text-ink">{item.area}</strong></div><div className="rounded-lg bg-page p-4"><span className="text-sm text-muted">Tiền cọc</span><strong className="mt-1 block text-lg text-ink">{item.deposit || "Thỏa thuận"}</strong></div><div className="rounded-lg bg-page p-4"><span className="text-sm text-muted">Hợp đồng hiện tại đến</span><strong className="mt-1 block text-lg text-ink">{new Date(`${item.contractEndDate}T00:00:00`).toLocaleDateString("vi-VN")}</strong></div><div className="rounded-lg bg-page p-4"><span className="text-sm text-muted">Có thể nhận phòng</span><strong className="mt-1 block text-lg text-ink">{item.availableFrom ? new Date(`${item.availableFrom}T00:00:00`).toLocaleDateString("vi-VN") : "Thỏa thuận"}</strong></div></div>
        <section><h2 className="mb-2 text-lg font-bold text-ink">Mô tả và điều kiện</h2><p className="whitespace-pre-line text-sm leading-7 text-muted">{item.description}</p></section>
        {item.amenities.length > 0 && <section><h2 className="mb-2 text-lg font-bold text-ink">Tiện ích</h2><div className="flex flex-wrap gap-2">{item.amenities.map((amenity) => <span key={amenity} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink">{amenity}</span>)}</div></section>}
        {own && item.moderationNote && item.status === "rejected" && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"><strong>Lý do cần chỉnh sửa:</strong> {item.moderationNote}</p>}
        <div className="border-t border-line pt-4 text-sm text-muted">Người đăng: <Link className="font-semibold text-brand-dark hover:underline" to={`/nguoi-dung/${item.ownerId}`}>{item.ownerName}</Link></div>
      </div>
    </article>

    <aside className="h-fit rounded-xl border border-line bg-white p-5 sm:p-6 lg:sticky lg:top-24">
      {own ? <><span className="eyebrow">Quản lý tin</span><h2 className="mt-2 text-xl font-bold text-ink">Tin của bạn</h2><p className="mt-2 text-sm leading-relaxed text-muted">{item.status === "pending" ? "Tin đang chờ quản trị viên duyệt." : item.status === "active" ? "Tin đang được hiển thị công khai." : "Tin hiện không được hiển thị công khai."}</p>{item.status !== "closed" && item.status !== "removed" && <Link className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark" to={`/chuyen-nhuong/${item.id}/chinh-sua`}>Sửa tin chuyển nhượng</Link>}<Link className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-page" to="/chuyen-nhuong/cua-toi">Quản lý tin của tôi</Link></> : item.status === "active" ? <><span className="eyebrow">Liên hệ người đăng</span><h2 className="mt-2 text-xl font-bold text-ink">Quan tâm phòng này?</h2><p className="mt-2 text-sm leading-relaxed text-muted">Gửi câu hỏi trực tiếp cho {item.ownerName}. Cuộc trò chuyện sẽ được gắn với tin này.</p><form className="mt-5 grid gap-3" onSubmit={sendContact}><label className="form-field"><span>Nội dung liên hệ</span><textarea value={contactText} onChange={(event) => setContactText(event.target.value)} rows={5} minLength={2} maxLength={4000} required placeholder="Chào bạn, mình muốn hỏi thêm về phòng và điều kiện nhận chuyển nhượng..."/></label>{contactError && <p className="form-message error" role="alert">{contactError}</p>}<Button disabled={sending || !contactText.trim()} icon="send">{sending ? "Đang gửi..." : "Gửi tin nhắn"}</Button></form></> : <><h2 className="text-xl font-bold text-ink">Tin chưa được duyệt</h2><p className="mt-2 text-sm text-muted">Chỉ tin đang hiển thị mới nhận được liên hệ.</p></>}
      <Link className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-dark hover:underline" to="/chuyen-nhuong"><Icon name="chevron" size={16}/>Quay lại danh sách</Link>
    </aside>
  </div></main>
}
