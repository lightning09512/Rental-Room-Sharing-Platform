import { Link } from "react-router"
import { Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"

type FooterLink = { label: string; to: string }
type FooterGroup = { title: string; links?: FooterLink[]; details?: string[] }

const legalText = "© 2026 Trọ Ơi · Tiểu luận chuyên ngành của Nhóm 04"

function FooterLinks({ links }: { links: FooterLink[] }) {
  return <div className="footer-links">{links.map(({ label, to }) => <Link key={to} to={to}>{label}</Link>)}</div>
}

function FooterGroupContent({ group }: { group: FooterGroup }) {
  if (group.links) return <FooterLinks links={group.links} />
  return <div className="footer-project-info">{group.details?.map((detail) => <p key={detail}>{detail}</p>)}</div>
}

export default function SiteFooter({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { user } = useAuth()

  if (variant === "compact") {
    return <footer className="site-footer site-footer--compact">
      <div className="container footer-compact-row">
        <Link className="logo" to="/">Trọ <span>Ơi</span></Link>
        <nav className="footer-compact-links" aria-label="Điều hướng cuối trang">
          <Link to="/tim-phong">Tìm phòng</Link>
          <Link to="/dien-dan">Diễn đàn</Link>
          <Link to="/">Trang chủ</Link>
        </nav>
        <small>© 2026 Trọ Ơi · Nhóm 04</small>
      </div>
    </footer>
  }

  const accountLinks: FooterLink[] = user?.role === "landlord"
    ? [
        { label: "Đăng tin cho thuê", to: "/chu-tro/dang-tin" },
        { label: "Quản lý tin", to: "/chu-tro/quan-ly-tin" },
        { label: "Tin nhắn", to: "/tin-nhan" },
      ]
    : user?.role === "renter"
      ? [
          { label: "Tin yêu thích", to: "/yeu-thich" },
          { label: "Tin nhắn", to: "/tin-nhan" },
          { label: "Hồ sơ cá nhân", to: "/tai-khoan/ho-so" },
        ]
      : user?.role === "admin"
        ? [{ label: "Khu quản trị", to: "/admin" }]
        : [
            { label: "Đăng nhập", to: "/dang-nhap" },
            { label: "Đăng ký", to: "/dang-ky" },
          ]
  const groups: FooterGroup[] = [
    { title: "Khám phá", links: [
      { label: "Tìm phòng trọ", to: "/tim-phong" },
      { label: "Diễn đàn", to: "/dien-dan" },
    ] },
    { title: user?.role === "landlord" ? "Chủ trọ" : "Tài khoản", links: accountLinks },
    { title: "Thông tin dự án", details: [
      "Trường Đại học Sư phạm Kỹ thuật TP. Hồ Chí Minh · Khoa Đào tạo Chất lượng cao",
      "Giảng viên hướng dẫn: TS. Lê Văn Vinh",
      "Nhóm 04: Nguyễn Minh Quốc Khánh, Phạm Minh Khánh, Hoàng Thanh Tú",
    ] },
  ]

  return <footer className="site-footer">
    <div className="container">
      <div className="footer-intro">
        <div className="footer-brand">
          <Link className="logo" to="/">Trọ <span>Ơi</span></Link>
          <p>Nền tảng tìm phòng và kết nối cộng đồng người thuê trọ.</p>
        </div>
        <Link className="admin-link" to="/admin/dang-nhap">Trang quản trị</Link>
      </div>

      <div className="footer-columns desktop-footer-columns">
        {groups.map((group) => <div className="footer-column" key={group.title}>
          <h3>{group.title}</h3>
          <FooterGroupContent group={group} />
        </div>)}
      </div>

      <div className="mobile-footer-content">
        <div className="mobile-footer-accordions">
          {groups.map((group) => <details className="footer-column" key={group.title}>
            <summary>{group.title}<Icon name="down" size={18} /></summary>
            <FooterGroupContent group={group} />
          </details>)}
        </div>
      </div>

      <div className="footer-legal">{legalText}</div>
    </div>
  </footer>
}
