import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform, type ReportRecord } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"

export default function ReportDialog({
  targetType,
  targetId,
  targetTitle,
  onClose,
}: {
  targetType: ReportRecord["targetType"]
  targetId: string
  targetTitle: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addReport } = usePlatform()
  const [reason, setReason] = useState("Thông tin sai lệch")
  const [description, setDescription] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!user) {
      navigate("/dang-nhap", { state: { from: window.location.pathname } })
      return
    }
    setSubmitting(true)
    try {
      await addReport({ reporterId: user.id, reporter: user.name, targetType, targetId, targetTitle, reason, description })
      setSent(true)
    } catch {
      // The API client shows the server error in the shared status banner.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <button className="dialog-close" aria-label="Đóng" onClick={onClose}><Icon name="close" size={18}/></button>
        {sent ? <div className="dialog-success"><span><Icon name="check"/></span><h2 id="report-title">Đã nhận báo cáo</h2><p>Quản trị viên sẽ xem xét nội dung và cập nhật kết quả trong mục Báo cáo của tôi.</p><Button onClick={onClose}>Hoàn tất</Button></div> : <>
          <span className="eyebrow">Báo cáo nội dung</span><h2 id="report-title">Cho chúng tôi biết vấn đề</h2><p className="dialog-target">{targetTitle}</p>
          <form className="dialog-form" onSubmit={submit}>
            <label className="form-field"><span>Lý do báo cáo <b aria-hidden="true">*</b></span><select required value={reason} onChange={(event) => setReason(event.target.value)}><option>Thông tin sai lệch</option><option>Nội dung lừa đảo</option><option>Ngôn từ không phù hợp</option><option>Vi phạm quyền riêng tư</option><option>Lý do khác</option></select></label>
            <label className="form-field"><span>Mô tả thêm <small>(không bắt buộc)</small></span><textarea rows={4} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} aria-describedby="report-description-count" placeholder="Cho biết chi tiết giúp quản trị viên xác minh nhanh hơn."/><small className="field-counter" id="report-description-count">{description.length}/500 ký tự</small></label>
            <div className="dialog-actions"><Button variant="outline" type="button" onClick={onClose} disabled={submitting}>Hủy</Button><Button icon="send" disabled={submitting}>{submitting ? "Đang gửi..." : "Gửi báo cáo"}</Button></div>
          </form>
        </>}
      </section>
    </div>
  )
}
