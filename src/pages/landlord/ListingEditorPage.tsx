import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"
import { usePlatform, type RentalListing } from "@/contexts/PlatformContext"
import { photos } from "@/mocks/content"
import { apiRequest, isApiMode } from "@/services/apiClient"

export default function ListingEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { listings, saveListing, categories } = usePlatform()
  const roomTypes = categories.filter((item) => item.type === "Loại phòng" && item.status === "active").map((item) => item.name)
  const amenities = categories.filter((item) => item.type === "Tiện ích" && item.status === "active").map((item) => item.name)
  const existing = listings.find((item) => item.id === id && item.ownerId === user?.id)
  const [form, setForm] = useState({ title: "", location: "", price: "", area: "", type: "Phòng trọ", deposit: "", phone: user?.phone ?? "", description: "", image: isApiMode ? "" : photos[0], amenities: ["Máy lạnh"] as string[], latitude: "", longitude: "" })
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [imageFileName, setImageFileName] = useState("")
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!existing) return
    setForm({
      title: existing.title, location: existing.location,
      price: String(existing.priceValue), area: String(existing.areaValue),
      type: existing.type, deposit: existing.deposit, phone: existing.phone ?? user?.phone ?? "",
      description: existing.description, image: existing.image,
      amenities: existing.amenities,
      latitude: existing.latitude === undefined ? "" : String(existing.latitude),
      longitude: existing.longitude === undefined ? "" : String(existing.longitude),
    })
    setImageFileName(existing.image.startsWith("data:image/") ? "Ảnh đã tải lên" : "")
  }, [existing])

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const toggleAmenity = (value: string) => setForm((current) => ({ ...current, amenities: current.amenities.includes(value) ? current.amenities.filter((item) => item !== value) : [...current.amenities, value] }))
  const uploadImage = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp hình ảnh.")
      return
    }
    if (file.size > (isApiMode ? 3_000_000 : 1_000_000)) {
      setError(isApiMode ? "Ảnh tải lên cần nhỏ hơn 3 MB." : "Ảnh tải lên cần nhỏ hơn 1 MB để lưu ổn định trong trình duyệt.")
      return
    }
    if (isApiMode) {
      setUploading(true)
      setError("")
      const body = new FormData()
      body.append("file", file)
      try {
        const result = await apiRequest<{ url: string }>("uploads/image", { method: "POST", body })
        update("image", result.url)
        setImageFileName(file.name)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Không thể tải ảnh lên.")
      } finally { setUploading(false) }
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update("image", reader.result)
        setImageFileName(file.name)
        setError("")
      }
    }
    reader.onerror = () => setError("Không thể đọc ảnh này. Hãy thử một tệp khác.")
    reader.readAsDataURL(file)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.location.trim() || Number(form.price) <= 0 || Number(form.area) <= 0 || !form.description.trim()) {
      setError("Vui lòng nhập tiêu đề, khu vực, giá, diện tích và mô tả hợp lệ.")
      return
    }
    if (Boolean(form.latitude.trim()) !== Boolean(form.longitude.trim()) || (form.latitude && (!Number.isFinite(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90)) || (form.longitude && (!Number.isFinite(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180))) {
      setError("Nhập cả vĩ độ và kinh độ hợp lệ, hoặc để trống cả hai.")
      return
    }
    if (isApiMode && !form.image.trim()) { setError("Thêm ảnh thực tế của phòng trước khi gửi tin."); return }
    if (uploading) { setError("Đợi ảnh tải lên xong rồi lưu tin."); return }
    const item: RentalListing = {
      id: existing?.id ?? `room-${Date.now()}`,
      title: form.title.trim(),
      location: form.location.trim(),
      price: `${Number(form.price).toLocaleString("vi-VN")}đ`,
      priceValue: Number(form.price),
      area: `${Number(form.area)} m²`,
      areaValue: Number(form.area),
      type: form.type,
      image: form.image,
      badge: existing?.badge ?? "Mới đăng",
      amenities: form.amenities,
      mapX: existing?.mapX ?? 50,
      mapY: existing?.mapY ?? 50,
      latitude: form.latitude ? Number(form.latitude) : existing?.latitude ?? (isApiMode ? undefined : 10.7769),
      longitude: form.longitude ? Number(form.longitude) : existing?.longitude ?? (isApiMode ? undefined : 106.7009),
      ownerId: user?.id ?? "",
      ownerName: user?.name ?? "",
      phone: form.phone,
      deposit: form.deposit || "Thỏa thuận",
      description: form.description.trim(),
      status: existing?.status === "rejected" ? "pending" : existing?.status ?? "pending",
      currentTenantId: existing?.currentTenantId ?? null,
      views: existing?.views ?? 0,
      contacts: existing?.contacts ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    try {
      await saveListing(item)
      setSaved(true)
      window.setTimeout(() => navigate("/chu-tro/quan-ly-tin"), 800)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu tin phòng.")
    }
  }

  return (
    <main className="workspace-page">
      <div className="container workspace-container editor-container">
        <button className="back-link" onClick={() => navigate("/chu-tro/quan-ly-tin")}><Icon name="chevron" size={15} /> Quay lại danh sách tin</button>
        <div className="page-heading-row editor-heading">
          <div><span className="eyebrow">Tin cho thuê</span><h1>{existing ? "Cập nhật thông tin phòng" : "Đăng tin cho thuê"}</h1><p>Thông tin rõ ràng giúp người thuê hiểu đúng về căn phòng trước khi liên hệ.</p></div>
          <span className="editor-step">3 phần thông tin</span>
        </div>
        {saved && <p className="form-message success" role="status">{existing ? "Đã lưu thay đổi." : "Tin đã gửi duyệt. Bạn sẽ thấy trạng thái trong danh sách tin."}</p>}
        {error && <p className="form-message error" role="alert">{error}</p>}
        <form className="listing-editor" onSubmit={submit}>
          <section className="editor-card">
            <div className="editor-section-title"><span>01</span><div><h2>Thông tin cơ bản</h2><p>Tiêu đề và khu vực người thuê có thể tìm kiếm.</p></div></div>
            <label className="form-field"><span>Tiêu đề tin <b>*</b></span><input maxLength={90} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ví dụ: Phòng ban công gần Đại học..."/><small>{form.title.length}/90 ký tự</small></label>
            <div className="editor-fields-two">
              <label className="form-field"><span>Khu vực <b>*</b></span><input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Quận, phường hoặc địa chỉ gần nhất"/></label>
              {isApiMode && <><label className="form-field"><span>Vĩ độ bản đồ (tùy chọn)</span><input type="number" min="-90" max="90" step="any" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} placeholder="Ví dụ: 10.7769"/></label><label className="form-field"><span>Kinh độ bản đồ (tùy chọn)</span><input type="number" min="-180" max="180" step="any" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} placeholder="Ví dụ: 106.7009"/><small>Chỉ nhập tọa độ đã kiểm tra tại vị trí phòng.</small></label></>}
              <label className="form-field"><span>Loại phòng</span><select value={form.type} onChange={(event) => update("type", event.target.value)}>{roomTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label className="form-field"><span>Giá thuê (triệu đồng/tháng) <b>*</b></span><input type="number" min="0.1" step="0.1" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="3.5"/></label>
              <label className="form-field"><span>Diện tích (m²) <b>*</b></span><input type="number" min="1" value={form.area} onChange={(event) => update("area", event.target.value)} placeholder="25"/></label>
              <label className="form-field"><span>Tiền cọc</span><input value={form.deposit} onChange={(event) => update("deposit", event.target.value)} placeholder="Ví dụ: 1 tháng tiền thuê"/></label>
              <label className="form-field"><span>Số điện thoại liên hệ</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="09xx xxx xxx"/></label>
            </div>
          </section>
          <section className="editor-card">
            <div className="editor-section-title"><span>02</span><div><h2>Mô tả và tiện ích</h2><p>Chia sẻ những chi tiết hữu ích, cả ưu điểm lẫn khoản phí phát sinh.</p></div></div>
            <label className="form-field"><span>Mô tả phòng <b>*</b></span><textarea rows={6} maxLength={1200} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Mô tả tình trạng phòng, nội thất, giờ giấc, chi phí điện nước..."/><small>{form.description.length}/1200 ký tự</small></label>
            <fieldset className="amenity-picker"><legend>Tiện ích có sẵn</legend>{amenities.map((item) => <label key={item}><input type="checkbox" checked={form.amenities.includes(item)} onChange={() => toggleAmenity(item)}/>{item}</label>)}</fieldset>
          </section>
          <section className="editor-card">
            <div className="editor-section-title"><span>03</span><div><h2>Ảnh đại diện</h2><p>Dùng ảnh thực tế, chụp đủ sáng và không dùng ảnh minh họa sai phòng.</p></div></div>
            <label className="form-field"><span>Tải ảnh từ thiết bị</span><input type="file" accept="image/*" onChange={(event) => void uploadImage(event.target.files?.[0])}/><small>{uploading ? "Đang tải ảnh lên..." : imageFileName || (isApiMode ? "Ảnh sẽ lưu trên Cloudinary khi dịch vụ được cấu hình." : "Chọn ảnh dưới 1 MB; ảnh được lưu trong trình duyệt.")}</small></label>
            <label className="form-field"><span>Đường dẫn ảnh</span><input value={form.image} onChange={(event) => update("image", event.target.value)} placeholder="https://..."/></label>
            {form.image && <img className="listing-image-preview" src={form.image} alt="Xem trước ảnh phòng"/>}
          </section>
          <div className="editor-submit"><span>{existing ? "Kiểm tra lại nội dung trước khi lưu thay đổi." : "Tin mới sẽ ở trạng thái chờ duyệt trước khi hiển thị."}</span><Button icon="send">{existing ? "Lưu cập nhật" : "Gửi duyệt tin"}</Button></div>
        </form>
      </div>
    </main>
  )
}
