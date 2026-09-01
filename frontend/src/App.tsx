/**
 * 고객·판매자·관리자 화면의 전체 React Router 경로와 실제 역할 보호 가드를 조립합니다.
 * 비밀번호 복구 완료 경로와 기존 오렌지 라이트·다크 테마 공급자를 최상단에서 연결합니다.
 */
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAdmin } from "@/components/auth/AdminGuard";
import { RequireSeller } from "@/components/auth/SellerGuard";
import { RequireAuth } from "@/components/auth/route-guards";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { LocationProvider } from "@/shared/location/LocationContext";
import HomePage from "@/pages/Home/HomePage";
const AuthPage = lazy(() => import("@/pages/Auth/AuthPage"));
const ResetPasswordPage = lazy(() => import("@/pages/Auth/ResetPasswordPage"));
const ProductsPage = lazy(() => import("@/pages/Products/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/pages/Products/ProductDetailPage"));
const MapPage = lazy(() => import("@/pages/Map/MapPage"));
const NeighborhoodPage = lazy(() => import("@/pages/Neighborhood/NeighborhoodPage"));
const ImpactPage = lazy(() => import("@/pages/Impact/ImpactPage"));
const CartPage = lazy(() => import("@/pages/Cart/CartPage"));
const TossCheckoutPage = lazy(() => import("@/pages/Payments/TossCheckoutPage"));
const TossSuccessPage = lazy(() => import("@/pages/Payments/TossSuccessPage"));
const TossFailPage = lazy(() => import("@/pages/Payments/TossFailPage"));
const CommunityPage = lazy(() => import("@/pages/Community/CommunityPage"));
const CommunityPostPage = lazy(() => import("@/pages/Community/CommunityPostPage"));
const InquiryPage = lazy(() => import("@/pages/Inquiry/InquiryPage"));
const NoticePage = lazy(() => import("@/pages/Notice/NoticePage"));
const FaqPage = lazy(() => import("@/pages/Faq/FaqPage"));
const AboutPage = lazy(() => import("@/pages/Legal/AboutPage"));
const TermsPage = lazy(() => import("@/pages/Legal/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/Legal/PrivacyPage"));
const EmailPolicyPage = lazy(() => import("@/pages/Legal/EmailPolicyPage"));
const MyPage = lazy(() => import("@/pages/MyPage/MyPage"));
const SellerPage = lazy(() => import("@/pages/Seller/SellerPage"));
const AdminPage = lazy(() => import("@/pages/Admin/AdminPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFound/NotFoundPage"));
const RouteFallback = () => <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}><span className="spin-icon" style={{ width: 28, height: 28, border: "2.5px solid #e2e8f0", borderTopColor: "#ff5722", borderRadius: "50%" }} /></div>;
const queryClient = new QueryClient();
const myPagePaths = ["/mypage", "/mypage/impact", "/mypage/deals", "/mypage/orders", "/mypage/wishlist", "/mypage/restock-requests", "/mypage/reviews", "/mypage/inquiries", "/mypage/seller-application", "/mypage/security"];
const sellerPaths = ["/seller", "/seller/products", "/seller/products/new", "/seller/orders", "/seller/analytics", "/seller/inquiries", "/seller/restock-requests"];
const adminPaths = ["/admin", "/admin/orders", "/admin/users", "/admin/sellers", "/admin/products", "/admin/inquiries", "/admin/reviews", "/admin/community", "/admin/pickups", "/admin/audit-logs", "/admin/research", "/admin/restock-requests"];
const App = () => <QueryClientProvider client={queryClient}><TooltipProvider><ThemeProvider><LocationProvider><Sonner position="top-center" richColors /><BrowserRouter><Suspense fallback={<RouteFallback />}><Routes>
  <Route path="/" element={<HomePage />} /><Route path="/products" element={<ProductsPage />} /><Route path="/products/:id" element={<ProductDetailPage />} /><Route path="/map" element={<MapPage />} /><Route path="/neighborhood" element={<NeighborhoodPage />} /><Route path="/impact" element={<ImpactPage />} /><Route path="/community" element={<CommunityPage />} /><Route path="/community/:id" element={<CommunityPostPage />} /><Route path="/inquiry" element={<InquiryPage />} /><Route path="/notices" element={<NoticePage />} /><Route path="/faq" element={<FaqPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="/email-policy" element={<EmailPolicyPage />} /><Route path="/auth" element={<AuthPage />} /><Route path="/auth/reset-password" element={<ResetPasswordPage />} />
  <Route path="/payments/toss/checkout" element={<RequireAuth><TossCheckoutPage /></RequireAuth>} /><Route path="/payments/toss/success" element={<RequireAuth><TossSuccessPage /></RequireAuth>} /><Route path="/payments/toss/fail" element={<RequireAuth><TossFailPage /></RequireAuth>} /><Route path="/cart" element={<CartPage />} />
  {myPagePaths.map((path) => <Route key={path} path={path} element={<RequireAuth><MyPage /></RequireAuth>} />)}
  {sellerPaths.map((path) => <Route key={path} path={path} element={<RequireSeller><SellerPage /></RequireSeller>} />)}
  {adminPaths.map((path) => <Route key={path} path={path} element={<RequireAdmin><AdminPage /></RequireAdmin>} />)}
  <Route path="*" element={<NotFoundPage />} />
</Routes></Suspense></BrowserRouter></LocationProvider></ThemeProvider></TooltipProvider></QueryClientProvider>;
export default App;
