/**
 * 고객·판매자·관리자 화면의 전체 React Router 경로와 실제 역할 보호 가드를 조립합니다.
 * 비밀번호 복구 완료 경로와 기존 오렌지 라이트·다크 테마 공급자를 최상단에서 연결합니다.
 */
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAdmin } from "@/components/auth/AdminGuard";
import { RequireSeller } from "@/components/auth/SellerGuard";
import { RequireAuth } from "@/components/auth/route-guards";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import HomePage from "@/pages/Home/HomePage";
import AuthPage from "@/pages/Auth/AuthPage";
import ResetPasswordPage from "@/pages/Auth/ResetPasswordPage";
import ProductsPage from "@/pages/Products/ProductsPage";
import ProductDetailPage from "@/pages/Products/ProductDetailPage";
import MapPage from "@/pages/Map/MapPage";
import CommunityPage from "@/pages/Community/CommunityPage";
import InquiryPage from "@/pages/Inquiry/InquiryPage";
import MyPage from "@/pages/MyPage/MyPage";
import SellerPage from "@/pages/Seller/SellerPage";
import AdminPage from "@/pages/Admin/AdminPage";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";
const queryClient = new QueryClient();
const myPagePaths = ["/mypage", "/mypage/deals", "/mypage/orders", "/mypage/reviews", "/mypage/inquiries", "/mypage/seller-application", "/mypage/security"];
const sellerPaths = ["/seller", "/seller/products", "/seller/products/new", "/seller/orders", "/seller/analytics", "/seller/inquiries"];
const adminPaths = ["/admin", "/admin/orders", "/admin/users", "/admin/sellers", "/admin/products", "/admin/inquiries", "/admin/reviews", "/admin/community", "/admin/pickups", "/admin/audit-logs", "/admin/research"];
const App = () => <QueryClientProvider client={queryClient}><TooltipProvider><ThemeProvider><Sonner position="top-center" richColors /><BrowserRouter><Routes>
  <Route path="/" element={<HomePage />} /><Route path="/products" element={<ProductsPage />} /><Route path="/products/:id" element={<ProductDetailPage />} /><Route path="/map" element={<MapPage />} /><Route path="/community" element={<CommunityPage />} /><Route path="/inquiry" element={<InquiryPage />} /><Route path="/auth" element={<AuthPage />} /><Route path="/auth/reset-password" element={<ResetPasswordPage />} />
  {myPagePaths.map((path) => <Route key={path} path={path} element={<RequireAuth><MyPage /></RequireAuth>} />)}
  {sellerPaths.map((path) => <Route key={path} path={path} element={<RequireSeller><SellerPage /></RequireSeller>} />)}
  {adminPaths.map((path) => <Route key={path} path={path} element={<RequireAdmin><AdminPage /></RequireAdmin>} />)}
  <Route path="*" element={<NotFoundPage />} />
</Routes></BrowserRouter></ThemeProvider></TooltipProvider></QueryClientProvider>;
export default App;
