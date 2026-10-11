import { createBrowserRouter, Navigate } from "react-router"
import MainLayout from "@/components/layout/MainLayout"
import AdminLayout from "@/components/layout/AdminLayout"
import RoleGuard from "@/components/common/RoleGuard"
import HomePage from "@/pages/public/HomePage"
import SearchPage from "@/pages/public/SearchPage"
import RoomDetailPage from "@/pages/public/RoomDetailPage"
import FavoritesPage from "@/pages/shared/FavoritesPage"
import MyReportsPage from "@/pages/shared/MyReportsPage"
import NotificationsPage from "@/pages/shared/NotificationsPage"
import MyListingsPage from "@/pages/landlord/MyListingsPage"
import ListingEditorPage from "@/pages/landlord/ListingEditorPage"
import LandlordStatsPage from "@/pages/landlord/LandlordStatsPage"
import ForumPage from "@/pages/community/ForumPage"
import MessagesPage from "@/pages/renter/MessagesPage"
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage"
import AdminResourcePage from "@/pages/admin/AdminResourcePage"
import AdminStatsPage from "@/pages/admin/AdminStatsPage"
import LoginPage from "@/pages/auth/LoginPage"
import RegisterPage from "@/pages/auth/RegisterPage"
import PasswordRecoveryPage from "@/pages/auth/PasswordRecoveryPage"
import AccountPage from "@/pages/shared/AccountPage"
import PlaceholderPage from "@/pages/shared/PlaceholderPage"
import ErrorPage from "@/pages/errors/ErrorPage"

const renter = ["renter"] as const
const members = ["renter", "landlord"] as const
const landlord = ["landlord"] as const
const admin = ["admin"] as const
const guard = (
  roles: readonly ("renter" | "landlord" | "admin")[],
  element: React.ReactNode,
) => <RoleGuard roles={[...roles]}>{element}</RoleGuard>
const placeholder = (title: string, description: string, eyebrow?: string) => (
  <PlaceholderPage title={title} description={description} eyebrow={eyebrow} />
)

export const router = createBrowserRouter([
  {
    Component: MainLayout,
    children: [
      { path: "/", Component: HomePage },
      { path: "/tim-phong", Component: SearchPage },
      { path: "/phong/:id", Component: RoomDetailPage },
      { path: "/chuyen-nhuong/*", element: <Navigate to="/tim-phong" replace /> },
      { path: "/dien-dan", Component: ForumPage },
      {
        path: "/bai-viet/:id",
        Component: ForumPage,
      },
      { path: "/dang-nhap", Component: LoginPage },
      { path: "/dang-ky", Component: RegisterPage },
      { path: "/quen-mat-khau", element: <PasswordRecoveryPage /> },
      { path: "/dat-lai-mat-khau", element: <PasswordRecoveryPage reset /> },
      { path: "/tai-khoan/ho-so", element: guard(members, <AccountPage />) },
      {
        path: "/tai-khoan/doi-mat-khau",
        element: guard(members, <AccountPage passwordMode />),
      },
      {
        path: "/yeu-thich",
        element: guard(members, <FavoritesPage />),
      },
      { path: "/tin-nhan", element: guard(members, <MessagesPage />) },
      {
        path: "/bao-cao-cua-toi",
        element: guard(members, <MyReportsPage />),
      },
      {
        path: "/thong-bao",
        element: guard(members, <NotificationsPage />),
      },
      {
        path: "/chu-tro/thong-ke",
        element: guard(landlord, <LandlordStatsPage />),
      },
      {
        path: "/chu-tro/dang-tin",
        element: guard(landlord, <ListingEditorPage />),
      },
      {
        path: "/chu-tro/tin/:id/chinh-sua",
        element: guard(landlord, <ListingEditorPage />),
      },
      {
        path: "/chu-tro/quan-ly-tin",
        element: guard(landlord, <MyListingsPage />),
      },
      { path: "/403", element: <ErrorPage code={403} /> },
      { path: "/404", element: <ErrorPage code={404} /> },
    ],
  },
  { path: "/admin/dang-nhap", element: <LoginPage admin /> },
  { path: "/admin/tin-chuyen-nhuong/*", element: <Navigate to="/tim-phong" replace /> },
  {
    path: "/admin",
    element: guard(admin, <AdminLayout />),
    children: [
      { index: true, Component: AdminDashboardPage },
      {
        path: "ho-so",
        element: guard(admin, <AccountPage />),
      },
      { path: "doi-mat-khau", element: guard(admin, <AccountPage passwordMode />) },
      { path: "thong-bao", element: guard(admin, <NotificationsPage />) },
      {
        path: "nguoi-dung",
        element: guard(admin, <AdminResourcePage />),
      },
      {
        path: "tin-cho-thue",
        element: guard(admin, <AdminResourcePage />),
      },
      {
        path: "dien-dan",
        element: guard(admin, <AdminResourcePage />),
      },
      {
        path: "danh-muc",
        element: guard(admin, <AdminResourcePage />),
      },
      {
        path: "bao-cao",
        element: guard(admin, <AdminResourcePage />),
      },
      { path: "thong-ke", element: guard(admin, <AdminStatsPage />) },
    ],
  },
  { path: "*", element: <ErrorPage code={404} /> },
])
