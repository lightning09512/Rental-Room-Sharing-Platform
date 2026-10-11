import { Outlet, useLocation } from "react-router"
import MainHeader from "@/components/layout/MainHeader"
import SiteFooter from "@/components/layout/SiteFooter"
import BottomNavigation from "@/components/layout/BottomNavigation"
import useScrollToTop from "@/hooks/useScrollToTop"

export default function MainLayout() {
  const { pathname } = useLocation()
  useScrollToTop()
  const isFocusedWorkspace = pathname === "/tin-nhan" || pathname === "/chu-tro/dang-tin" || /^\/chu-tro\/tin\/[^/]+\/chinh-sua$/.test(pathname)
  const isPublicContent = pathname === "/" || pathname === "/tim-phong" || pathname.startsWith("/phong/") || pathname === "/dien-dan" || pathname.startsWith("/bai-viet/")

  return (
    <>
      <MainHeader />
      <Outlet />
      {!isFocusedWorkspace && <SiteFooter variant={isPublicContent ? "full" : "compact"} />}
      <BottomNavigation />
    </>
  )
}
