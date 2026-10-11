import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"

export default function ErrorPage({ code }: { code: 403 | 404 }) {
  const navigate = useNavigate()
  const forbidden = code === 403
  return (
    <main className="error-page">
      <section>
        <span className="error-code">{code}</span>
        <span className="error-icon">
          <Icon name={forbidden ? "shield" : "search"} size={30} />
        </span>
        <h1>
          {forbidden ? "Bạn không có quyền truy cập" : "Không tìm thấy trang"}
        </h1>
        <p>
          {forbidden
            ? "Tài khoản hiện tại không được phép mở nội dung này. Hãy đăng nhập bằng đúng vai trò hoặc quay lại trang trước."
            : "Đường dẫn có thể đã thay đổi hoặc nội dung không còn tồn tại."}
        </p>
        <div>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Về trang chủ
          </Button>
        </div>
      </section>
    </main>
  )
}
