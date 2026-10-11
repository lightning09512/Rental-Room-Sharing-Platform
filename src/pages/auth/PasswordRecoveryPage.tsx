import { useState, type FormEvent } from "react"
import { NavLink, useNavigate, useSearchParams } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import AuthShell from "@/pages/auth/AuthShell"
import { authService } from "@/services/authService"
import { isApiMode } from "@/services/apiClient"

export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState(params.get("identifier") ?? "")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [demoCode, setDemoCode] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    if (!reset) {
      if (!identifier.trim()) { setError("Nhập email hoặc số điện thoại đã đăng ký."); return }
      setStatus("loading")
      try {
        const sentCode = await authService.requestPasswordReset(identifier)
        setDemoCode(sentCode)
        navigate(`/dat-lai-mat-khau?identifier=${encodeURIComponent(identifier.trim())}`)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Không thể gửi hướng dẫn khôi phục.")
      } finally { setStatus("idle") }
      return
    }
    if (code.length !== 6 || password.length < 8 || password !== confirm) {
      setError("Nhập mã 6 chữ số và mật khẩu mới tối thiểu 8 ký tự, khớp xác nhận.")
      return
    }
    setStatus("loading")
    try {
      await authService.resetPassword(identifier, code, password)
      setStatus("success")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đặt lại mật khẩu.")
      setStatus("idle")
    }
  }

  return <AuthShell eyebrow="Khôi phục tài khoản" title={reset ? "Tạo mật khẩu mới" : "Khôi phục mật khẩu"} description={reset ? "Nhập mã xác nhận đã gửi để đặt lại mật khẩu của bạn." : "Nhập email hoặc số điện thoại để nhận mã xác nhận."}>
    <form className="auth-form" onSubmit={submit} noValidate>
      {!reset ? <label className="form-field"><span>Email hoặc số điện thoại <b>*</b></span><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Thông tin đã đăng ký"/><small>{isApiMode ? "Mã xác nhận sẽ được gửi tới email đã đăng ký." : "Trong bản demo, mã xác nhận sẽ hiển thị ở bước tiếp theo."}</small></label> : <>
        <label className="form-field"><span>Email hoặc số điện thoại</span><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required/></label>
        <label className="form-field"><span>Mã xác nhận <b>*</b></span><input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6 chữ số"/>{!isApiMode && (demoCode ? <small>Mã demo: {demoCode}</small> : <small>Mã demo: 123456</small>)}</label>
        <label className="form-field"><span>Mật khẩu mới <b>*</b></span><div className="password-input"><input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ít nhất 8 ký tự"/><button type="button" onClick={() => setShow((current) => !current)} aria-label="Hiện hoặc ẩn mật khẩu"><Icon name="eye" size={18}/></button></div></label>
        <label className="form-field"><span>Xác nhận mật khẩu <b>*</b></span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Nhập lại mật khẩu mới"/></label>
      </>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {status === "success" && <p className="form-message success" role="status">Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.</p>}
      {status !== "success" && <Button icon="check">{status === "loading" ? "Đang xử lý..." : reset ? "Xác nhận mật khẩu mới" : "Gửi mã xác nhận"}</Button>}
      <p className="auth-switch"><NavLink to="/dang-nhap">Quay lại đăng nhập</NavLink></p>
    </form>
  </AuthShell>
}
