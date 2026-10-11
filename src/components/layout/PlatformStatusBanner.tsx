import { useEffect, useState } from "react"
import { usePlatform } from "@/contexts/PlatformContext"
import { isApiMode } from "@/services/apiClient"

export default function PlatformStatusBanner() {
  const { connectionError, connectionState } = usePlatform()
  const [requestError, setRequestError] = useState("")

  useEffect(() => {
    const showError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail
      setRequestError(message || "Thao tác chưa hoàn tất.")
      window.setTimeout(() => setRequestError(""), 7000)
    }
    window.addEventListener("trooi:api-error", showError)
    return () => window.removeEventListener("trooi:api-error", showError)
  }, [])

  if (!isApiMode) return null
  const error = connectionState === "error" ? connectionError : requestError
  if (!error && connectionState !== "loading") return null
  return <div className={error ? "platform-status-banner is-error" : "platform-status-banner"} role={error ? "alert" : "status"}>
    {error ? `Chưa đồng bộ với máy chủ: ${error}` : "Đang tải dữ liệu Trọ Ơi…"}
  </div>
}
