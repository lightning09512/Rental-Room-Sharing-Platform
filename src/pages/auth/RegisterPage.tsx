import { useState, type FormEvent } from "react"
import { NavLink, useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import AuthShell from "@/pages/auth/AuthShell"
import useAuth from "@/hooks/useAuth"
import type { UserRole } from "@/types/auth"

export default function RegisterPage() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  })
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("renter")
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()
  const update = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    if (Object.values(values).some((value) => !value.trim()))
      return setError("Vui lòng điền đầy đủ các trường bắt buộc.")
    if (!/^\S+@\S+\.\S+$/.test(values.email))
      return setError("Email chưa đúng định dạng.")
    if (values.password.length < 8)
      return setError("Mật khẩu phải có ít nhất 8 ký tự.")
    if (values.password !== values.confirm)
      return setError("Mật khẩu xác nhận chưa khớp.")
    if (!agreed) return setError("Bạn cần đồng ý với điều khoản sử dụng.")
    setLoading(true)
    try {
      await register({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role,
      })
      navigate(role === "landlord" ? "/chu-tro/thong-ke" : "/")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo tài khoản. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }
  return (
    <AuthShell
      eyebrow="Tham gia Trọ Ơi"
      title="Tạo tài khoản"
      description="Chọn vai trò phù hợp để bắt đầu sử dụng nền tảng."
    >
      <form className="auth-form auth-form-grid" onSubmit={submit} noValidate>
        <fieldset className="role-picker full-field">
          <legend>
            Bạn sử dụng Trọ Ơi với vai trò <span>*</span>
          </legend>
          <label>
            <input
              type="radio"
              name="role"
              checked={role === "renter"}
              onChange={() => setRole("renter")}
            />{" "}
            Người thuê
          </label>
          <label>
            <input
              type="radio"
              name="role"
              checked={role === "landlord"}
              onChange={() => setRole("landlord")}
            />{" "}
            Chủ trọ
          </label>
        </fieldset>
        <label className="form-field full-field">
          <span>
            Họ và tên <b>*</b>
          </span>
          <input
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Nguyễn Minh Anh"
            autoComplete="name"
          />
        </label>
        <label className="form-field">
          <span>
            Email <b>*</b>
          </span>
          <input
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="vidu@email.com"
            autoComplete="email"
          />
        </label>
        <label className="form-field">
          <span>
            Số điện thoại <b>*</b>
          </span>
          <input
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="09xx xxx xxx"
            autoComplete="tel"
          />
        </label>
        <label className="form-field">
          <span>
            Mật khẩu <b>*</b>
          </span>
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="Ít nhất 8 ký tự"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((show) => !show)}
              aria-label="Hiện hoặc ẩn mật khẩu"
            >
              <Icon name="eye" size={18} />
            </button>
          </div>
          <small>Nên gồm chữ hoa, chữ thường và chữ số.</small>
        </label>
        <label className="form-field">
          <span>
            Xác nhận mật khẩu <b>*</b>
          </span>
          <input
            type="password"
            value={values.confirm}
            onChange={(event) => update("confirm", event.target.value)}
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
          />
        </label>
        <label className="inline-check full-field">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />{" "}
          Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật.
        </label>
        {error && (
          <p className="form-message error full-field" role="alert">
            {error}
          </p>
        )}
        <div className="full-field">
          <Button>{loading ? "Đang tạo tài khoản..." : "Đăng ký"}</Button>
        </div>
        <p className="auth-switch full-field">
          Đã có tài khoản? <NavLink to="/dang-nhap">Đăng nhập</NavLink>
        </p>
      </form>
    </AuthShell>
  )
}
