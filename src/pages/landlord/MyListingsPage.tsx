import { useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"
import { usePlatform, type ListingStatus, type RentalListing } from "@/contexts/PlatformContext"

const statusLabels: Record<ListingStatus, string> = {
  pending: "Chờ duyệt",
  active: "Đang hiển thị",
  hidden: "Đang ẩn",
  rented: "Đã cho thuê",
  rejected: "Cần chỉnh sửa",
}

export default function MyListingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { listings, users, saveListing, deleteListing } = usePlatform()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [rentedListing, setRentedListing] = useState<RentalListing | null>(null)
  const [currentTenantId, setCurrentTenantId] = useState("")
  const mine = useMemo(() => listings.filter((item) => item.ownerId === user?.id), [listings, user?.id])
  const filtered = mine.filter((item) =>
    (!status || status === "all" || item.status === status) &&
    `${item.title} ${item.location}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")),
  )
  const tenants = users.filter((item) => item.role === "renter" && item.status === "active")
  const updateStatus = (item: RentalListing, nextStatus: ListingStatus) => {
    if (nextStatus === "rented") {
      setCurrentTenantId(item.currentTenantId ?? "")
      setRentedListing(item)
      return
    }
    if (!window.confirm(`Cập nhật “${item.title}” sang trạng thái “${statusLabels[nextStatus]}”?`)) return
    saveListing({ ...item, status: nextStatus, currentTenantId: null })
  }
  const markAsRented = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!rentedListing || !currentTenantId) return
    saveListing({ ...rentedListing, status: "rented", currentTenantId })
    setRentedListing(null)
    setCurrentTenantId("")
  }

  return (
    <main className="workspace-page">
      <div className="container workspace-container">
        <div className="page-heading-row">
          <div>
            <span className="eyebrow">Không gian chủ trọ</span>
            <h1>Tin cho thuê của tôi</h1>
            <p>Theo dõi trạng thái, cập nhật thông tin và quản lý lịch xem phòng.</p>
          </div>
          <Button icon="plus" onClick={() => navigate("/chu-tro/dang-tin")}>Đăng phòng mới</Button>
        </div>

        <div className="workspace-toolbar">
          <label className="workspace-search">
            <Icon name="search" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên phòng hoặc khu vực" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc trạng thái tin">
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
          <span>{filtered.length} tin</span>
        </div>

        {filtered.length ? (
          <div className="owned-listings">
            {filtered.map((item) => (
              <article className="owned-listing" key={item.id}>
                <img src={item.image} alt={item.title} />
                <div className="owned-listing-main">
                  <div className="owned-listing-meta">
                    <span className={`status-pill status-${item.status}`}>{statusLabels[item.status]}</span>
                    <span>{item.type}</span>
                  </div>
                  <h2>{item.title}</h2>
                  <p><Icon name="pin" size={15} /> {item.location} <span>·</span> {item.area}</p>
                  <strong>{item.price}<small>/tháng</small></strong>
                  {item.status === "rejected" && <small className="review-note">Tin cần bổ sung thông tin trước khi đăng lại.</small>}
                  {item.status === "rented" && <small className="review-note">Người thuê hiện tại: {users.find((person) => person.id === item.currentTenantId)?.name ?? "Chưa ghi nhận"}</small>}
                </div>
                <div className="owned-listing-stats">
                  <span><b>{item.views}</b> lượt xem</span>
                  <span><b>{item.contacts}</b> liên hệ</span>
                </div>
                <div className="owned-listing-actions">
                  <button className="secondary-action" onClick={() => navigate(`/chu-tro/tin/${item.id}/chinh-sua`)}><Icon name="edit" size={16} /> Sửa tin</button>
                  <select
                    aria-label={`Cập nhật trạng thái: ${item.title}`}
                    value={item.status}
                    disabled={item.status === "pending"}
                    onChange={(event) => updateStatus(item, event.target.value as ListingStatus)}
                  >
                    {(item.status === "pending"
                      ? ["pending"]
                      : item.status === "rejected"
                        ? ["rejected", "pending"]
                        : ["active", "hidden", "rented"]
                    ).map((value) => <option value={value} key={value}>{item.status === "rejected" && value === "pending" ? "Gửi lại duyệt" : statusLabels[value as ListingStatus]}</option>)}
                  </select>
                  <button className="danger-action" onClick={() => {
                    if (window.confirm(`Xóa tin “${item.title}”?`)) deleteListing(item.id)
                  }}><Icon name="trash" size={16} /> Xóa</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="empty-state">
            <span className="placeholder-icon"><Icon name="building" size={24} /></span>
            <h2>{mine.length ? "Không tìm thấy tin phù hợp" : "Bạn chưa đăng phòng nào"}</h2>
            <p>Đăng tin đầu tiên để người đang tìm phòng trong khu vực biết đến chỗ ở của bạn.</p>
            <Button onClick={() => navigate("/chu-tro/dang-tin")}>Đăng phòng mới</Button>
          </section>
        )}
      </div>
      {rentedListing && <div className="dialog-backdrop"><section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="rented-title"><button className="dialog-close" onClick={() => setRentedListing(null)} aria-label="Đóng"><Icon name="close"/></button><span className="eyebrow">Cập nhật tình trạng phòng</span><h2 id="rented-title">Đánh dấu đã cho thuê</h2><p className="dialog-target">{rentedListing.title}<br/>Chọn tài khoản người thuê hiện tại để họ có thể gửi đánh giá cho phòng.</p><form className="dialog-form" onSubmit={markAsRented}><label className="form-field"><span>Người thuê hiện tại <b>*</b></span><select required value={currentTenantId} onChange={(event) => setCurrentTenantId(event.target.value)}><option value="">Chọn người thuê</option>{tenants.map((tenant) => <option value={tenant.id} key={tenant.id}>{tenant.name} · {tenant.email}</option>)}</select>{!tenants.length && <small>Chưa có tài khoản người thuê đang hoạt động để ghi nhận.</small>}</label><div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setRentedListing(null)}>Hủy</Button><Button icon="check">Lưu trạng thái</Button></div></form></section></div>}
    </main>
  )
}
