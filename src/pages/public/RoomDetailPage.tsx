import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { useFavorites } from "@/contexts/FavoritesContext"
import { usePlatform, type RoomReview } from "@/contexts/PlatformContext"
import ReportDialog from "@/components/common/ReportDialog"
import useAuth from "@/hooks/useAuth"
import { photos } from "@/mocks/content"
import { isApiMode } from "@/services/apiClient"

const RoomMap = lazy(() => import("@/components/maps/RoomMap"))

export default function RoomDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { listings, reviews, saveReview, deleteReview, incrementListingViews, incrementListingContacts, startConversation } = usePlatform()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [showPhone, setShowPhone] = useState(false)
  const [contactPhone, setContactPhone] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [galleryExpanded, setGalleryExpanded] = useState(false)
  const [text, setText] = useState("")
  const [stars, setStars] = useState(5)
  const [editingReview, setEditingReview] = useState<RoomReview | null>(null)
  const [expanded, setExpanded] = useState(false)
  const room = listings.find((item) => item.id === id && (
    item.status === "active" ||
    (item.status === "rented" && user?.role === "renter" && item.currentTenantId === user.id)
  ))
  const roomReviews = useMemo(() => reviews.filter((review) => review.listingId === id), [reviews, id])
  const galleryImages = room?.gallery?.length ? room.gallery : (isApiMode ? [] : photos.filter((photo) => photo !== room?.image))

  useEffect(() => { if (id && room) incrementListingViews(room.id) }, [id])
  if (!room) return <main className="workspace-page"><div className="container workspace-container"><section className="empty-state"><span className="placeholder-icon"><Icon name="building"/></span><h1>Phòng này không còn hiển thị</h1><p>Có thể tin đã được cho thuê hoặc chủ trọ đã tạm ẩn.</p><Button onClick={() => navigate("/tim-phong")}>Tìm phòng khác</Button></section></div></main>

  const saved = isFavorite(room.id)
  const average = roomReviews.length ? roomReviews.reduce((sum, item) => sum + item.stars, 0) / roomReviews.length : 0
  const myReview = roomReviews.find((review) => review.authorId === user?.id)
  const canReview = user?.role === "renter" && room.currentTenantId === user.id
  const contact = async () => {
    if (!user) { navigate("/dang-nhap", { state: { from: `/phong/${room.id}` } }); return }
    const conversation = await startConversation({ accountId: user.id, name: room.ownerName, avatar: room.ownerName.split(" ").map((part) => part[0]).slice(-2).join(""), userId: room.ownerId, roomId: room.id })
    if (!conversation) return
    incrementListingContacts(room.id)
    navigate(`/tin-nhan?conversation=${conversation}`)
  }
  const submitReview = async (event: FormEvent) => {
    event.preventDefault()
    if (!canReview) {
      if (!user) navigate("/dang-nhap", { state: { from: `/phong/${room.id}` } })
      return
    }
    if (!text.trim()) return
    const previousReview = editingReview ?? myReview
    try {
      await saveReview({ id: previousReview?.id ?? `review-${Date.now()}`, listingId: room.id, authorId: user.id, author: user.name, initials: user.initials, stars, text: text.trim(), createdAt: previousReview?.createdAt ?? "Vừa xong" })
      setText("")
      setEditingReview(null)
    } catch {
      // Shared API status banner reports remote validation failures.
    }
  }

  return (
    <main className="page-bg detail-page"><div className="container workspace-container">
      <div className="breadcrumbs"><button onClick={() => navigate("/tim-phong")}>Tìm phòng</button><span>/</span>{room.location}<span>/</span>{room.title}</div>
      <div className="gallery"><img className="gallery-main" src={room.image} alt={room.title}/>{galleryImages.filter((photo) => photo !== room.image).slice(0, galleryExpanded ? 5 : 4).map((photo, index) => <div className="gallery-small" key={photo}><img src={photo} alt="Ảnh không gian phòng"/>{index === 3 && <button onClick={() => setGalleryExpanded((value) => !value)}>{galleryExpanded ? "− Thu gọn" : "+ ảnh"}</button>}</div>)}</div>
      <div className="detail-layout"><article className="detail-content"><div className="detail-title"><div><span className="verified">{room.status === "rented" ? "Đã cho thuê · Người thuê có thể đánh giá" : `✓ ${room.badge}`}</span><h1>{room.title}</h1><p><Icon name="pin" size={17}/>{room.location}</p></div>{user?.role !== "admin" && room.status === "active" && <button className={saved ? "save-big saved" : "save-big"} aria-pressed={saved} onClick={() => { if (!user) { navigate("/dang-nhap", { state: { from: `/phong/${room.id}` } }); return } toggleFavorite(room.id) }}><Icon name="heart"/>{saved ? "Đã lưu" : "Lưu tin"}</button>}</div>
        <div className="key-info"><div><small>Giá thuê</small><strong>{room.price}<em>/tháng</em></strong></div><div><small>Diện tích</small><strong>{room.area}</strong></div><div><small>Tiền cọc</small><strong>{room.deposit}</strong></div><div><small>Loại phòng</small><strong>{room.type}</strong></div></div>
        <section className="detail-section"><h2>Tiện ích</h2><div className="amenities">{room.amenities.map((item) => <span key={item}>✓ {item}</span>)}</div></section>
        <section className="detail-section"><h2>Mô tả phòng</h2><p className={expanded ? "detail-description expanded" : "detail-description"}>{room.description}</p>{room.description.length > 160 && <button className="text-link" onClick={() => setExpanded((value) => !value)}>{expanded ? "Thu gọn" : "Đọc thêm"}</button>}</section>
        <section className="detail-section"><h2>Vị trí</h2>{isApiMode ? room.latitude !== undefined && room.longitude !== undefined ? <Suspense fallback={<div className="room-detail-map map-loading">Đang tải bản đồ…</div>}><RoomMap className="room-detail-map" listings={[{ id: room.id, title: room.title, price: room.price, area: room.area, location: room.location, latitude: room.latitude, longitude: room.longitude }]} center={[room.latitude, room.longitude]} zoom={15} note="Vị trí do chủ trọ cung cấp. Xác nhận địa chỉ trước khi hẹn xem." /></Suspense> : <div className="mini-map"><Icon name="pin"/><b>{room.location}</b><small>Chủ trọ chưa cung cấp tọa độ bản đồ; hãy hỏi vị trí cụ thể trước khi đi xem.</small></div> : <div className="mini-map"><span className="river"/><div className="location-pin"><Icon name="pin"/></div><b>{room.location}</b><small>Vị trí hiển thị tương đối để bảo vệ riêng tư.</small></div>}</section>
        <section className="detail-section reviews">
          <div className="review-head">
            <div className="review-heading-copy">
              <h2>Đánh giá từ người thuê</h2>
              <small>{roomReviews.length ? `${roomReviews.length} nhận xét` : "Chưa có đánh giá"}</small>
            </div>
            {roomReviews.length > 0 && (
              <div className="review-rating-summary" aria-label={`Điểm trung bình ${average.toFixed(1)} trên 5`}>
                <strong>{average.toFixed(1)}</strong>
                <div>
                  <span className="review-average-stars" aria-hidden="true">★★★★★</span>
                  <small>Điểm trung bình</small>
                </div>
              </div>
            )}
          </div>
          {roomReviews.map((review) => (
            <article className="comment review-card" key={review.id}>
              <Link className="avatar peach profile-avatar-link" to={`/nguoi-dung/${review.authorId}`} aria-label={`Xem hồ sơ ${review.author}`}>{review.initials}</Link>
              <div className="review-copy">
                <div className="review-meta">
                  <Link className="review-author-link" to={`/nguoi-dung/${review.authorId}`}>{review.author}</Link>
                  <span className="stars" aria-label={`${review.stars} sao`}>{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>
                  <small>{review.createdAt}</small>
                </div>
                <p>{review.text}</p>
              </div>
              {review.authorId === user?.id && (
                <div className="review-actions">
                  <button type="button" onClick={() => { setEditingReview(review); setText(review.text); setStars(review.stars) }}>Sửa</button>
                  <button type="button" onClick={() => { if (window.confirm("Xóa đánh giá này?")) deleteReview(review.id) }}>Xóa</button>
                </div>
              )}
            </article>
          ))}
          {canReview ? (
            <form className="review-form" onSubmit={submitReview}>
              <label className="form-field">
                <span>{myReview ? "Cập nhật đánh giá của bạn" : "Chia sẻ trải nghiệm thuê phòng"}</span>
                <div className="star-picker" role="radiogroup" aria-label="Số sao">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button type="button" aria-label={`${value} sao`} aria-pressed={stars === value} key={value} onClick={() => setStars(value)}>{value <= stars ? "★" : "☆"}</button>
                  ))}
                </div>
                <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Phòng có đúng như mô tả không? Chủ trọ phản hồi thế nào?" />
              </label>
              <Button icon="send">{editingReview || myReview ? "Lưu đánh giá" : "Gửi đánh giá"}</Button>
            </form>
          ) : (
            <p className="review-login-hint">{!user ? "Đăng nhập bằng tài khoản người thuê được ghi nhận cho phòng để gửi đánh giá." : user.role !== "renter" ? "Chỉ người thuê mới có thể đánh giá phòng." : "Chủ trọ cần ghi nhận bạn là người thuê hiện tại của phòng này trước khi gửi đánh giá."}</p>
          )}
        </section>
      </article><aside className="landlord-card"><div className="landlord-top"><Link className="profile-avatar-link" to={`/nguoi-dung/${room.ownerId}`} aria-label={`Xem hồ sơ ${room.ownerName}`}><span className="avatar large">{room.ownerName.split(" ").map((part) => part[0]).slice(-2).join("")}</span></Link><div><small>Chủ trọ</small><Link className="landlord-profile-name" to={`/nguoi-dung/${room.ownerId}`}><h3>{room.ownerName}</h3></Link><span>● Đang hoạt động</span></div></div><div className="landlord-stats"><span><b>{room.views}</b> Lượt xem</span><span><b>{room.contacts}</b> Liên hệ</span><span><b>{roomReviews.length ? average.toFixed(1) : "—"}</b> Đánh giá</span></div>{room.status === "active" && user?.role !== "admin" && <Button icon="chat" onClick={contact}>Nhắn tin hỏi phòng</Button>}{room.status === "active" && <Button variant="outline" icon="phone" onClick={async () => { if (!showPhone) { const phone = isApiMode ? await incrementListingContacts(room.id) : room.phone; setContactPhone(phone ?? ""); setShowPhone(true) } }}> {showPhone ? contactPhone || "Chưa có số liên hệ" : "Hiện số điện thoại"}</Button>}<p><Icon name="shield" size={17}/>{room.status === "rented" ? "Thông tin phòng được giữ lại để người thuê hiện tại gửi đánh giá." : "Kiểm tra giấy tờ và chi phí trước khi đặt cọc."}</p>{room.status === "active" && user?.role !== "admin" && <button className="report" onClick={() => setReportOpen(true)}>Báo cáo tin đăng</button>}</aside></div>
      {reportOpen && <ReportDialog targetType="Tin phòng" targetId={room.id} targetTitle={room.title} onClose={() => setReportOpen(false)}/>}
    </div></main>
  )
}
