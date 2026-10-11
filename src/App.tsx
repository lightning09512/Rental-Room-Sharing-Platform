import { RouterProvider } from "react-router"
import { AuthProvider } from "@/contexts/AuthContext"
import { FavoritesProvider } from "@/contexts/FavoritesContext"
import { PlatformProvider } from "@/contexts/PlatformContext"
import { router } from "@/routes"
import PlatformStatusBanner from "@/components/layout/PlatformStatusBanner"

export default function App() {
  return (
    <AuthProvider>
      <PlatformProvider>
        <PlatformStatusBanner />
        <FavoritesProvider>
          <RouterProvider router={router} />
        </FavoritesProvider>
      </PlatformProvider>
    </AuthProvider>
  )
}
