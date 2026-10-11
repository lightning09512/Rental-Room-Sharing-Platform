import type { ReactNode } from "react"
import { NavLink } from "react-router"
import { photos } from "@/mocks/content"
import { Icon } from "@/components/common/legacy"

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <NavLink className="logo auth-logo" to="/">
          Trọ <span>Ơi</span>
        </NavLink>
        <div className="auth-heading">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </section>
      <aside className="auth-aside">
        <img className="auth-scene" src={photos[2]} alt="Phòng trọ có ánh sáng tự nhiên" />
        <div>
          <span className="auth-kicker">Trọ Ơi · TP. Hồ Chí Minh</span>
          <h2>
            Tìm một nơi ở,
            <br />
            rồi an tâm bắt đầu.
          </h2>
          <p>
            So sánh thông tin phòng, lưu lựa chọn phù hợp và trao đổi trực tiếp với người đăng.
          </p>
          <div className="auth-proof">
            <span><Icon name="check" size={17}/>Thông tin tin đăng rõ ràng</span>
            <span><Icon name="check" size={17}/>Trao đổi trong một nơi</span>
            <span><Icon name="check" size={17}/>Chia sẻ kinh nghiệm thuê trọ</span>
          </div>
        </div>
      </aside>
    </main>
  )
}
