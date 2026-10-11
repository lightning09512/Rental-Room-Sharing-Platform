import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import useAuth from "@/hooks/useAuth"
import { apiRequest, isApiMode } from "@/services/apiClient"

const STORAGE_KEY = "phongtroplus_favorites_by_user"
const LEGACY_STORAGE_KEY = "phongtroplus_favorite_rooms"
const GUEST_KEY = "guest"
type FavoritesByUser = Record<string, string[]>

interface FavoritesContextValue {
  favoriteIds: string[]
  isFavorite: (roomId: string) => boolean
  toggleFavorite: (roomId: string) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

function getStoredFavorites(userId: string | undefined): FavoritesByUser {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [],
          ]),
        )
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    const parsedLegacy: unknown = legacy ? JSON.parse(legacy) : []
    const ids = Array.isArray(parsedLegacy)
      ? parsedLegacy.filter((item): item is string => typeof item === "string")
      : []
    return ids.length ? { [userId ?? GUEST_KEY]: ids } : {}
  } catch {
    return {}
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userKey = user?.id ?? GUEST_KEY
  const [favoritesByUser, setFavoritesByUser] = useState<FavoritesByUser>(() => isApiMode ? {} : getStoredFavorites(user?.id))
  const favoriteIds = favoritesByUser[userKey] ?? []

  useEffect(() => {
    if (isApiMode) return
    if (!user?.id || favoritesByUser[user.id] || !favoritesByUser[GUEST_KEY]) return
    setFavoritesByUser((current) => ({ ...current, [user.id]: current[GUEST_KEY] }))
  }, [user?.id, favoritesByUser])

  useEffect(() => {
    if (isApiMode) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesByUser))
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  }, [favoritesByUser])

  const isFavorite = useCallback(
    (roomId: string) => favoriteIds.includes(roomId),
    [favoriteIds],
  )
  useEffect(() => {
    if (!isApiMode || !user?.id) return
    let alive = true
    apiRequest<{ items: { id: string }[] }>("favorites")
      .then(({ items }) => { if (alive) setFavoritesByUser((current) => ({ ...current, [user.id]: items.map((item) => item.id) })) })
      .catch(() => undefined)
    return () => { alive = false }
  }, [user?.id])

  const toggleFavorite = useCallback(async (roomId: string) => {
    if (isApiMode) {
      if (!user?.id) return
      const saved = !favoriteIds.includes(roomId)
      try { await apiRequest(`favorites/${encodeURIComponent(roomId)}`, { method: "PUT", body: JSON.stringify({ saved }) }) }
      catch { return }
      setFavoritesByUser((current) => ({ ...current, [userKey]: saved ? [...(current[userKey] ?? []), roomId] : (current[userKey] ?? []).filter((id) => id !== roomId) }))
      return
    }
    setFavoritesByUser((current) => {
      const currentIds = current[userKey] ?? []
      return {
        ...current,
        [userKey]: currentIds.includes(roomId)
          ? currentIds.filter((id) => id !== roomId)
          : [...currentIds, roomId],
      }
    })
  }, [favoriteIds, user?.id, userKey])

  const value = useMemo(
    () => ({ favoriteIds, isFavorite, toggleFavorite }),
    [favoriteIds, isFavorite, toggleFavorite],
  )
  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider")
  }
  return context
}
