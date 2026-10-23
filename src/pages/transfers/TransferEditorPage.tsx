import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform, type TransferInput, type TransferListing } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"
import { isApiMode } from "@/services/apiClient"

const blankForm: TransferInput = {
  title: "", description: "", location: "", priceValue: 0, transferFeeValue: null, deposit: "",
  areaValue: 0, type: "Phòng trọ", contractEndDate: "", availableFrom: "", amenities: [], image: "", gallery: [],
}

function toInput(item: TransferListing): TransferInput {
  return {
    title: item.title, description: item.description, location: item.location,
    priceValue: item.priceValue, transferFeeValue: item.transferFeeValue, deposit: item.deposit,
    areaValue: item.areaValue, type: item.type, contractEndDate: item.contractEndDate,
    availableFrom: item.availableFrom, amenities: item.amenities ?? [], image: item.image,
    gallery: item.gallery ?? [],
  }
}

export default function TransferEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { transfers, saveTransfer, loadTransfer, connectionState } = usePlatform()
  const [form, setForm] = useState<TransferInput>(blankForm)
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const existing = id ? transfers.find((item) => item.id === id) : undefined

  useEffect(() => {
    if (!id) return
    let alive = true
    const load = async () => {
      const cached = transfers.find((item) => item.id === id)
      if (cached) {
        if (cached.ownerId !== user?.id) setError("Bạn không có quyền sửa tin chuyển nhượng này.")
        else setForm(toInput(cached))
        setLoading(false)
        return
      }
      try {
        const item = await loadTransfer(id)
        if (!alive) return
        if (!item || item.ownerId !== user?.id) setError("Không tìm thấy tin hoặc bạn không có quyền sửa tin này.")
        else setForm(toInput(item))
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "Không tải được tin chuyển nhượng.")
      } finally { if (alive) setLoading(false) }
    }
    void load()
    return () => { alive = false }
  }, [id, user?.id, transfers, loadTransfer])

  const update = <K extends keyof TransferInput>(key: K, value: TransferInput[K]) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (id && (!existing || existing.ownerId !== user?.id)) {
      setError("Bạn không có quyền sửa tin chuyển nhượng này.")
      return
    }
    if (form.priceValue <= 0 || form.areaValue <= 0) {
      setError("Giá thuê và diện tích phải lớn hơn 0.")
      return
    }
    if (form.priceValue > 1000 || form.areaValue > 10000 || (form.transferFeeValue !== null && (form.transferFeeValue < 0 || form.transferFeeValue > 10000))) {
      setError("Giá thuê, phí sang nhượng hoặc diện tích vượt giới hạn cho phép.")
      return
    }
    if (form.contractEndDate < today) {
      setError("Ngày kết thúc hợp đồng phải là hôm nay hoặc trong tương lai.")
      return
    }
    const input: TransferInput = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      type: form.type.trim(),
      deposit: form.deposit.trim() || "Thỏa thuận",
      amenities: form.amenities.map((item) => item.trim()).filter(Boolean).slice(0, 30),
      image: form.image.trim(),
      gallery: form.image.trim() ? [form.image.trim()] : [],
    }
    if (input.title.length < 8 || input.description.length < 20 || input.location.length < 2 || input.type.length < 2) {
      setError("Vui lòng nhập tiêu đề từ 8 ký tự, mô tả từ 20 ký tự và khu vực/loại phòng hợp lệ.")
      return
    }
    setSaving(true)
    try {
      await saveTransfer(input, id)
      navigate("/chuyen-nhuong/cua-toi")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu tin. Kiểm tra lại thông tin rồi thử lại.")
    } finally { setSaving(false) }
  }

  if (loading || (isApiMode && connectionState === "loading")) return <main className="workspace-page min-h-[60vh] px-4 py-10"><div className="empty-state"><span className="placeholder-icon"><Icon name="search"/></span><h2>Đang tải thông tin tin đăng</h2><p>Vui lòng đợi trong giây lát.</p></div></main>

  return <main className="workspace-page min-h-[70vh] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl">
    <div className="page-heading-row mb-6"><span className="eyebrow">{id ? "Cập nhật tin" : "Tìm người nhận chuyển nhượng"}</span><h1>{id ? "Sửa tin chuyển nhượng" : "Đăng tin chuyển nhượng"}</h1><p>Thông tin sẽ được gửi quản trị viên duyệt trước khi hiển thị công khai. Khi sửa tin đã đăng, tin sẽ trở lại trạng thái chờ duyệt.</p></div>
    {existing?.status === "rejected" && existing.moderationNote && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Lý do cần chỉnh sửa:</strong> {existing.moderationNote}</p>}
    {error && <p className="form-message error" role="alert">{error}</p>}
    <form className="editor-card grid gap-5" onSubmit={submit}>
      <section className="grid gap-4 sm:grid-cols-2">
        <label className="form-field sm:col-span-2"><span>Tiêu đề tin</span><input value={form.title} onChange={(event) => update("title", event.target.value)} minLength={8} maxLength={180} required placeholder="Ví dụ: Sang lại phòng gần Đại học..."/></label>
        <label className="form-field sm:col-span-2"><span>Địa chỉ / khu vực</span><input value={form.location} onChange={(event) => update("location", event.target.value)} minLength={2} maxLength={300} required placeholder="Phường, quận, thành phố"/></label>
        <label className="form-field"><span>Giá thuê (triệu đồng/tháng)</span><input type="number" min="0.1" max="1000" step="0.1" value={form.priceValue || ""} onChange={(event) => update("priceValue", Number(event.target.value))} required/></label>
        <label className="form-field"><span>Phí sang nhượng (triệu đồng)</span><input type="number" min="0" max="10000" step="0.1" value={form.transferFeeValue ?? ""} onChange={(event) => update("transferFeeValue", event.target.value === "" ? null : Number(event.target.value))} placeholder="Để trống nếu thỏa thuận"/></label>
        <label className="form-field"><span>Diện tích (m²)</span><input type="number" min="0.1" max="10000" step="0.1" value={form.areaValue || ""} onChange={(event) => update("areaValue", Number(event.target.value))} required/></label>
        <label className="form-field"><span>Loại phòng</span><select value={form.type} onChange={(event) => update("type", event.target.value)}><option>Phòng trọ</option><option>Căn hộ mini</option><option>Ở ghép</option><option>Ký túc xá</option><option>Nhà nguyên căn</option></select></label>
        <label className="form-field"><span>Tiền cọc / cọc đang giữ</span><input value={form.deposit} onChange={(event) => update("deposit", event.target.value)} maxLength={200} placeholder="Ví dụ: Đã cọc 1 tháng tiền thuê"/></label>
        <label className="form-field"><span>Hợp đồng hiện tại kết thúc</span><input type="date" min={today} value={form.contractEndDate} onChange={(event) => update("contractEndDate", event.target.value)} required/></label>
        <label className="form-field"><span>Có thể nhận phòng từ ngày</span><input type="date" min={today} value={form.availableFrom} onChange={(event) => update("availableFrom", event.target.value)}/></label>
        <label className="form-field sm:col-span-2"><span>Tiện ích (phân cách bằng dấu phẩy)</span><input value={form.amenities.join(", ")} onChange={(event) => update("amenities", event.target.value.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean).slice(0, 30))} maxLength={2000} placeholder="Máy lạnh, gác lửng, chỗ để xe"/></label>
        <label className="form-field sm:col-span-2"><span>Ảnh đại diện (đường dẫn ảnh, tùy chọn)</span><input type="url" value={form.image} onChange={(event) => update("image", event.target.value)} maxLength={2048} placeholder="https://..."/></label>
        <label className="form-field sm:col-span-2"><span>Mô tả phòng và điều kiện chuyển nhượng</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} minLength={20} maxLength={4000} rows={6} required placeholder="Mô tả tình trạng phòng, lý do chuyển nhượng, điều kiện với chủ nhà và các khoản phí liên quan."/></label>
      </section>
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-line pt-4 sm:flex-row sm:items-center"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-ink" to={id ? "/chuyen-nhuong/cua-toi" : "/chuyen-nhuong"}><Icon name="chevron" size={16}/>Quay lại</Link><Button disabled={saving} icon="check">{saving ? "Đang lưu..." : id ? "Lưu và gửi duyệt lại" : "Đăng tin chờ duyệt"}</Button></div>
    </form>
  </div></main>
}
