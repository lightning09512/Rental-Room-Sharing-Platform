import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { Button, Icon, RoomCard } from "@/components/common/legacy"
import { usePlatform, type RentalListing } from "@/contexts/PlatformContext"
import type { ChangeEvent } from "react"
import { useNavigate } from "react-router"
import { apiRequest, isApiMode } from "@/services/apiClient"

const RoomMap = lazy(() => import("@/components/maps/RoomMap"))

type SearchFilters = {
  location: string
  minPrice: string
  maxPrice: string
  areaRange: string
  roomType: string
  amenities: string[]
}

const defaultFilters: SearchFilters = {
  location: "TP. Hồ Chí Minh",
  minPrice: "",
  maxPrice: "",
  areaRange: "all",
  roomType: "all",
  amenities: [],
}

function readFilters(params: URLSearchParams): SearchFilters {
  return {
    location: params.get("location") ?? defaultFilters.location,
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    areaRange: params.get("areaRange") ?? "all",
    roomType: params.get("type") ?? "all",
    amenities: params.get("amenities")?.split(",").filter(Boolean) ?? [],
  }
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim()
}

function matchesArea(area: number, range: string) {
  if (range === "under20") return area < 20
  if (range === "20-30") return area >= 20 && area <= 30
  if (range === "30-50") return area > 30 && area <= 50
  if (range === "over50") return area > 50
  return true
}

function distanceInKm(lat1: number, lng1: number, lat2?: number, lng2?: number) {
  if (typeof lat2 !== "number" || typeof lng2 !== "number" || ![lat1, lng1, lat2, lng2].every((value) => Number.isFinite(value))) return Number.POSITIVE_INFINITY
  const toRadians = (value: number) => (value * Math.PI) / 180
  const latitudeDelta = toRadians(lat2 - lat1)
  const longitudeDelta = toRadians(lng2 - lng1)
  const arc =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc))
}

function Filters({
  filters,
  onChange,
  onApply,
  onReset,
  roomTypes,
  amenities,
}: {
  filters: SearchFilters
  onChange: (next: Partial<SearchFilters>) => void
  onApply: () => void
  onReset: () => void
  roomTypes: string[]
  amenities: string[]
}) {
  const updatePrice =
    (key: "minPrice" | "maxPrice") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ [key]: event.target.value })
    }

  const toggleAmenity = (amenity: string, checked: boolean) => {
    const next = checked
      ? [...filters.amenities, amenity]
      : filters.amenities.filter((value) => value !== amenity)
    onChange({ amenities: next })
  }

  return (
    <aside className="filters">
      <div className="filter-head">
        <h3>Bộ lọc tìm kiếm</h3>
        <button type="button" onClick={onReset}>
          Đặt lại
        </button>
      </div>
      <div className="filter-group">
        <label htmlFor="filter-location">Khu vực</label>
        <div className="input-box filter-text-input">
          <Icon name="pin" size={17} />
          <input
            id="filter-location"
            value={filters.location}
            onChange={(event) => onChange({ location: event.target.value })}
            placeholder="Nhập quận hoặc khu vực"
          />
        </div>
      </div>
      <div className="filter-group">
        <label>Khoảng giá (triệu đồng/tháng)</label>
        <div className="price-range-fields">
          <input
            type="number"
            min="0"
            step="0.5"
            value={filters.minPrice}
            onChange={updatePrice("minPrice")}
            aria-label="Giá thấp nhất, triệu đồng"
            placeholder="Từ"
          />
          <span>đến</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={filters.maxPrice}
            onChange={updatePrice("maxPrice")}
            aria-label="Giá cao nhất, triệu đồng"
            placeholder="Đến"
          />
        </div>
      </div>
      <div className="filter-group">
        <label htmlFor="filter-area">Diện tích</label>
        <select
          id="filter-area"
          className="filter-select"
          value={filters.areaRange}
          onChange={(event) => onChange({ areaRange: event.target.value })}
        >
          <option value="all">Tất cả diện tích</option>
          <option value="under20">Dưới 20 m²</option>
          <option value="20-30">20–30 m²</option>
          <option value="30-50">Trên 30–50 m²</option>
          <option value="over50">Trên 50 m²</option>
        </select>
      </div>
      <div className="filter-group">
        <label htmlFor="filter-type">Loại phòng</label>
        <select
          id="filter-type"
          className="filter-select"
          value={filters.roomType}
          onChange={(event) => onChange({ roomType: event.target.value })}
        >
          <option value="all">Tất cả loại phòng</option>
          {roomTypes.map((type) => <option value={type} key={type}>{type}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Tiện ích</label>
        {amenities.map((amenity) => (
          <label className="check" key={amenity}>
            <input
              type="checkbox"
              checked={filters.amenities.includes(amenity)}
              onChange={(event) => toggleAmenity(amenity, event.target.checked)}
            />
            <span>{amenity}</span>
          </label>
        ))}
      </div>
      <Button onClick={onApply}>Áp dụng bộ lọc</Button>
    </aside>
  )
}

export default function SearchPage() {
  const { listings, categories } = usePlatform()
  const roomTypes = categories.filter((item) => item.type === "Loại phòng" && item.status === "active").map((item) => item.name)
  const amenities = categories.filter((item) => item.type === "Tiện ích" && item.status === "active").map((item) => item.name)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const initialFilters = readFilters(searchParams)
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest")
  const [map, setMap] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [remoteRooms, setRemoteRooms] = useState<RentalListing[]>([])
  const [remoteTotal, setRemoteTotal] = useState(0)
  const [remotePage, setRemotePage] = useState(1)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const latitude = Number(searchParams.get("lat"))
  const longitude = Number(searchParams.get("lng"))
  const isNearSearch =
    searchParams.has("lat") &&
    searchParams.has("lng") &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

  useEffect(() => {
    if (!isApiMode) return
    let current = true
    const params = new URLSearchParams({ page: String(remotePage), limit: "24" })
    const normalizedLocation = normalize(appliedFilters.location)
    const citySearch = /ho chi minh|hcm|sai gon/.test(normalizedLocation)
    if (appliedFilters.location && !citySearch) params.set("location", appliedFilters.location)
    if (appliedFilters.minPrice) params.set("minPrice", appliedFilters.minPrice)
    if (appliedFilters.maxPrice) params.set("maxPrice", appliedFilters.maxPrice)
    if (appliedFilters.roomType !== "all") params.set("type", appliedFilters.roomType)
    if (appliedFilters.amenities.length) params.set("amenities", appliedFilters.amenities.join(","))
    if (appliedFilters.areaRange === "under20") params.set("maxArea", "19.99")
    if (appliedFilters.areaRange === "20-30") { params.set("minArea", "20"); params.set("maxArea", "30") }
    if (appliedFilters.areaRange === "30-50") { params.set("minArea", "30.01"); params.set("maxArea", "50") }
    if (appliedFilters.areaRange === "over50") params.set("minArea", "50.01")
    if (isNearSearch) { params.set("lat", String(latitude)); params.set("lng", String(longitude)); params.set("radiusKm", "20") }
    params.set("sort", isNearSearch ? "nearby" : sort === "price-low" ? "price_asc" : sort === "price-high" ? "price_desc" : "newest")
    setLoadingRooms(true)
    if (remotePage === 1) { setRemoteRooms([]); setRemoteTotal(0) }
    apiRequest<{ items: RentalListing[]; total: number }>(`listings?${params.toString()}`)
      .then((result) => {
        if (!current) return
        setRemoteRooms((items) => remotePage === 1 ? result.items : [...items, ...result.items])
        setRemoteTotal(result.total)
      })
      .catch(() => undefined)
      .finally(() => { if (current) setLoadingRooms(false) })
    return () => { current = false }
  }, [appliedFilters, sort, isNearSearch, latitude, longitude, remotePage])

  useEffect(() => {
    const params = new URLSearchParams(queryString)
    const nextFilters = readFilters(params)
    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setSort(params.get("sort") ?? "newest")
    setRemotePage(1)
  }, [queryString])

  const matchingRooms = useMemo(() => {
    const location = normalize(appliedFilters.location)
    const isCitySearch = /ho chi minh|hcm|sai gon/.test(location)
    const minPrice = Number(appliedFilters.minPrice)
    const maxPrice = Number(appliedFilters.maxPrice)
    return (isApiMode ? remoteRooms : listings)
      .filter((room) => room.status === "active")
      .filter((room) => !isNearSearch || (Number.isFinite(room.latitude) && Number.isFinite(room.longitude)))
      .filter((room) => {
        const matchesLocation =
          !location ||
          isCitySearch ||
          normalize(room.location).includes(location)
        const matchesMinPrice =
          !appliedFilters.minPrice || room.priceValue >= minPrice
        const matchesMaxPrice =
          !appliedFilters.maxPrice || room.priceValue <= maxPrice
        const matchesAmenities = appliedFilters.amenities.every((amenity) =>
          room.amenities.includes(amenity),
        )
        const matchesType =
          appliedFilters.roomType === "all" ||
          room.type === appliedFilters.roomType
        return (
          matchesLocation &&
          matchesMinPrice &&
          matchesMaxPrice &&
          matchesArea(room.areaValue, appliedFilters.areaRange) &&
          matchesAmenities &&
          matchesType
        )
      })
      .sort((a, b) => {
        if (isNearSearch) {
          return (
            distanceInKm(latitude, longitude, a.latitude, a.longitude) -
            distanceInKm(latitude, longitude, b.latitude, b.longitude)
          )
        }
        if (sort === "price-low") return a.priceValue - b.priceValue
        if (sort === "price-high") return b.priceValue - a.priceValue
        return 0
      })
  }, [appliedFilters, isNearSearch, latitude, longitude, sort, listings, remoteRooms])
  const locatedRooms = matchingRooms.filter((room): room is RentalListing & { latitude: number; longitude: number } => typeof room.latitude === "number" && typeof room.longitude === "number")

  const updateDraft = (next: Partial<SearchFilters>) => {
    setDraftFilters((current) => ({ ...current, ...next }))
  }

  const applyFilters = () => {
    setRemotePage(1)
    setRemotePage(1)
    const params = new URLSearchParams()
    if (draftFilters.location) params.set("location", draftFilters.location)
    if (draftFilters.minPrice) params.set("minPrice", draftFilters.minPrice)
    if (draftFilters.maxPrice) params.set("maxPrice", draftFilters.maxPrice)
    if (draftFilters.areaRange !== "all")
      params.set("areaRange", draftFilters.areaRange)
    if (draftFilters.roomType !== "all")
      params.set("type", draftFilters.roomType)
    if (draftFilters.amenities.length)
      params.set("amenities", draftFilters.amenities.join(","))
    if (isNearSearch) {
      params.set("lat", String(latitude))
      params.set("lng", String(longitude))
    }
    if (sort !== "newest") params.set("sort", sort)
    setSearchParams(params)
    setAppliedFilters(draftFilters)
    setFilterOpen(false)
  }

  const resetFilters = () => {
    setRemotePage(1)
    setRemotePage(1)
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setSort("newest")
    setSearchParams({ location: defaultFilters.location })
  }

  const locationLabel = appliedFilters.location || "toàn quốc"

  return (
    <main className="page-bg">
      <div className="container search-page">
        <div className="breadcrumbs">
          Trang chủ <span>/</span> Tìm phòng tại {locationLabel}
        </div>
        <div className="mobile-filter-row">
          <Button
            variant="outline"
            icon="filter"
            onClick={() => setFilterOpen((open) => !open)}
          >
            Bộ lọc
          </Button>
          <span>{isApiMode ? remoteTotal : matchingRooms.length} kết quả</span>
        </div>
        <div className="search-layout">
          <div className={filterOpen ? "filter-mobile open" : "filter-mobile"}>
            <Filters
              filters={draftFilters}
              onChange={updateDraft}
              onApply={applyFilters}
              onReset={resetFilters}
              roomTypes={roomTypes}
              amenities={amenities}
            />
          </div>
          <div className="desktop-filter">
            <Filters
              filters={draftFilters}
              onChange={updateDraft}
              onApply={applyFilters}
              onReset={resetFilters}
              roomTypes={roomTypes}
              amenities={amenities}
            />
          </div>
          <section className="results">
            <div className="results-head">
              <div>
                <h1>Phòng trọ tại {locationLabel}</h1>
                <p>
                  {isNearSearch ? "Trong bán kính 20 km · " : "Tìm thấy "}
                  <strong>{isApiMode ? remoteTotal : matchingRooms.length}</strong> phòng phù hợp
                </p>
              </div>
              <div className="view-actions">
                <select
                  aria-label="Sắp xếp kết quả"
                  value={sort}
                  onChange={(event) => { setRemotePage(1); setSort(event.target.value) }}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price-low">Giá thấp nhất</option>
                  <option value="price-high">Giá cao nhất</option>
                </select>
                <button
                  className={!map ? "active" : ""}
                  onClick={() => setMap(false)}
                  aria-label="Xem dạng danh sách"
                  aria-pressed={!map}
                >
                  ▦
                </button>
                <button
                  className={map ? "active" : ""}
                  onClick={() => setMap(true)}
                  aria-label="Xem vị trí phòng trên bản đồ"
                  aria-pressed={map}
                >
                  <Icon name="map" />
                </button>
              </div>
            </div>
            {matchingRooms.length ? (
              map ? (
                <Suspense fallback={<div className="map-view map-loading">Đang tải bản đồ…</div>}><RoomMap listings={locatedRooms} center={isNearSearch ? [latitude, longitude] : [10.7769, 106.7009]} zoom={isNearSearch ? 13 : 11} note="Vị trí do người đăng cung cấp; hãy xác nhận địa chỉ trước khi đi xem." /></Suspense>
              ) : (
                <div className={matchingRooms.length === 4 ? "result-grid result-grid--balanced" : "result-grid"}>
                  {matchingRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onClick={() => navigate(`/phong/${room.id}`)}
                    />
                  ))}
                </div>
              )
            ) : loadingRooms ? <p className="result-count-note">Đang tải tin phòng…</p> : (
              <section className="empty-state search-empty-state">
                <span className="placeholder-icon">
                  <Icon name="search" size={26} />
                </span>
                <h2>Chưa tìm thấy phòng phù hợp</h2>
                <p>Thử mở rộng khu vực hoặc điều chỉnh giá và tiện ích.</p>
                <Button variant="outline" onClick={resetFilters}>
                  Xóa bộ lọc
                </Button>
              </section>
            )}
            {loadingRooms && matchingRooms.length > 0 && <p className="result-count-note">Đang tải thêm tin phòng…</p>}
            {isApiMode && remoteRooms.length < remoteTotal && !loadingRooms && <div className="search-load-more"><Button variant="outline" onClick={() => setRemotePage((page) => page + 1)}>Xem thêm phòng</Button></div>}
          </section>
        </div>
      </div>
    </main>
  )
}
