import { useState } from "react"
import { Link } from "react-router"
import {
  Button,
  Icon,
  RoomCard,
  SectionTitle,
} from "@/components/common/legacy"
import { useNavigate } from "react-router"
import { usePlatform } from "@/contexts/PlatformContext"

function Home() {
  const navigate = useNavigate()
  const { listings, categories, posts } = usePlatform()
  const roomTypes = categories.filter((item) => item.type === "Loại phòng" && item.status === "active").map((item) => item.name)
  const availableRooms = listings.filter((room) => room.status === "active")
  const featuredRoom = availableRooms[0]
  const latestPosts = [...posts]
    .filter((post) => post.status === "active")
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 4)
  const [location, setLocation] = useState("TP. Hồ Chí Minh")
  const [maxPrice, setMaxPrice] = useState("")
  const [areaRange, setAreaRange] = useState("all")
  const [nearbyMessage, setNearbyMessage] = useState("")

  const buildSearchUrl = (roomType?: string) => {
    const params = new URLSearchParams()
    if (location) params.set("location", location)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (areaRange !== "all") params.set("areaRange", areaRange)
    if (roomType) params.set("type", roomType)
    return `/tim-phong?${params.toString()}`
  }

  const runSearch = () => navigate(buildSearchUrl())

  const searchNearby = () => {
    setNearbyMessage("")
    if (!navigator.geolocation) {
      setNearbyMessage("Trình duyệt chưa hỗ trợ tìm phòng theo vị trí.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams()
        params.set("location", location || "TP. Hồ Chí Minh")
        params.set("lat", String(coords.latitude))
        params.set("lng", String(coords.longitude))
        navigate(`/tim-phong?${params.toString()}`)
      },
      () =>
        setNearbyMessage(
          "Chưa lấy được vị trí. Bạn có thể nhập khu vực để tìm phòng.",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }
  return (
    <main>
      <section className="hero">
        <div className="container hero-inner">
          <div className={`hero-intro-grid${featuredRoom ? " has-featured-room" : ""}`}>
            <div className="hero-copy">
              <span className="eyebrow home-hero-kicker">Tìm phòng cùng Trọ Ơi</span>
              <h1>Tìm phòng hợp túi tiền, gần nơi bạn cần.</h1>
              <p>Lọc theo khu vực, giá và diện tích. Xem ảnh cùng thông tin phòng trước khi liên hệ chủ trọ.</p>
            </div>
            {featuredRoom && (
              <Link
                className="hero-room-card"
                to={`/phong/${featuredRoom.id}`}
                aria-label={`Xem phòng ${featuredRoom.title}`}
              >
                <img src={featuredRoom.image} alt={featuredRoom.title} />
                <div className="hero-room-details">
                  <div className="hero-room-overline">
                    <span>Tin đang mở</span>
                    <span>{featuredRoom.type} · {featuredRoom.area}</span>
                  </div>
                  <h2>{featuredRoom.title}</h2>
                  <p className="hero-room-location"><Icon name="pin" size={15} />{featuredRoom.location}</p>
                  <p className="hero-room-price">{featuredRoom.price}<small> / tháng</small></p>
                </div>
              </Link>
            )}
          </div>
          <div className="search-panel">
            <div className="search-panel-tabs">
              <h2 className="search-panel-tab">Phòng cho thuê</h2>
            </div>
            <div className="hero-fields">
              <label>
                <span>Khu vực</span>
                <div>
                  <Icon name="pin" />
                  <input
                    className="hero-search-input"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    aria-label="Khu vực tìm phòng"
                  />
                </div>
              </label>
              <label>
                <span>Khoảng giá</span>
                <select
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  aria-label="Giá thuê tối đa"
                >
                  <option value="">Mọi mức giá</option>
                  <option value="3">Dưới 3 triệu</option>
                  <option value="5">Dưới 5 triệu</option>
                  <option value="7">Dưới 7 triệu</option>
                </select>
              </label>
              <label>
                <span>Diện tích</span>
                <select
                  value={areaRange}
                  onChange={(event) => setAreaRange(event.target.value)}
                  aria-label="Diện tích phòng"
                >
                  <option value="all">Tất cả diện tích</option>
                  <option value="under20">Dưới 20 m²</option>
                  <option value="20-30">20–30 m²</option>
                  <option value="30-50">Trên 30–50 m²</option>
                  <option value="over50">Trên 50 m²</option>
                </select>
              </label>
              <Button onClick={runSearch} icon="search">
                Tìm kiếm
              </Button>
            </div>
            <button className="near-me" onClick={searchNearby}>
              <Icon name="pin" size={17} /> Tìm phòng gần tôi
            </button>
            {nearbyMessage && <p className="nearby-message" role="status">{nearbyMessage}</p>}
          </div>
        </div>
      </section>

      <section className="home-browse-section">
        <div className="container quick-section">
          <div className="chips">
            {roomTypes.map((item, i) => (
              <button
                key={item}
                className="chip"
                onClick={() => navigate(buildSearchUrl(item))}
              >
                <span><Icon name={["building", "home", "users", "building", "home"][i] ?? "building"} size={17}/></span>
                {item}
              </button>
            ))}
          </div>
          <SectionTitle
            eyebrow="Tin cho thuê đang mở"
            title="Phòng bạn có thể xem"
            action="Xem tất cả"
            onAction={() => navigate("/tim-phong")}
          />
          <div className="room-grid">
            {availableRooms.slice(0, 4).map((room) => (
              <RoomCard
                key={room.title}
                room={room}
                onClick={() => navigate(`/phong/${room.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="container community-preview">
        <SectionTitle
          eyebrow="Từ diễn đàn"
          title="Kinh nghiệm thuê trọ gần đây"
          action="Vào diễn đàn"
          onAction={() => navigate("/dien-dan")}
        />
        {latestPosts.length ? <div className="story-grid">
          <Link className="featured-story" to={`/bai-viet/${latestPosts[0].id}`}>
            {latestPosts[0].image && <img src={latestPosts[0].image} alt={`Bài viết của ${latestPosts[0].name}`} />}
            <div>
              <span>Chia sẻ từ {latestPosts[0].name}</span>
              <h2>{latestPosts[0].content}</h2>
              <small>{latestPosts[0].time} · {latestPosts[0].likes} lượt thích · {latestPosts[0].commentsCount} bình luận</small>
            </div>
          </Link>
          <div className="story-list">
            {latestPosts.slice(1, 4).map((post) => (
              <Link to={`/bai-viet/${post.id}`} key={post.id}>
                <span className="story-avatar">{post.initials}</span>
                <div>
                  <span>{post.name}</span>
                  <h3>{post.content}</h3>
                  <small>{post.time} · {post.commentsCount} bình luận</small>
                </div>
              </Link>
            ))}
          </div>
        </div> : <div className="home-forum-empty"><p>Chưa có bài viết nào được đăng.</p><button onClick={() => navigate("/dien-dan")}>Mở diễn đàn <Icon name="chevron" size={16}/></button></div>}
      </section>
    </main>
  )
}

export default Home
