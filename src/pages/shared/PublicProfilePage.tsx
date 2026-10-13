import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import useAuth from "@/hooks/useAuth"
import { usePlatform, type PlatformUser } from "@/contexts/PlatformContext"
import { apiRequest, isApiMode } from "@/services/apiClient"

type ProfileLoadState = "loading" | "ready" | "unavailable" | "error"
type PublicProfile = Pick<PlatformUser, "id" | "name" | "role" | "status" | "initials">

const roleName = (role: PlatformUser["role"]) => role === "landlord" ? "Chủ trọ" : "Người thuê"

export default function PublicProfilePage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { users, posts, listings, startConversation } = usePlatform()
  const [remoteProfile, setRemoteProfile] = useState<PublicProfile | null>(null)
  const [loadState, setLoadState] = useState<ProfileLoadState>(isApiMode ? "loading" : "ready")
  const [retryKey, setRetryKey] = useState(0)
  const [messageError, setMessageError] = useState("")

  useEffect(() => {
    if (!id) return
    if (user?.id === id) {
      navigate(user.role === "admin" ? "/admin/ho-so" : "/tai-khoan/ho-so", { replace: true })
      return
    }
    if (!isApiMode) {
      setLoadState("ready")
      return
    }

    let active = true
    setLoadState("loading")
    setRemoteProfile(null)
    apiRequest<{ item: PublicProfile }>(`members/${encodeURIComponent(id)}`)
      .then(({ item }) => {
        if (!active) return
        setRemoteProfile(item)
        setLoadState("ready")
      })
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : ""
        setLoadState(message.includes("(404)") || message.includes("không tồn tại") || message.includes("không còn hoạt động") ? "unavailable" : "error")
      })
    return () => { active = false }
  }, [id, user?.id, user?.role, navigate, retryKey])

  const profile = isApiMode ? remoteProfile : users.find((item) => item.id === id) ?? null
  const publicPosts = useMemo(
    () => posts.filter((post) => post.authorId === id && post.status === "active"),
    [posts, id],
  )
  const publicListings = useMemo(
    () => listings.filter((listing) => listing.ownerId === id && listing.status === "active"),
    [listings, id],
  )

  const openMessage = async () => {
    if (!profile) return
    if (!user) {
      navigate("/dang-nhap", { state: { from: `/nguoi-dung/${id}` } })
      return
    }
    setMessageError("")
    try {
      const conversation = await startConversation({
        accountId: user.id,
        name: profile.name,
        avatar: profile.initials,
        userId: profile.id,
        roomId: publicListings[0]?.id ?? "",
      })
      if (conversation) navigate(`/tin-nhan?conversation=${conversation}`)
      else setMessageError("Chưa thể mở cuộc trò chuyện. Vui lòng thử lại.")
    } catch {
      setMessageError("Chưa thể mở cuộc trò chuyện. Vui lòng thử lại.")
    }
  }

  if (loadState === "loading") return (
    <main className="page-bg public-profile-page">
      <div className="container"><section className="public-profile-state" role="status">Đang tải hồ sơ…</section></div>
    </main>
  )

  if (loadState === "error") return (
    <main className="page-bg public-profile-page">
      <div className="container"><section className="public-profile-state">
        <span className="placeholder-icon"><Icon name="users"/></span>
        <h1>Không tải được hồ sơ</h1>
        <p>Đã xảy ra lỗi khi kết nối. Hãy thử tải lại hồ sơ.</p>
        <div><Button onClick={() => setRetryKey((value) => value + 1)}>Thử lại</Button><Button variant="outline" onClick={() => navigate(-1)}>Quay lại</Button></div>
      </section></div>
    </main>
  )

  if (loadState === "unavailable" || !profile || profile.status !== "active" || profile.role === "admin") return (
    <main className="page-bg public-profile-page">
      <div className="container"><section className="public-profile-state">
        <span className="placeholder-icon"><Icon name="users"/></span>
        <h1>Hồ sơ không khả dụng</h1>
        <p>Hồ sơ này không tồn tại hoặc tài khoản không còn hoạt động.</p>
        <div><Button onClick={() => navigate(-1)}>Quay lại</Button><Button variant="outline" onClick={() => navigate("/dien-dan")}>Về diễn đàn</Button></div>
      </section></div>
    </main>
  )

  return (
    <main className="page-bg public-profile-page">
      <div className="container public-profile-layout">
        <section className="public-profile-card">
          <Link className="public-profile-back" to="/dien-dan"><Icon name="chevron" size={16}/>Quay lại diễn đàn</Link>
          <div className="public-profile-heading">
            <span className="avatar xlarge">{profile.initials}</span>
            <div className="public-profile-name">
              <span className="eyebrow">Hồ sơ công khai</span>
              <h1>{profile.name}</h1>
              <span className="role-badge">{roleName(profile.role)}</span>
            </div>
            {user?.role !== "admin" && <Button icon="chat" onClick={openMessage}>Nhắn tin</Button>}
          </div>
          {messageError && <p className="form-message error" role="alert">{messageError}</p>}
          <p className="public-profile-note">Chỉ hiển thị thông tin và nội dung mà thành viên đã chia sẻ công khai.</p>
        </section>

        {profile.role === "landlord" && <section className="public-profile-section">
          <div className="public-profile-section-heading"><div><span className="eyebrow">Tin đang hiển thị</span><h2>Phòng cho thuê</h2></div><span>{publicListings.length}</span></div>
          {publicListings.length ? <div className="public-profile-listings">{publicListings.map((listing) => (
            <Link to={`/phong/${listing.id}`} className="public-profile-listing" key={listing.id}>
              <img src={listing.image} alt={listing.title}/>
              <div><strong>{listing.title}</strong><span>{listing.price}/tháng · {listing.area}</span><small><Icon name="pin" size={14}/>{listing.location}</small></div>
              <Icon name="chevron" size={18}/>
            </Link>
          ))}</div> : <p className="public-profile-empty">Hiện chưa có tin cho thuê đang hiển thị.</p>}
        </section>}

        <section className="public-profile-section">
          <div className="public-profile-section-heading"><div><span className="eyebrow">Chia sẻ trong cộng đồng</span><h2>Bài viết công khai</h2></div><span>{publicPosts.length}</span></div>
          {publicPosts.length ? <div className="public-profile-posts">{publicPosts.map((post) => (
            <Link to={`/bai-viet/${post.id}`} className="public-profile-post" key={post.id}>
              <span>{post.time}</span><p>{post.content}</p>
              {post.image && <img src={post.image} alt="Ảnh trong bài viết"/>}
              <small>{post.likes} lượt thích · {post.commentsCount} bình luận</small>
            </Link>
          ))}</div> : <p className="public-profile-empty">Thành viên chưa có bài viết công khai.</p>}
        </section>
      </div>
    </main>
  )
}
