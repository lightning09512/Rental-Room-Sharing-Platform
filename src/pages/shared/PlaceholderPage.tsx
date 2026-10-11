import { useNavigate } from "react-router"
import { Button, Icon } from "@/components/common/legacy"

export default function PlaceholderPage({
  eyebrow = "Trọ Ơi",
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description: string
}) {
  const navigate = useNavigate()
  return (
    <main className="page-bg placeholder-page">
      <section className="placeholder-card">
        <span className="placeholder-icon">
          <Icon name="building" size={28} />
        </span>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
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
