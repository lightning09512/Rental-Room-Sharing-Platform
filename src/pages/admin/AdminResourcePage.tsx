import { useMemo, useState, type FormEvent } from "react"
import { useLocation } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform, type CategoryRecord, type ContentStatus, type ListingStatus, type PlatformUser, type ReportRecord, type TransferListing } from "@/contexts/PlatformContext"
import { authService } from "@/services/authService"
import { isApiMode } from "@/services/apiClient"

type Resource = "users" | "listings" | "transfers" | "forum" | "categories" | "reports"
type AdminRow = { id: string; title: string; detail: string; status: string; meta: string; image?: string; description?: string }

const statusText: Record<string, string> = {
  active: "Đang hoạt động", locked: "Đã khóa", pending: "Chờ duyệt", hidden: "Đang ẩn",
  rented: "Đã cho thuê", rejected: "Từ chối", accepted: "Đã chấp nhận", reviewed: "Đã xử lý", closed: "Đã đóng", removed: "Đã gỡ",
}

function downloadCsv(filename: string, rows: AdminRow[]) {
  const content = ["ID,Tiêu đề,Thông tin,Trạng thái,Chi tiết", ...rows.map((row) => [row.id, row.title, row.detail, row.status, row.meta].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\r\n")
  const link = document.createElement("a")
  link.href = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function AdminResourcePage() {
  const { pathname } = useLocation()
  const resource = (pathname.split("/")[2] === "tin-cho-thue" ? "listings" : pathname.split("/")[2] === "tin-chuyen-nhuong" ? "transfers" : pathname.split("/")[2] === "dien-dan" ? "forum" : pathname.split("/")[2] === "danh-muc" ? "categories" : pathname.split("/")[2] === "bao-cao" ? "reports" : "users") as Resource
  const { users, saveUser, deleteUser, listings, setListingStatus, deleteListing, transfers, moderateTransfer, removeTransfer, posts, setPostStatus, deletePost, categories, saveCategory, deleteCategory, reports, updateReport, addNotification, deleteComment, connectionState, connectionError } = usePlatform()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [editing, setEditing] = useState<PlatformUser | CategoryRecord | null>(null)
  const [editorError, setEditorError] = useState("")
  const [dialog, setDialog] = useState<"edit" | "report" | "transfer-review" | null>(null)
  const [actionError, setActionError] = useState("")
  const [transferTarget, setTransferTarget] = useState<TransferListing | null>(null)
  const [transferNote, setTransferNote] = useState("")
  const [reportTarget, setReportTarget] = useState<ReportRecord | null>(null)
  const [reportDecision, setReportDecision] = useState<ReportRecord["status"]>("accepted")
  const [reportNote, setReportNote] = useState("")
  const [sendWarning, setSendWarning] = useState(false)

  const title: Record<Resource, string> = { users: "Người dùng", listings: "Tin cho thuê", transfers: "Tin chuyển nhượng", forum: "Kiểm duyệt diễn đàn", categories: "Danh mục", reports: "Báo cáo vi phạm" }
  const kind: Record<Resource, string> = { users: "Tài khoản", listings: "Tin phòng", transfers: "Tin chuyển nhượng", forum: "Bài viết", categories: "Danh mục", reports: "Nội dung được báo cáo" }
  const emptyTitle: Record<Resource, string> = { users: "Chưa có tài khoản", listings: "Chưa có tin cho thuê", transfers: "Chưa có tin chuyển nhượng", forum: "Chưa có bài viết", categories: "Chưa có danh mục", reports: "Chưa có báo cáo vi phạm" }
  const emptyDescription: Record<Resource, string> = { users: "Tài khoản mới sẽ xuất hiện tại đây.", listings: "Tin cho thuê gửi lên sẽ được hiển thị trong danh sách này.", transfers: "Tin chuyển nhượng gửi lên sẽ xuất hiện tại đây để quản trị viên kiểm duyệt.", forum: "Bài viết cần kiểm duyệt sẽ xuất hiện tại đây.", categories: "Thêm khu vực, loại phòng hoặc tiện ích để quản lý tại đây.", reports: "Khi người dùng gửi báo cáo, nội dung cần xem xét sẽ xuất hiện tại đây." }
  const description: Record<Resource, string> = {
    users: "Tìm tài khoản, cập nhật vai trò và kiểm soát trạng thái truy cập.",
    listings: "Xét duyệt, ẩn hoặc gỡ tin cho thuê khỏi kết quả tìm kiếm.",
    transfers: "Tìm tin chuyển nhượng, kiểm tra thông tin hợp đồng, duyệt hoặc gỡ tin.",
    forum: "Rà soát bài viết cộng đồng và xử lý nội dung vi phạm.",
    categories: "Quản lý khu vực, loại phòng và tiện ích được dùng trên hệ thống.",
    reports: "Xem nội dung bị báo cáo, đưa ra kết luận và gửi cảnh báo khi cần.",
  }

  const rows: AdminRow[] = useMemo(() => {
    if (resource === "users") return users.map((item) => ({ id: item.id, title: item.name, detail: item.email, status: item.status, meta: `${item.role === "landlord" ? "Chủ trọ" : item.role === "admin" ? "Quản trị viên" : "Người thuê"} · ${item.phone}` }))
    if (resource === "listings") return listings.map((item) => ({ id: item.id, image: item.image, title: item.title, detail: item.location, status: item.status, meta: `${item.price}/tháng · ${item.area} · ${item.ownerName}` }))
    if (resource === "transfers") return transfers.map((item) => ({ id: item.id, image: item.image, title: item.title, detail: item.location, status: item.status, description: item.description, meta: `${item.price}/tháng · phí ${item.transferFee} · ${item.area} · ${item.type} · cọc: ${item.deposit} · HĐ đến ${new Date(`${item.contractEndDate}T00:00:00`).toLocaleDateString("vi-VN")} · nhận phòng ${item.availableFrom ? new Date(`${item.availableFrom}T00:00:00`).toLocaleDateString("vi-VN") : "thỏa thuận"} · ${item.ownerName}${item.amenities.length ? ` · ${item.amenities.join(", ")}` : ""}` }))
    if (resource === "forum") return posts.map((item) => ({ id: item.id, title: item.name, detail: item.content, status: item.status, meta: `${item.likes} lượt thích · ${item.commentsCount} bình luận` }))
    if (resource === "categories") return categories.map((item) => ({ id: item.id, title: item.name, detail: item.type, status: item.status, meta: `Danh mục ${item.type.toLocaleLowerCase("vi")}` }))
    return reports.map((item) => ({ id: item.id, title: item.targetTitle, detail: `${item.targetType} · ${item.reason}`, status: item.status === "pending" ? "pending" : "reviewed", meta: `${item.reporter} · ${item.description || "Không có mô tả thêm"}` }))
  }, [resource, users, listings, transfers, posts, categories, reports])

  const filtered = rows.filter((row) =>
    (filter === "all" || row.status === filter) &&
    `${row.title} ${row.detail} ${row.meta}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")),
  )

  const openEdit = (item?: PlatformUser | CategoryRecord) => {
    setEditing(item ?? null)
    setEditorError("")
    setDialog("edit")
  }

  const saveEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (resource === "users") {
      const email = String(data.get("email") ?? "").trim().toLocaleLowerCase("vi")
      const phone = String(data.get("phone") ?? "").replace(/\D/g, "")
      const password = String(data.get("password") ?? "")
      if (!editing && isApiMode && password.length < 8) {
        setEditorError("Tài khoản mới cần mật khẩu tối thiểu 8 ký tự.")
        return
      }
      const duplicate = users.some((item) => item.id !== editing?.id && (
        item.email.toLocaleLowerCase("vi") === email ||
        (phone.length > 0 && item.phone.replace(/\D/g, "") === phone)
      ))
      if (duplicate) {
        setEditorError("Email hoặc số điện thoại đã được dùng cho tài khoản khác.")
        return
      }
      const user: PlatformUser = {
        id: editing?.id ?? `user-${Date.now()}`,
        name: String(data.get("name") ?? ""),
        email,
        phone: String(data.get("phone") ?? ""),
        role: String(data.get("role") ?? "renter") as PlatformUser["role"],
        initials: String(data.get("name") ?? "").split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase(),
        status: String(data.get("status") ?? "active") as PlatformUser["status"],
        createdAt: editing && "createdAt" in editing ? editing.createdAt : new Date().toISOString(),
      }
      try {
        await saveUser(user, password || undefined)
      } catch (caught) {
        setEditorError(caught instanceof Error ? caught.message : "Không thể lưu tài khoản.")
        return
      }
      if (!isApiMode) authService.saveManagedAccount(user)
    } else {
      const category: CategoryRecord = {
        id: editing?.id ?? `category-${Date.now()}`,
        name: String(data.get("name") ?? ""),
        type: String(data.get("type") ?? "Khu vực") as CategoryRecord["type"],
        status: String(data.get("status") ?? "active") as CategoryRecord["status"],
      }
      await saveCategory(category)
    }
    setDialog(null)
  }

  const action = (id: string, status: string) => {
    setActionError("")
    if (resource === "users") {
      const item = users.find((value) => value.id === id)
      if (item) {
        const updated = { ...item, status: status === "locked" ? "active" as const : "locked" as const }
        void saveUser(updated).then(() => {
          if (!isApiMode) authService.saveManagedAccount(updated)
        }).catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Không thể cập nhật tài khoản."))
      }
    } else if (resource === "listings") {
      const item = listings.find((value) => value.id === id)
      void setListingStatus(id, status as ListingStatus).then(() => {
        if (!isApiMode && item && (status === "active" || status === "rejected")) addNotification({ userId: item.ownerId, title: status === "active" ? "Tin cho thuê đã được duyệt" : "Tin cho thuê cần chỉnh sửa", detail: status === "active" ? `Tin “${item.title}” hiện đã được hiển thị.` : `Tin “${item.title}” chưa được duyệt. Vui lòng rà soát lại thông tin.` })
      }).catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái tin."))
    } else if (resource === "transfers") {
      const item = transfers.find((value) => value.id === id)
      if (status === "active") void moderateTransfer(id, "active").catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Không thể duyệt tin."))
      else if (item) {
        setTransferTarget(item)
        setTransferNote("")
        setDialog("transfer-review")
      }
    } else if (resource === "forum") setPostStatus(id, status as ContentStatus)
    else if (resource === "categories") {
      const item = categories.find((value) => value.id === id)
      if (item) saveCategory({ ...item, status: item.status === "active" ? "hidden" : "active" })
    } else {
      const report = reports.find((value) => value.id === id)
      if (report) {
        setReportTarget(report)
        setReportDecision("accepted")
        setReportNote("")
        setSendWarning(false)
        setDialog("report")
      }
    }
  }

  const remove = (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa “${name}”?`)) return
    if (resource === "users") {
      void deleteUser(id).then(() => {
        if (!isApiMode) authService.deleteManagedAccount(id)
      }).catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Không thể xóa tài khoản."))
    }
    if (resource === "listings") deleteListing(id)
    if (resource === "transfers") void removeTransfer(id).catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Không thể gỡ tin chuyển nhượng."))
    if (resource === "forum") deletePost(id)
    if (resource === "categories") deleteCategory(id)
    if (resource === "reports") void updateReport(id, "rejected", "Đã từ chối báo cáo.").catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Không thể xử lý báo cáo."))
  }

  const saveReportDecision = async (event: FormEvent) => {
    event.preventDefault()
    if (!reportTarget) return
    setActionError("")
    try {
      await updateReport(reportTarget.id, reportDecision, reportNote)
      if (sendWarning && reportNote.trim()) {
        const targetUserId = reportTarget.targetType === "Tin phòng"
          ? listings.find((item) => item.id === reportTarget.targetId)?.ownerId
          : reportTarget.targetType === "Bài viết"
            ? posts.find((item) => item.id === reportTarget.targetId)?.authorId
            : posts.flatMap((item) => item.comments).find((item) => item.id === reportTarget.targetId)?.authorId
        if (targetUserId) await addNotification({ userId: targetUserId, title: "Cảnh báo từ quản trị viên", detail: reportNote.trim() })
      }
      setDialog(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể xử lý báo cáo.")
    }
  }

  const saveTransferDecision = async (event: FormEvent) => {
    event.preventDefault()
    if (!transferTarget) return
    setActionError("")
    try {
      await moderateTransfer(transferTarget.id, "rejected", transferNote.trim())
      setDialog(null)
      setTransferTarget(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể từ chối tin chuyển nhượng.")
    }
  }

  return (
    <main className={`admin-resource-page admin-resource-page--${resource}`}>
      <div className="resource-page-heading"><div><span className="eyebrow">Quản trị hệ thống</span><h2>{title[resource]}</h2><p>{description[resource]}</p></div><div>{(resource === "users" || resource === "categories") && <Button icon="plus" onClick={() => openEdit()}>Thêm mới</Button>}{resource !== "reports" && <Button variant="outline" icon="download" onClick={() => downloadCsv(`${resource}-tro-oi.csv`, filtered)}>Tải CSV</Button>}</div></div>
      {actionError && <p className="form-message error" role="alert">{actionError}</p>}
      {resource === "transfers" && isApiMode && connectionState === "error" && <p className="form-message error" role="alert">Không tải được tin chuyển nhượng: {connectionError || "Kiểm tra kết nối máy chủ rồi thử lại."}</p>}
      <section className={`resource-panel resource-panel--${resource}`}>
        {resource === "transfers" && isApiMode && connectionState === "loading" && <p className="p-5 text-sm text-muted" aria-live="polite">Đang tải danh sách tin chuyển nhượng…</p>}
        <div className="workspace-toolbar"><label className="workspace-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Tìm trong ${title[resource].toLocaleLowerCase("vi")}`}/></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Lọc trạng thái"><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="pending">Chờ duyệt</option><option value="hidden">Đang ẩn</option><option value="rejected">Từ chối</option><option value="closed">Đã đóng</option><option value="removed">Đã gỡ</option><option value="reviewed">Đã xử lý</option><option value="locked">Đã khóa</option></select><span>{filtered.length} kết quả</span></div>
        <div className={`resource-list resource-list--${resource}`}>{filtered.map((row) => <article className={`resource-row resource-row--${resource}`} key={row.id}>{row.image && <img className="resource-row-media" src={row.image} alt={row.title} loading="lazy" />}<div className="resource-row-main"><div className="resource-row-heading"><span className="resource-kind">{kind[resource]}</span><span className={`status-pill status-${row.status}`}>{statusText[row.status] ?? row.status}</span></div><h3>{row.title}</h3><p>{row.detail}</p>{resource === "transfers" && row.description && <p className="line-clamp-4 whitespace-pre-line">{row.description}</p>}<small>{row.meta}</small>{resource === "forum" && posts.find((item) => item.id === row.id)?.comments.map((comment) => <div className="admin-comment-row" key={comment.id}><span><b>{comment.author}</b> · {comment.text}</span><button className="danger-action" onClick={() => { if (window.confirm("Xóa bình luận vi phạm này?")) deleteComment(row.id, comment.id) }}>Xóa bình luận</button></div>)}</div><div className="resource-row-actions">
          {resource === "users" && <><button onClick={() => openEdit(users.find((item) => item.id === row.id))}><Icon name="edit" size={15}/> Sửa</button><button onClick={() => action(row.id, row.status)}>{row.status === "locked" ? "Mở khóa" : "Khóa"}</button><button className="danger-action" onClick={() => remove(row.id, row.title)}>Xóa</button></>}
          {resource === "listings" && <><button onClick={() => action(row.id, "active")}>Duyệt / Hiện</button><button onClick={() => action(row.id, "rejected")}>Từ chối</button><button onClick={() => action(row.id, "hidden")}>Ẩn</button><button className="danger-action" onClick={() => remove(row.id, row.title)}>Gỡ</button></>}
          {resource === "transfers" && <><button disabled={row.status === "active" || row.status === "closed" || row.status === "removed"} onClick={() => action(row.id, "active")}>Duyệt tin</button><button disabled={row.status === "closed" || row.status === "removed"} onClick={() => action(row.id, "rejected")}>Từ chối kèm lý do</button>{row.status !== "removed" && <button className="danger-action" onClick={() => remove(row.id, row.title)}>Gỡ tin</button>}</>}
          {resource === "forum" && <><button onClick={() => action(row.id, row.status === "hidden" ? "active" : "hidden")}>{row.status === "hidden" ? "Hiện bài" : "Ẩn bài"}</button><button className="danger-action" onClick={() => remove(row.id, row.title)}>Xóa bài</button></>}
          {resource === "categories" && <><button onClick={() => openEdit(categories.find((item) => item.id === row.id))}><Icon name="edit" size={15}/> Sửa</button><button onClick={() => action(row.id, "hidden")}>{row.status === "hidden" ? "Hiện" : "Ẩn"}</button><button className="danger-action" onClick={() => remove(row.id, row.title)}>Xóa</button></>}
          {resource === "reports" && <><button onClick={() => action(row.id, "accepted")}>Xử lý báo cáo</button><button className="danger-action" onClick={() => remove(row.id, row.title)}>Từ chối</button></>}
        </div></article>)}</div>
        {!filtered.length && !(resource === "transfers" && isApiMode && connectionState !== "ready") && <div className={`resource-empty resource-empty--${resource}`}><Icon name={resource === "reports" ? "shield" : resource === "users" ? "users" : resource === "listings" || resource === "transfers" ? "building" : resource === "forum" ? "chat" : "filter"}/><h3>{rows.length ? "Không tìm thấy kết quả phù hợp" : emptyTitle[resource]}</h3><p>{rows.length ? "Thử thay đổi từ khóa hoặc trạng thái đang lọc." : emptyDescription[resource]}</p></div>}
      </section>

      {dialog === "edit" && <div className="dialog-backdrop"><section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-editor-title"><button className="dialog-close" onClick={() => setDialog(null)} aria-label="Đóng"><Icon name="close"/></button><span className="eyebrow">{resource === "users" ? "Tài khoản" : "Cấu hình"}</span><h2 id="admin-editor-title">{editing ? "Cập nhật thông tin" : "Tạo mới"}</h2><form className="dialog-form" onSubmit={saveEditor}>
        {editorError && <p className="form-message error" role="alert">{editorError}</p>}{!editing && resource === "users" && <p className="demo-note">{isApiMode ? "Đặt mật khẩu ban đầu an toàn; mật khẩu sẽ được băm trước khi lưu." : `Tài khoản demo mới dùng mật khẩu ${authService.demoPassword}; người dùng có thể đổi mật khẩu sau khi đăng nhập.`}</p>}
        {resource === "users" ? <><label className="form-field"><span>Họ tên</span><input name="name" defaultValue={editing && "name" in editing ? editing.name : ""} required/></label><label className="form-field"><span>Email</span><input name="email" type="email" defaultValue={editing && "email" in editing ? editing.email : ""} required/></label><label className="form-field"><span>Số điện thoại</span><input name="phone" defaultValue={editing && "phone" in editing ? editing.phone : ""} required/></label>{!editing && <label className="form-field"><span>Mật khẩu ban đầu</span><input name="password" type="password" minLength={8} required={isApiMode} autoComplete="new-password" placeholder="Ít nhất 8 ký tự"/></label>}<label className="form-field"><span>Vai trò</span><select name="role" defaultValue={editing && "role" in editing ? editing.role : "renter"}><option value="renter">Người thuê</option><option value="landlord">Chủ trọ</option><option value="admin">Quản trị viên</option></select></label><label className="form-field"><span>Trạng thái</span><select name="status" defaultValue={editing && "status" in editing ? editing.status : "active"}><option value="active">Đang hoạt động</option><option value="locked">Đã khóa</option></select></label></> : <><label className="form-field"><span>Tên danh mục</span><input name="name" defaultValue={editing && "name" in editing ? editing.name : ""} required/></label><label className="form-field"><span>Nhóm</span><select name="type" defaultValue={editing && "type" in editing ? editing.type : "Khu vực"}><option>Khu vực</option><option>Loại phòng</option><option>Tiện ích</option></select></label><label className="form-field"><span>Trạng thái</span><select name="status" defaultValue={editing && "status" in editing ? editing.status : "active"}><option value="active">Đang dùng</option><option value="hidden">Đang ẩn</option></select></label></>}
        <div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Hủy</Button><Button>Lưu</Button></div>
      </form></section></div>}

      {dialog === "report" && reportTarget && <div className="dialog-backdrop"><section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-report-title"><button className="dialog-close" onClick={() => setDialog(null)} aria-label="Đóng"><Icon name="close"/></button><span className="eyebrow">Xử lý báo cáo</span><h2 id="admin-report-title">{reportTarget.targetTitle}</h2><p className="dialog-target">{reportTarget.targetType} · {reportTarget.reason}<br/>{reportTarget.description}</p><form className="dialog-form" onSubmit={saveReportDecision}>{actionError && <p className="form-message error" role="alert">{actionError}</p>}<label className="form-field"><span>Kết quả</span><select value={reportDecision} onChange={(event) => setReportDecision(event.target.value as ReportRecord["status"])}><option value="accepted">Chấp nhận báo cáo</option><option value="rejected">Từ chối báo cáo</option></select></label><label className="form-field"><span>Ghi chú / nội dung cảnh báo</span><textarea rows={4} value={reportNote} onChange={(event) => setReportNote(event.target.value)} placeholder="Ghi lại quyết định xử lý hoặc nội dung cảnh báo."/></label><label className="inline-check"><input type="checkbox" checked={sendWarning} onChange={(event) => setSendWarning(event.target.checked)}/>Gửi ghi chú này thành cảnh báo cho người dùng liên quan.</label><div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Hủy</Button><Button icon="send">Lưu kết quả</Button></div></form></section></div>}

      {dialog === "transfer-review" && transferTarget && <div className="dialog-backdrop"><section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="transfer-review-title"><button className="dialog-close" onClick={() => setDialog(null)} aria-label="Đóng"><Icon name="close"/></button><span className="eyebrow">Từ chối tin chuyển nhượng</span><h2 id="transfer-review-title">{transferTarget.title}</h2><p className="dialog-target">Tin của {transferTarget.ownerName} · {transferTarget.location}</p><form className="dialog-form" onSubmit={saveTransferDecision}><label className="form-field"><span>Lý do / nội dung cần bổ sung</span><textarea rows={4} maxLength={1000} value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="Nêu rõ thông tin người đăng cần chỉnh sửa (nếu có)."/></label><div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Hủy</Button><Button icon="send">Từ chối tin</Button></div></form></section></div>}
    </main>
  )
}
