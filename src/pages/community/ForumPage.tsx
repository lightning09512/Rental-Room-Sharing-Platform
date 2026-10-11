import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import ReportDialog from "@/components/common/ReportDialog"
import { usePlatform, type ForumPost } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"
import { photos } from "@/mocks/content"
import { isApiMode } from "@/services/apiClient"

function PostCard({ post, onLogin }: { post: ForumPost; onLogin: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { users, togglePostLike, addComment, deleteComment, editComment, savePost, deletePost, startConversation } = usePlatform()
  const [menuOpen, setMenuOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comment, setComment] = useState("")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.content)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportedComment, setReportedComment] = useState<{ id: string; text: string } | null>(null)
  const [editingComment, setEditingComment] = useState("")
  const [commentDraft, setCommentDraft] = useState("")
  const [copied, setCopied] = useState(false)
  const isOwner = user?.id === post.authorId
  const liked = user ? post.likedBy.includes(user.id) : false
  const role = users.find((item) => item.id === post.authorId)?.role

  const submitComment = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return onLogin()
    if (!comment.trim()) return
    try {
      await addComment(post.id, user, comment.trim())
      setComment("")
      setCommentsOpen(true)
    } catch {
      // Shared API status banner explains remote failures.
    }
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim()) return
    try {
      await savePost({ ...post, content: draft.trim() })
      setEditing(false)
    } catch {
      // Keep the editor open if saving fails.
    }
  }

  const messageAuthor = async () => {
    if (!user) return onLogin()
    if (isOwner) return navigate("/tai-khoan/ho-so")
    const conversation = await startConversation({ accountId: user.id, name: post.name, avatar: post.initials, userId: post.authorId, roomId: "" })
    if (!conversation) return
    navigate(`/tin-nhan?conversation=${conversation}`)
  }

  return (
    <article className="post-card">
      <div className="post-head">
        <button className="avatar peach" aria-label={isOwner ? "Mở hồ sơ của bạn" : `Nhắn tin với ${post.name}`} onClick={messageAuthor}>{post.initials}</button>
        <div className="post-author-wrap"><div className="post-author"><strong>{post.name}</strong><span className="role-badge">{role === "landlord" ? "Chủ trọ" : "Người thuê"}</span></div><span>{post.time}</span></div>
        <div className="post-menu-wrap"><button aria-label="Tùy chọn bài viết" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><Icon name="more"/></button>{menuOpen && <div className="post-menu">{isOwner ? <><button onClick={() => { setDraft(post.content); setEditing(true); setMenuOpen(false) }}><Icon name="edit" size={16}/>Sửa bài viết</button><button onClick={() => { if (window.confirm("Xóa bài viết này?")) deletePost(post.id) }}><Icon name="trash" size={16}/>Xóa bài viết</button></> : <button onClick={() => { setReportOpen(true); setMenuOpen(false) }}><Icon name="shield" size={16}/>Báo cáo bài viết</button>}</div>}</div>
      </div>
      <p className="post-copy">{post.content}</p>
      {post.image && <img className="post-image" src={post.image} alt={`Ảnh bài viết của ${post.name}`}/>}
      <div className="reaction-count"><span>♥ <b>{post.likes}</b></span><button onClick={() => setCommentsOpen((value) => !value)}>{post.commentsCount} bình luận</button></div>
      <div className="reaction-bar"><button className={liked ? "liked" : ""} onClick={() => user ? togglePostLike(post.id, user) : onLogin()}><Icon name="thumbs"/>{liked ? "Đã thích" : "Thích"}</button><button onClick={() => setCommentsOpen((value) => !value)}><Icon name="chat"/>Bình luận</button><button onClick={async () => { await navigator.clipboard?.writeText(`${window.location.origin}/bai-viet/${post.id}`); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }}><Icon name="share"/>{copied ? "Đã sao chép" : "Chia sẻ"}</button></div>
      {commentsOpen && <div className="post-comments"><form className="comment-compose" onSubmit={submitComment}><span className="avatar">{user?.initials ?? "?"}</span><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={user ? "Viết bình luận..." : "Đăng nhập để bình luận"} onFocus={() => { if (!user) onLogin() }}/><button aria-label="Gửi bình luận"><Icon name="send"/></button></form>{post.comments.map((item) => <div className="feed-comment" key={item.id}><span className="avatar peach">{item.initials}</span><div><strong>{item.author}</strong>{editingComment === item.id ? <form className="feed-comment-edit" onSubmit={(event) => { event.preventDefault(); if (commentDraft.trim()) editComment(post.id, item.id, commentDraft.trim()); setEditingComment("") }}><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)}/><button>Lưu</button><button type="button" onClick={() => setEditingComment("")}>Hủy</button></form> : <p>{item.text}</p>}<small>{item.createdAt}</small></div>{item.authorId === user?.id ? <div className="feed-comment-actions"><button onClick={() => { setEditingComment(item.id); setCommentDraft(item.text) }}>Sửa</button><button aria-label="Xóa bình luận" onClick={() => { if (window.confirm("Xóa bình luận này?")) deleteComment(post.id, item.id) }}><Icon name="trash" size={15}/></button></div> : <button aria-label="Báo cáo bình luận" onClick={() => setReportedComment({ id: item.id, text: item.text })}><Icon name="shield" size={15}/></button>}</div>)}</div>}

      {editing && <div className="dialog-backdrop"><section className="action-dialog"><button className="dialog-close" aria-label="Đóng" onClick={() => setEditing(false)}><Icon name="close"/></button><span className="eyebrow">Bài viết của bạn</span><h2>Chỉnh sửa nội dung</h2><form className="dialog-form" onSubmit={submitEdit}><label className="form-field"><span>Nội dung</span><textarea rows={6} value={draft} onChange={(event) => setDraft(event.target.value)}/></label><div className="dialog-actions"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Hủy</Button><Button>Lưu thay đổi</Button></div></form></section></div>}
      {reportOpen && <ReportDialog targetType="Bài viết" targetId={post.id} targetTitle={post.content.slice(0, 100)} onClose={() => setReportOpen(false)}/>}
      {reportedComment && <ReportDialog targetType="Bình luận" targetId={reportedComment.id} targetTitle={reportedComment.text.slice(0, 100)} onClose={() => setReportedComment(null)}/>}
    </article>
  )
}

export default function ForumPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { posts, users, savePost, startConversation } = usePlatform()
  const [query, setQuery] = useState("")
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [image, setImage] = useState(isApiMode ? "" : photos[5])
  const [error, setError] = useState("")
  const publicPosts = useMemo(() => posts.filter((post) => post.status === "active" && (!id || post.id === id)).filter((post) => !query || `${post.content} ${post.name}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))), [posts, id, query])
  const trendingPosts = useMemo(() => [...posts].filter((post) => post.status === "active").sort((a, b) => (b.likes + b.commentsCount) - (a.likes + a.commentsCount)).slice(0, 3), [posts])
  const login = () => navigate("/dang-nhap", { state: { from: window.location.pathname } })

  const publish = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return login()
    if (!draft.trim()) { setError("Hãy viết nội dung trước khi đăng."); return }
    try {
      await savePost({ id: `post-${Date.now()}`, authorId: user.id, name: user.name, initials: user.initials, time: "Vừa xong", content: draft.trim(), image, likes: 0, likedBy: [], commentsCount: 0, comments: [], status: "active", createdAt: new Date().toISOString() })
      setDraft("")
      setComposerOpen(false)
      setError("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đăng bài viết.")
    }
  }

  return (
    <main className="page-bg forum-page">
      <div className="container forum-layout">
        <aside className="forum-left"><h3>Diễn đàn</h3><button className="active" onClick={() => navigate("/dien-dan")}><Icon name="home"/>Bảng tin</button><button onClick={() => user ? navigate("/tai-khoan/ho-so") : login()}><Icon name="users"/>Trang cá nhân</button><button onClick={() => user ? navigate("/tin-nhan") : login()}><Icon name="chat"/>Tin nhắn</button><div className="forum-banner"><Icon name="shield"/><strong>Giữ thông tin riêng tư</strong><p>Chia sẻ khu vực và tầm giá là đủ. Nếu gặp nội dung vi phạm, bạn có thể gửi báo cáo để quản trị viên xem xét.</p><button onClick={() => user ? navigate("/bao-cao-cua-toi") : login()}>Báo cáo của tôi</button></div></aside>
        <section className="feed">
          <label className="forum-search"><Icon name="search"/><input aria-label="Tìm bài viết" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bài viết trong cộng đồng"/>{query && <button onClick={() => setQuery("")}>Xóa</button>}</label>
          <div className="composer"><div><span className="avatar">{user?.initials ?? "?"}</span><button onClick={() => user ? setComposerOpen(true) : login()}>{user ? "Bạn muốn chia sẻ điều gì?" : "Đăng nhập để chia sẻ với cộng đồng"}</button></div><div><button onClick={() => user ? setComposerOpen(true) : login()}><Icon name="image"/>Thêm ảnh</button><button onClick={() => user ? setComposerOpen(true) : login()}><Icon name="edit"/>Viết bài</button></div></div>
          {composerOpen && <form className="composer-editor" onSubmit={publish}><div className="composer-editor-head"><div><span className="avatar">{user?.initials}</span><div><strong>{user?.name}</strong><small>Chia sẻ công khai</small></div></div><button type="button" aria-label="Đóng" onClick={() => setComposerOpen(false)}><Icon name="close"/></button></div><textarea autoFocus rows={5} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Bạn đang tìm phòng ở khu vực nào, tầm giá bao nhiêu? Hoặc chia sẻ kinh nghiệm thuê trọ của mình..."/><label className="form-field"><span>Ảnh minh họa (đường dẫn)</span><input value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://..."/></label>{error && <p className="form-message error">{error}</p>}<div className="composer-editor-actions"><span>Đừng đăng số giấy tờ, số điện thoại hoặc địa chỉ riêng tư.</span><Button icon="send">Đăng bài</Button></div></form>}
          {publicPosts.map((post) => <PostCard key={post.id} post={post} onLogin={login}/>)}
          {!publicPosts.length && <section className="empty-state"><span className="placeholder-icon"><Icon name="search"/></span><h2>Chưa tìm thấy bài viết</h2><p>Thử từ khóa khác hoặc viết bài mở đầu cho cuộc trò chuyện.</p>{!id && <Button onClick={() => user ? setComposerOpen(true) : login()}>Viết bài</Button>}</section>}
        </section>
        <aside className="forum-right"><div className="side-card"><div className="side-title"><h3>Bài viết được quan tâm</h3></div>{trendingPosts.map((post, index) => <Link to={`/bai-viet/${post.id}`} className="trending-post" key={post.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{post.content}</strong><small>{post.likes + post.commentsCount} lượt tương tác</small></div></Link>)}{!trendingPosts.length && <p className="forum-side-empty">Chưa có bài viết để hiển thị.</p>}</div><div className="side-card"><h3>Người thuê và chủ trọ</h3>{users.filter((item) => item.status === "active" && item.role !== "admin" && item.id !== user?.id).slice(0, 3).map((item) => <div className="member" key={item.id}><span className="avatar">{item.initials}</span><div><strong>{item.name}</strong><small>{item.role === "landlord" ? "Chủ trọ" : "Người thuê"}</small></div><button onClick={async () => { if (!user) return login(); const conversation = await startConversation({ accountId: user.id, name: item.name, avatar: item.initials, userId: item.id, roomId: "" }); if (conversation) navigate(`/tin-nhan?conversation=${conversation}`) }}>Nhắn tin</button></div>)}</div></aside>
      </div>
    </main>
  )
}
