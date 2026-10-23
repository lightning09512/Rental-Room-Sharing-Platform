import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams, useNavigate, Link } from "react-router"
import { Button, Icon } from "@/components/common/legacy"
import { usePlatform } from "@/contexts/PlatformContext"
import useAuth from "@/hooks/useAuth"
import { io } from "socket.io-client"
import { getAccessToken, isApiMode } from "@/services/apiClient"

export default function MessagesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const { messages, listings, transfers, users, sendMessage, startConversation, markConversationRead, toggleConversationMute, refreshMessages } = usePlatform()
  const [search, setSearch] = useState("")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [mobileChat, setMobileChat] = useState(false)
  const [message, setMessage] = useState("")
  const [messageError, setMessageError] = useState("")
  const [selectContact, setSelectContact] = useState(false)
  const [contactError, setContactError] = useState("")
  const [startingContactId, setStartingContactId] = useState<string | null>(null)
  const selectedId = params.get("conversation") ?? ""
  const accountMessages = useMemo(() => messages.filter((item) => item.accountId === user?.id), [messages, user?.id])
  const visible = useMemo(() => accountMessages.filter((item) => (!search || `${item.name} ${item.text} ${item.relatedTransfer?.title ?? ""}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))) && (!onlyUnread || item.unread)), [accountMessages, search, onlyUnread])
  const selected = accountMessages.find((item) => item.id === selectedId) ?? visible[0]
  const relatedRoom = listings.find((item) => item.id === selected?.roomId)
  const relatedTransfer = transfers.find((item) => item.id === selected?.transferId) ?? selected?.relatedTransfer
  const selectedContact = users.find((item) => item.id === selected?.userId)
  const availableContacts = users.filter((item) => item.status === "active" && item.id !== user?.id && item.role !== "admin")

  useEffect(() => {
    if (!selected || selected.id === selectedId) return
    setParams((current) => ({ ...Object.fromEntries(current), conversation: selected.id }), { replace: true })
  }, [selected?.id, selectedId, setParams])

  useEffect(() => {
    if (selected && user) markConversationRead(selected.id, user.id)
  }, [selected?.id, user?.id])

  useEffect(() => {
    const token = getAccessToken()
    if (!isApiMode || !token || !selected?.id) return
    const socket = io({ auth: { token }, transports: ["websocket", "polling"] })
    const join = () => socket.emit("conversation:join", selected.id)
    socket.on("connect", join)
    socket.on("message:new", () => { void refreshMessages() })
    if (socket.connected) join()
    return () => {
      socket.emit("conversation:leave", selected.id)
      socket.disconnect()
    }
  }, [selected?.id, refreshMessages])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !user || !message.trim()) return
    setMessageError("")
    try {
      await sendMessage(selected.id, user.id, message.trim())
      setMessage("")
      setMobileChat(true)
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Không gửi được tin nhắn.")
    }
  }
  const startChat = async (contact: { name: string; initials: string; id: string; roomId: string }) => {
    setStartingContactId(contact.id)
    setContactError("")
    try {
      const conversation = await startConversation({ accountId: user?.id ?? "", name: contact.name, avatar: contact.initials, userId: contact.id, roomId: contact.roomId })
      if (!conversation) return
      setParams({ conversation })
      setSelectContact(false)
      setMobileChat(true)
    } catch (error) {
      setContactError(error instanceof Error ? error.message : "Không thể mở cuộc trò chuyện. Vui lòng thử lại.")
    } finally {
      setStartingContactId(null)
    }
  }

  return <main className="messages-page"><div className={selected ? "container messenger" : "container messenger is-empty"}>
    <aside className={mobileChat ? "conversation-list hidden-mobile" : "conversation-list"}>
      <div className="message-title"><div><span className="eyebrow">Trao đổi trực tiếp</span><h1>Tin nhắn</h1></div><button aria-label="Bắt đầu cuộc trò chuyện" onClick={() => setSelectContact(true)}><Icon name="plus"/></button></div>
      <label className="message-search"><Icon name="search"/><input className="message-search-field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cuộc trò chuyện"/><button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearch("")}>{search ? "×" : ""}</button></label>
      <div className="message-tabs"><button className={!onlyUnread ? "active" : ""} onClick={() => setOnlyUnread(false)}>Tất cả</button><button className={onlyUnread ? "active" : ""} onClick={() => setOnlyUnread(true)}>Chưa đọc</button></div>
      {visible.map((item) => <button className={selected?.id === item.id ? "conversation active" : "conversation"} key={item.id} onClick={() => { setParams({ conversation: item.id }); setMobileChat(true) }}><span className="avatar">{item.avatar}{item.active && <i/>}</span><div><strong>{item.name}</strong>{item.relatedTransfer && <small className="contact-room-title">Tin sang nhượng: {item.relatedTransfer.title}</small>}<span>{item.text}</span></div><small>{item.time}</small>{item.unread && <i className="message-unread-dot"/>}</button>)}
      {visible.length > 0 && accountMessages.length <= 2 && !search && !onlyUnread && <div className="mx-2 mt-5 rounded-xl border border-line bg-page p-4"><strong className="block text-sm text-ink">Tiếp tục tìm phòng</strong><p className="mt-1 text-sm leading-relaxed text-muted">Mở tin cho thuê để hỏi thêm về phòng và hẹn lịch xem.</p><Link to="/tim-phong" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Xem tin cho thuê <Icon name="chevron" size={16}/></Link></div>}
      {!visible.length && <div className="conversation-empty"><strong>{onlyUnread ? "Không có tin nhắn chưa đọc" : search ? "Không tìm thấy cuộc trò chuyện" : "Chưa có cuộc trò chuyện"}</strong><p>{onlyUnread ? "Các cuộc trò chuyện mới sẽ xuất hiện ở đây." : search ? "Thử tìm bằng tên người liên hệ hoặc nội dung tin nhắn." : "Chọn một người để bắt đầu trao đổi về phòng trọ."}</p>{!onlyUnread && !search && <Button onClick={() => setSelectContact(true)}>Bắt đầu trò chuyện</Button>}</div>}
    </aside>
    {selected ? <section className={mobileChat ? "chat-window open-mobile" : "chat-window"}>
      <div className="chat-head"><button className="back-chat" aria-label="Quay lại danh sách" onClick={() => setMobileChat(false)}>‹</button><Link className="avatar profile-avatar-link" to={`/nguoi-dung/${selected.userId}`} aria-label={`Xem hồ sơ ${selected.name}`}>{selected.avatar}{selected.active && <i/>}</Link><Link className="chat-contact" to={`/nguoi-dung/${selected.userId}`}><strong>{selected.name}</strong><span>{selected.active ? "Đang hoạt động" : "Có thể trả lời sau"}</span></Link><div className="chat-head-actions">{relatedTransfer && <button className="chat-listing-action" type="button" aria-label="Xem tin chuyển nhượng" onClick={() => navigate(`/chuyen-nhuong/${relatedTransfer.id}`)}><Icon name="building" size={17}/><span>Xem tin sang nhượng</span></button>}{relatedRoom && <button className="chat-listing-action" type="button" aria-label="Xem tin phòng" onClick={() => navigate(`/phong/${relatedRoom.id}`)}><Icon name="building" size={17}/><span>Xem tin phòng</span></button>}<button className={selected.muted ? "chat-mute muted" : "chat-mute"} aria-label={selected.muted ? "Bật thông báo cuộc trò chuyện" : "Tắt thông báo cuộc trò chuyện"} aria-pressed={Boolean(selected.muted)} onClick={() => toggleConversationMute(selected.id, user?.id ?? "")}><Icon name="bell"/></button></div></div>
      <div className="chat-body">{relatedTransfer && <button className="chat-room-card" onClick={() => navigate(`/chuyen-nhuong/${relatedTransfer.id}`)}><img src={relatedTransfer.image} alt={relatedTransfer.title}/><div><small>Bạn đang trao đổi về tin chuyển nhượng</small><strong>{relatedTransfer.title}</strong><span><b>{relatedTransfer.price}/tháng</b><i>·</i>{relatedTransfer.location}</span></div><Icon name="chevron" size={17}/></button>}{relatedRoom && <button className="chat-room-card" onClick={() => navigate(`/phong/${relatedRoom.id}`)}><img src={relatedRoom.image} alt={relatedRoom.title}/><div><small>Bạn đang hỏi về phòng</small><strong>{relatedRoom.title}</strong><span><b>{relatedRoom.price}/tháng</b><i>·</i>{relatedRoom.location}</span></div><Icon name="chevron" size={17}/></button>}<div className={selected.messages.length ? "chat-history" : "chat-history empty"}>{selected.messages.length ? <><span className="chat-date">Tin nhắn gần đây</span>{selected.messages.map((item) => <div className={item.from === "me" ? "bubble sent" : "bubble received"} key={item.id}><span>{item.text}</span><time className="bubble-time">{item.time}</time></div>)}</> : <div className="chat-first-message"><span className="placeholder-icon"><Icon name="chat"/></span><strong>Chưa có tin nhắn</strong><p>Gửi câu hỏi để bắt đầu trao đổi{relatedTransfer ? " về tin chuyển nhượng này." : relatedRoom ? " về phòng này." : "."}</p></div>}</div></div>
      <div className="chat-composer">{messageError && <p className="form-message error" role="alert">{messageError}</p>}{!message.trim() && <div className="chat-quick-actions" aria-label="Gợi ý tin nhắn">{(relatedRoom ? ["Phòng còn trống không?", "Hẹn xem phòng", "Chi phí hàng tháng gồm những gì?"] : ["Chào bạn!", "Bạn có thể trao đổi thêm không?"]).map((reply) => <button type="button" key={reply} onClick={() => setMessage(reply)}>{reply}</button>)}</div>}<form className="chat-input" onSubmit={submit}><button className="chat-emoji-btn" type="button" aria-label="Chèn biểu tượng cảm xúc" onClick={() => setMessage((value) => `${value}🙂`)}>☺</button><div className="chat-text-entry"><input id="message-entry" aria-label="Viết tin nhắn" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Viết tin nhắn..."/></div><button className="send-btn" aria-label="Gửi tin nhắn" disabled={!message.trim()}><Icon name="send"/></button></form></div>
    </section> : <section className="chat-window chat-empty"><span className="placeholder-icon"><Icon name="chat"/></span><h2>Tin nhắn của bạn</h2><p>Hỏi thêm về giá, tiện ích hoặc hẹn xem phòng với người đăng tin.</p><Button onClick={() => setSelectContact(true)}>Bắt đầu trò chuyện</Button></section>}
    {selected && <aside className="chat-details"><Link className="chat-profile-summary" to={`/nguoi-dung/${selected.userId}`} aria-label={`Mở hồ sơ ${selected.name}`}><span className="avatar xlarge">{selected.avatar}</span><h3>{selected.name}</h3><p>{selectedContact?.role === "landlord" ? "Chủ trọ" : selectedContact?.role === "renter" ? "Người thuê" : "Thành viên Trọ Ơi"}</p></Link><Link className="chat-profile-link" to={`/nguoi-dung/${selected.userId}`}>Xem hồ sơ</Link><div><button className={selected.muted ? "muted" : ""} onClick={() => toggleConversationMute(selected.id, user?.id ?? "")}><Icon name="bell"/><span>{selected.muted ? "Bật thông báo" : "Tắt thông báo"}</span></button></div><hr/>{relatedTransfer && <><button className="detail-row" onClick={() => navigate(`/chuyen-nhuong/${relatedTransfer.id}`)}>Tin chuyển nhượng <Icon name="chevron" size={15}/></button><button className="tiny-room" onClick={() => navigate(`/chuyen-nhuong/${relatedTransfer.id}`)}><img src={relatedTransfer.image} alt=""/><span><strong>{relatedTransfer.title}</strong><small>{relatedTransfer.price}/tháng · phí {relatedTransfer.transferFee}</small><small>{relatedTransfer.location}</small></span></button><button className="detail-row" onClick={() => navigate(`/chuyen-nhuong/${relatedTransfer.id}`)}>Mở tin chuyển nhượng <Icon name="chevron" size={15}/></button></>}{relatedRoom && <><button className="detail-row" onClick={() => navigate(`/phong/${relatedRoom.id}`)}>Thông tin phòng <Icon name="chevron" size={15}/></button><button className="tiny-room" onClick={() => navigate(`/phong/${relatedRoom.id}`)}><img src={relatedRoom.image} alt=""/><span><strong>{relatedRoom.title}</strong><small>{relatedRoom.price}/tháng</small><small>{relatedRoom.location}</small></span></button><button className="detail-row" onClick={() => navigate(`/phong/${relatedRoom.id}`)}>Mở tin phòng <Icon name="chevron" size={15}/></button></>}</aside>}
    {selectContact && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectContact(false) }}><section className="action-dialog contact-picker" role="dialog" aria-modal="true" aria-labelledby="contact-picker-title"><button className="dialog-close" onClick={() => setSelectContact(false)} aria-label="Đóng"><Icon name="close"/></button><span className="eyebrow">Tin nhắn mới</span><h2 id="contact-picker-title">Chọn người để liên hệ</h2><p className="contact-picker-intro">Chọn người đăng tin hoặc thành viên để bắt đầu trao đổi.</p>{contactError && <p className="form-message error" role="alert">{contactError}</p>}{availableContacts.length ? availableContacts.map((item) => { const room = listings.find((listing) => listing.ownerId === item.id && listing.status === "active"); const role = item.role === "landlord" ? "Chủ trọ" : "Người thuê"; return <button className="contact-picker-row" key={item.id} disabled={startingContactId === item.id} onClick={() => startChat({ name: item.name, initials: item.initials, id: item.id, roomId: room?.id ?? "" })}><span className="avatar">{item.initials}</span><span><strong>{item.name}</strong><small>{role}</small>{room && <small className="contact-room-title">Tin đang mở: {room.title}</small>}</span><Icon name="chevron" size={17}/></button>}) : <p className="contact-picker-empty">Hiện chưa có thành viên phù hợp để bắt đầu cuộc trò chuyện.</p>}</section></div>}
  </div></main>
}
